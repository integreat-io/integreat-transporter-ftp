import FtpClient = require('ssh2-sftp-client')
import { Action, Response, Connection } from './types.js'
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

  if (connection?.status !== 'ok' || !connection.connect) {
    const error = 'FTP transporter requires a connection'
    logInfo(error)
    return { status: 'badrequest', error }
  }

  const client = await connection.connect()
  if (!client) {
    const error = 'Could not connect to FTP server'
    logInfo(error)
    return { status: 'badrequest', error }
  }

  if (!action.meta?.options) {
    const error = 'FTP transporter requires an options object'
    logInfo(error)
    return { status: 'badrequest', error }
  }

  const { uri } = action.meta.options
  if (!uri) {
    const error = 'FTP transporter requires a uri'
    logInfo(error)
    return { status: 'badrequest', error }
  }

  const fileType = await client.exists(uri)
  let response
  switch (fileType) {
    case false:
      const error1 = `Could not find '${uri}'`
      logInfo(error1)
      response = { status: 'notfound', error: error1 }
      break
    case 'd':
      logInfo(`Fetch FTP directory ${uri}`)
      response = await fetchDirectory(uri, client)
      logInfo(`Fetched FTP directory ${uri}: ${JSON.stringify(response.data)}`)
      break
    case '-':
      logInfo(`Fetch FTP file ${uri}`)
      response = await fetchFile(uri, client)
      logInfo(`Fetched FTP file ${uri}: ${JSON.stringify(response.data)}`)
      break
    default:
      const error2 = `FTP returned unknown file type '${fileType}'`
      logInfo(error2)
      response = { status: 'badresponse', error: error2 }
  }

  await client.end()

  return response
}
