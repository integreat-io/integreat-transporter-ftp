import ssh2, {
  FileEntry,
  AuthContext,
  AcceptSftpConnection,
  RejectConnection,
  ServerConnectionListener,
} from 'ssh2'
import debugFn from 'debug'
import type { Dispatch } from 'integreat'
import type { Connection, Response } from './types.js'
import { isObject, isNotEmpty } from './utils/is.js'

export interface HandlerOptions {
  dispatch: Dispatch
  host: string
  port: number
}

const debug = debugFn('integreat:transporter:ftp')

const { STATUS_CODE } = ssh2.utils.sftp

const createGetDirectory = (path: string, host: string, port: number) => ({
  type: 'GET',
  payload: { path, host, port },
  meta: {},
})

function splitPathAndId(path: string) {
  const index = path.lastIndexOf('/')
  return { path: path.slice(0, index), id: path.slice(index + 1) }
}

const createGetFile = (path: string, host: string, port: number) => ({
  type: 'GET',
  payload: { ...splitPathAndId(path), host, port },
  meta: {},
})

const prepareFtpOptions = (privateKey: string) => ({
  hostKeys: [privateKey],
})

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const formatDateTime = (time: Date) =>
  `${months[time.getMonth()]} ${String(time.getDate()).padStart(
    2,
    ' '
  )} ${String(time.getHours()).padStart(2, '0')}:${String(
    time.getMinutes()
  ).padStart(2, '0')}`

const generateLongname = (filename: string, size: number, time: Date) =>
  ['-r--r--r--  1 anon  anon ', size, formatDateTime(time), filename].join(' ')

function contentToFileInfo(item: unknown): FileEntry | undefined {
  if (isObject(item)) {
    const filename = item.id
    const size = typeof item.content === 'string' ? item.content.length : 0
    const time = item.updatedAt

    if (typeof filename === 'string' && time instanceof Date) {
      return {
        filename,
        longname: generateLongname(filename, size, time),
        attrs: {
          mode: 0o00444,
          uid: 1000,
          gid: 1000,
          size,
          atime: time.getTime() / 1000, // In seconds
          mtime: time.getTime() / 1000, // In seconds
        },
      }
    }
  }
  return undefined
}

async function authenticate(ctx: AuthContext) {
  const { method, username, password } = ctx
  debugFn(`User ${username} attempting to authenticate with method= ${method}`)

  if (ctx.method === 'password') {
    // TODO: Validate username and password
    ctx.accept()
  } else {
    ctx.reject(['password'])
  }
}

const startSftpSession = ({ dispatch, host, port }: HandlerOptions) =>
  function startSftpSession(
    acceptSftp: AcceptSftpConnection,
    _rejectSftp: RejectConnection
  ) {
    debugFn('Client SFTP session')
    const sftp = acceptSftp()

    const status = new Map<string, boolean>()

    sftp
      .on('OPEN', (reqID, path, _flags, _attrs) => {
        debugFn(`SFTP OPEN ${path} (${reqID})`)
        const handle = Buffer.from(path)
        sftp.handle(reqID, handle)
      })
      .on('READ', async (reqID, handle, offset, length) => {
        const path = handle.toString()
        debugFn(`SFTP READ ${path} from ${offset} to ${length} (${reqID})`)

        if (offset === 0) {
          const response = await dispatch(createGetFile(path, host, port))
          if (response.status === 'ok' && typeof response.data === 'string') {
            const file = Buffer.from(response.data)
            sftp.data(reqID, file)
          } else if (response.status === 'notfound') {
            sftp.status(reqID, STATUS_CODE.NO_SUCH_FILE)
          } else {
            sftp.status(reqID, STATUS_CODE.FAILURE)
          }
        } else {
          sftp.status(reqID, STATUS_CODE.EOF)
        }
      })
      .on('WRITE', () => {
        console.log('*** WRITE')
      })
      .on('FSTAT', () => {
        console.log('*** FSTAT')
      })
      .on('FSETSTAT', () => {
        console.log('*** FSETSTAT')
      })
      .on('CLOSE', (reqID) => {
        debugFn(`SFTP CLOSE (${reqID})`)
        sftp.status(reqID, STATUS_CODE.OK)
      })
      .on('OPENDIR', (reqID, path) => {
        debugFn(`SFTP OPENDIR ${path} (${reqID})`)
        const handle = Buffer.from(path)
        sftp.handle(reqID, handle)
      })
      .on('READDIR', async (reqID, handle) => {
        const path = handle.toString()
        debugFn(`SFTP READDIR ${path} (${reqID})`)
        const key = `READDIR|${path}`
        const doneReading = status.get(key)
        status.set(key, !doneReading)

        if (!doneReading) {
          // Dispatch to get directory content
          const response = await dispatch(createGetDirectory(path, host, port))
          if (response.status === 'ok' && Array.isArray(response.data)) {
            sftp.name(
              reqID,
              response.data.map(contentToFileInfo).filter(isNotEmpty)
            )
          } else if (response.status === 'notfound') {
            sftp.status(reqID, STATUS_CODE.NO_SUCH_FILE)
          } else {
            sftp.status(reqID, STATUS_CODE.FAILURE)
          }
        } else {
          // We're done reading and return EOF
          sftp.status(reqID, STATUS_CODE.EOF)
        }
      })
      .on('LSTAT', () => {
        console.log('*** LSTAT')
      })
      .on('STAT', () => {
        console.log('*** STAT')
      })
      .on('REMOVE', () => {
        console.log('*** REMOVE')
      })
      .on('RMDIR', () => {
        console.log('*** RMDIR')
      })
      .on('REALPATH', () => {
        console.log('*** REALPATH')
      })
      .on('READLINK', () => {
        console.log('*** READLINK')
      })
      .on('SETSTAT', () => {
        console.log('*** SETSTAT')
      })
      .on('MKDIR', () => {
        console.log('*** MKDIR')
      })
      .on('RENAME', () => {
        console.log('*** RENAME')
      })
      .on('SYMLINK', () => {
        console.log('*** SYMLINK')
      })
  }

const setupSftpServer = (options: HandlerOptions): ServerConnectionListener =>
  function setupSftpServer(client, info) {
    debugFn(`SFTP connection requested by ${info.ip}`)

    client
      .on('authentication', authenticate)
      .on('ready', function startListening() {
        console.log('*** Client authenticated!')
        client.on('session', (acceptSession, _rejectSession) => {
          const session = acceptSession()
          if (!session) {
            client.end()
            return
          }

          debugFn('SFTP session started!')
          session.on('sftp', startSftpSession(options))
        })
      })
      .on('close', () => {
        debugFn('SFTP connection closed')
      })
      .on('rekey', () => {
        debugFn('SFTP rekey')
      })
      .on('end', async () => {
        // Do some cleanup here
        debugFn('SFTP client disconnected')
      })
      .on('error', (err) => {
        console.error(`*** SFTP client error occurred: ${err}`)
      })
  }

export default async function listen(
  dispatch: Dispatch,
  connection: Connection | null
): Promise<Response> {
  if (!connection) {
    return {
      status: 'badrequest',
      error: 'FTP transporter cannot listen without a connection',
    }
  }

  debug('Start listening to ftp ...')
  const { host, port, privateKey } = connection.incoming || {}

  if (
    typeof host !== 'string' ||
    typeof port !== 'number' ||
    typeof privateKey !== 'string'
  ) {
    return {
      status: 'badrequest',
      error:
        'FTP transporter cannot listen without a host, a port, and a private key',
    }
  }

  const options = prepareFtpOptions(privateKey)

  return new Promise((resolve, _reject) => {
    new ssh2.Server(options, setupSftpServer({ dispatch, host, port })).listen(
      port,
      host,
      function () {
        debugFn('SFTP Listening on port ' + port)
        resolve({ status: 'ok' })
      }
    )
  })
}
