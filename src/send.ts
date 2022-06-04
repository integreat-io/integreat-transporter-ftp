import FtpClient = require('ssh2-sftp-client')
import { Action, Response, Connection } from './types'
import debug = require('debug')

const logInfo = debug('integreat:transporter:ftp')

function mapType(type: '-' | 'd' | 'l') {
  switch (type) {
    case '-':
      return 'file'
    case 'd':
      return 'dir'
    case 'l':
      return 'link'
    default:
      return 'unknown'
  }
}

const removeTrailingSlash = (path: string) =>
  path.endsWith('/') ? path.slice(0, path.length - 2) : path

const prepareFileData =
  (path: string) =>
  ({ name, type, size, modifyTime }: FtpClient.FileInfo) => ({
    id: `${removeTrailingSlash(path)}/${name}`,
    name,
    type: mapType(type),
    size,
    updatedAt: modifyTime,
  })

async function fetchDirectory(path: string, client: FtpClient) {
  const data = await client.list(path)
  return { status: 'ok', data: data.map(prepareFileData(path)) }
}

async function fetchFile(path: string, client: FtpClient) {
  const buffer = await client.get(path)
  const data = buffer.toString()
  return { status: 'ok', data }
}

export default async function send(
  action: Action,
  connection: Connection | null
): Promise<Response> {
  if (action.type !== 'GET') {
    const error = `FTP only supports GET for now. Attempted ${action.type}`
    logInfo(error)
    return { status: 'noaction', error }
  }

  const client = connection?.client
  if (connection?.status !== 'ok' || !client) {
    const error = 'FTP transporter requires a connection with an active client'
    logInfo(error)
    return { status: 'badrequest', error }
  }

  if (!action.meta?.options) {
    const error = 'FTP transporter requires a prepared option object'
    logInfo(error)
    return { status: 'badrequest', error }
  }

  const { uri } = action.meta.options
  if (!uri) {
    const error = 'FTP transporter requires a uri'
    logInfo(error)
    return { status: 'badrequest', error }
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const fileType = await client.exists(uri)
  switch (fileType) {
    case false:
      const error1 = `Could not find '${uri}'`
      logInfo(error1)
      return { status: 'notfound', error: error1 }
    case 'd':
      logInfo(`Fetch FTP directory ${uri}`)
      const dir = await fetchDirectory(uri, client)
      logInfo(`Fetched FTP directory ${uri}: ${JSON.stringify(dir)}`)
      return dir
    case '-':
      logInfo(`Fetch FTP file ${uri}`)
      const file = await fetchFile(uri, client)
      logInfo(`Fetched FTP file ${uri}: ${JSON.stringify(file)}`)
      return file
    default:
      const error2 = `FTP returned unknown file type '${fileType}'`
      logInfo(error2)
      return { status: 'badresponse', error: error2 }
  }
}
