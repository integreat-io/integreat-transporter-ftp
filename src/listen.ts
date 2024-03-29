import util from 'util'
import ssh2, {
  FileEntry,
  AcceptSftpConnection,
  RejectConnection,
  ServerConnectionListener,
} from 'ssh2'
import debugFn from 'debug'
import type { Dispatch, Ident, Response, AuthenticateExternal } from 'integreat'
import type { Connection, IncomingAccess } from './types.js'
import { isObject, isNotEmpty } from './utils/is.js'

export interface HandlerOptions {
  dispatch: Dispatch
  host: string
  port: number
  ident?: Ident
  access?: IncomingAccess
}

const debug = debugFn('integreat:transporter:ftp')

const { STATUS_CODE } = ssh2.utils.sftp

function splitPathAndFilename(path: string) {
  const index = path.lastIndexOf('/')
  return {
    path: index === 0 ? '/' : path.slice(0, index),
    id: path.slice(index + 1),
  }
}

const getRealPath = (path: string) =>
  path === '.' || path === '/.'
    ? '/'
    : path.startsWith('./')
    ? path.slice(1)
    : path.startsWith('/')
    ? path
    : `/${path}`

const getSecondsFromMs = (ms: number) => Math.round(ms / 1000)

// As we only support root paths, the only directory we'll recognize has the
// path '/'
const isDirectory = (path: string) => path === '/'

const createGetDirectory = (
  path: string,
  host: string,
  port: number,
  ident?: Ident,
) => ({
  type: 'GET',
  payload: { path, host, port },
  meta: { ident },
})

const createGetFile = (
  path: string,
  host: string,
  port: number,
  ident?: Ident,
) => ({
  type: 'GET',
  payload: { ...splitPathAndFilename(path), host, port },
  meta: { ident },
})

const createDeleteFile = (
  path: string,
  host: string,
  port: number,
  ident?: Ident,
) => ({
  type: 'DELETE',
  payload: { ...splitPathAndFilename(path), host, port },
  meta: { ident },
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
  `${months[time.getUTCMonth()]} ${String(time.getUTCDate()).padStart(
    2,
    ' ',
  )} ${String(time.getUTCHours()).padStart(2, '0')}:${String(
    time.getUTCMinutes(),
  ).padStart(2, '0')}`

const generateLongname = (filename: string, size: number, time: Date) =>
  ['-r--r--r--  1 anon  anon ', size, formatDateTime(time), filename].join(' ')

const numberIf = (pred: boolean | undefined, num: number) => (pred ? num : 0)

function generateMode(access: IncomingAccess, isDir = false) {
  const permission =
    numberIf(access.GET, 4) +
    numberIf(access.SET, 2) +
    numberIf(access.DELETE, 1)
  const dirPermissions = isDir ? 0o40000 : 0o100000
  return dirPermissions + 0o100 * permission + 0o10 * permission + permission
}

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
          mode: generateMode({ GET: true }), // Default mode for files
          uid: 1000,
          gid: 1000,
          size,
          atime: getSecondsFromMs(time.getTime()),
          mtime: getSecondsFromMs(time.getTime()),
        },
      }
    }
  }
  return undefined
}

async function handleStat(
  reqID: number,
  path: string,
  sftp: ssh2.SFTPWrapper,
  dispatch: Dispatch,
  host: string,
  port: number,
  ident: Ident | undefined,
  access: IncomingAccess,
) {
  if (isDirectory(path)) {
    const timestampSeconds = getSecondsFromMs(Date.now())
    sftp.attrs(reqID, {
      mode: generateMode(access, true),
      uid: 1000,
      gid: 1000,
      size: 0,
      atime: timestampSeconds,
      mtime: timestampSeconds,
    })
  } else {
    const response = await dispatch(createGetFile(path, host, port, ident))
    if (response.status === 'ok' && isObject(response.data)) {
      const size =
        typeof response.data.content === 'string'
          ? response.data.content.length
          : 0
      const timestamp = getSecondsFromMs(
        response.data.updatedAt instanceof Date
          ? response.data.updatedAt.getTime()
          : Date.now(),
      )

      sftp.attrs(reqID, {
        mode: generateMode({ GET: true }), // Default mode for files
        uid: 1000,
        gid: 1000,
        size,
        atime: timestamp,
        mtime: timestamp,
      })
    } else if (response.status === 'notfound') {
      sftp.status(reqID, STATUS_CODE.NO_SUCH_FILE)
    } else {
      sftp.status(reqID, STATUS_CODE.FAILURE)
    }
  }
}

const startSftpSession = ({
  dispatch,
  host,
  port,
  ident,
  access = { GET: true },
}: HandlerOptions) =>
  function startSftpSession(
    acceptSftp: AcceptSftpConnection,
    _rejectSftp: RejectConnection,
  ) {
    debug('Client SFTP session')
    const sftp = acceptSftp()

    const status = new Map<string, boolean>()

    sftp
      .on('ready', () => {
        debug('SFTP READY')
      })
      .on('OPEN', (reqID, path, _flags, _attrs) => {
        debug(`SFTP OPEN ${path} (${reqID})`)
        const handle = Buffer.from(getRealPath(path))
        sftp.handle(reqID, handle)
      })
      .on('READ', async (reqID, handle, offset, length) => {
        const path = handle.toString()
        debug(`SFTP READ ${path} from ${offset} to ${length} (${reqID})`)

        if (offset === 0) {
          const response = await dispatch(
            createGetFile(path, host, port, ident),
          )
          if (
            response.status === 'ok' &&
            isObject(response.data) &&
            typeof response.data.content === 'string'
          ) {
            const file = Buffer.from(response.data.content)
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
      .on('WRITE', (reqID, handle) => {
        const path = handle.toString()
        debug(`SFTP WRITE ${path} (${reqID})`)
        sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED)
      })
      .on('FSTAT', async (reqID, handle) => {
        // TODO: Write test for FSTAT! Not possible at the moment because it's not supported in the FTP client we're using in the tests
        const path = handle.toString()
        debug(`SFTP FSTAT ${path} (${reqID})`)
        await handleStat(
          reqID,
          getRealPath(path),
          sftp,
          dispatch,
          host,
          port,
          ident,
          access,
        )
      })
      .on('FSETSTAT', (reqID, handle, attrs) => {
        const path = handle.toString()
        debug(`SFTP FSETSTAT ${path} (${reqID}) ${util.inspect(attrs)}`)
        sftp.status(reqID, STATUS_CODE.OK)
      })
      .on('CLOSE', (reqID) => {
        debug(`SFTP CLOSE (${reqID})`)
        sftp.status(reqID, STATUS_CODE.OK)
      })
      .on('OPENDIR', (reqID, path) => {
        debug(`SFTP OPENDIR ${path} (${reqID})`)
        const handle = Buffer.from(getRealPath(path))
        sftp.handle(reqID, handle)
      })
      .on('READDIR', async (reqID, handle) => {
        const path = handle.toString()
        debug(`SFTP READDIR ${path} (${reqID})`)
        const key = `READDIR|${path}`
        const doneReading = status.get(key)
        status.set(key, !doneReading)

        if (!doneReading) {
          // Dispatch to get directory content
          const response = await dispatch(
            createGetDirectory(path, host, port, ident),
          )
          if (response.status === 'ok' && Array.isArray(response.data)) {
            sftp.name(
              reqID,
              response.data.map(contentToFileInfo).filter(isNotEmpty),
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
      .on('LSTAT', async (reqID, path) => {
        debug(`SFTP LSTAT ${path} (${reqID})`)
        // LSTAT expects stat on the link (not the file it's linking to), but as
        // we don't deal with links, it's the same as STAT for us
        await handleStat(
          reqID,
          getRealPath(path),
          sftp,
          dispatch,
          host,
          port,
          ident,
          access,
        )
      })
      .on('STAT', async (reqID, path) => {
        debug(`SFTP STAT ${path} (${reqID})`)
        // STAT expects stat on the file a link is linking to, but as we don't
        // deal with links, it's the same as LSTAT for us
        await handleStat(
          reqID,
          getRealPath(path),
          sftp,
          dispatch,
          host,
          port,
          ident,
          access,
        )
      })
      .on('REMOVE', async (reqID, path) => {
        debug(`SFTP REMOVE ${path} (${reqID})`)

        const response = await dispatch(
          createDeleteFile(getRealPath(path), host, port, ident),
        )
        if (response.status === 'ok') {
          sftp.status(reqID, STATUS_CODE.OK)
        } else if (response.status === 'notfound') {
          sftp.status(reqID, STATUS_CODE.NO_SUCH_FILE)
        } else {
          sftp.status(reqID, STATUS_CODE.FAILURE)
        }
      })
      .on('RMDIR', (reqID, path) => {
        debug(`SFTP RMDIR ${path} (${reqID})`)
        sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED)
      })
      .on('REALPATH', (reqID, path) => {
        debug(`SFTP REALPATH ${path} (${reqID})`)
        sftp.name(reqID, [{ filename: getRealPath(path) } as FileEntry]) // Only filename is required, but TS don't know that
      })
      .on('READLINK', (reqID, path) => {
        debug(`SFTP READLINK ${path} (${reqID})`)
        sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED)
      })
      .on('SETSTAT', (reqID, path, attrs) => {
        debug(`SFTP SETSTAT ${path} (${reqID}) ${util.inspect(attrs)}`)
        sftp.status(reqID, STATUS_CODE.OK)
      })
      .on('MKDIR', (reqID, path) => {
        debug(`SFTP MKDIR ${path} (${reqID})`)
        sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED)
      })
      .on('RENAME', (reqID, oldPath, newPath) => {
        debug(`SFTP RENAME ${oldPath} to ${newPath} (${reqID})`)
        sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED)
      })
      .on('SYMLINK', (reqID, targetPath, linkPath) => {
        debug(`SFTP SYMLINK from ${linkPath} to ${targetPath} (${reqID})`)
        sftp.status(reqID, STATUS_CODE.OP_UNSUPPORTED)
      })
      .on('end', () => {
        debug('SFTP END')
        sftp.end()
      })
      .on('error', (err: unknown) => {
        console.error(`*** SFTP error occurred: ${err}`)
      })
  }

const setupSftpServer = (
  options: HandlerOptions,
  authenticate: AuthenticateExternal,
): ServerConnectionListener =>
  function createSftpConnection(client, info) {
    debug(`SFTP connection requested by ${info.ip}`)
    let ident: Ident | undefined = undefined

    client
      .on('authentication', async function authenticateClient(ctx) {
        debug(
          `User ${ctx.username} attempting to authenticate with method= ${ctx.method}`,
        )

        if (ctx.method === 'password') {
          if (typeof authenticate !== 'function') {
            ctx.accept()
          } else {
            const response = await authenticate({
              status: 'granted',
              key: ctx.username,
              secret: ctx.password,
            })
            ident = response.access?.ident

            ctx.accept()
          }
        } else {
          ctx.reject(['password'])
        }
      })
      .on('ready', function startListening() {
        debug('SFTP Client authenticated')
        client
          .on('session', (acceptSession, _rejectSession) => {
            const session = acceptSession()
            if (!session) {
              client.end()
              return
            }

            debug('SFTP session started!')
            session.on('sftp', startSftpSession({ ...options, ident }))
          })
          .on('error', (err) => {
            console.error(`*** SFTP client error occurred: ${err}`)
          })
      })
      .on('close', () => {
        debug('SFTP connection closed')
      })
      .on('rekey', () => {
        debug('SFTP rekey')
      })
      .on('end', async () => {
        // Do some cleanup here
        debug('SFTP client disconnected')
      })
      .on('error', (err) => {
        console.error(`*** SFTP connection error occurred: ${err}`)
      })
  }

export default async function listen(
  dispatch: Dispatch,
  connection: Connection | null,
  authenticate: AuthenticateExternal,
): Promise<Response> {
  if (!connection) {
    return {
      status: 'badrequest',
      error: 'FTP transporter cannot listen without a connection',
    }
  }

  debug('Start listening to ftp ...')
  const { host, port, privateKey, access } = connection.incoming || {}

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
    new ssh2.Server(
      options,
      setupSftpServer({ dispatch, host, port, access }, authenticate),
    ).listen(port, host, function () {
      debug('SFTP Listening on port ' + port)
      resolve({ status: 'ok' })
    })
  })
}
