import FtpClient = require('ssh2-sftp-client')
import { Action, Response, Connection } from './types'

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
    return { status: 'noaction', error: 'FTP only supports GET for now' }
  }

  const client = connection?.client
  if (connection?.status !== 'ok' || !client) {
    return {
      status: 'badrequest',
      error: 'FTP requires a connection with an active client',
    }
  }

  if (!action.meta?.options) {
    return {
      status: 'badrequest',
      error: 'FTP requires a prepared option object',
    }
  }

  const { uri } = action.meta.options
  if (!uri) {
    return {
      status: 'badrequest',
      error: 'FTP requires a path',
    }
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const fileType = await client.exists(uri)
  switch (fileType) {
    case false:
      return { status: 'notfound', error: `Could not find '${uri}'` }
    case 'd':
      return await fetchDirectory(uri, client)
    case '-':
      return await fetchFile(uri, client)
    default:
      return {
        status: 'badresponse',
        error: `FTP returned unknown file type '${fileType}'`,
      }
  }
}
