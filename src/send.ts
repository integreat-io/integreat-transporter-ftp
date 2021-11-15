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

const prepareFileData = ({
  name,
  type,
  size,
  modifyTime,
}: FtpClient.FileInfo) => ({
  name,
  type: mapType(type),
  size,
  updatedAt: modifyTime,
})

async function fetchDirectory(path: string, client: FtpClient) {
  const data = await client.list(path)
  return { status: 'ok', data: data.map(prepareFileData) }
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

  const { path } = action.meta.options
  if (!path) {
    return {
      status: 'badrequest',
      error: 'FTP requires a path',
    }
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const fileType = await client.exists(path)
  switch (fileType) {
    case false:
      return { status: 'notfound', error: `Could not find '${path}'` }
    case 'd':
      return await fetchDirectory(path, client)
    case '-':
      return await fetchFile(path, client)
    default:
      return {
        status: 'badresponse',
        error: `FTP returned unknown file type '${fileType}'`,
      }
  }
}
