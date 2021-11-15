import FtpClient = require('ssh2-sftp-client')
import { EndpointOptions, Connection } from './types'

const extractAuth = (auth: Record<string, unknown> | null) =>
  auth
    ? {
        username: auth.key as string | undefined,
        password: auth.secret as string | undefined,
      }
    : {}

const prepareOptions = (
  { host, port }: EndpointOptions,
  auth: Record<string, unknown> | null
) => ({
  ...extractAuth(auth),
  host,
  port: typeof port === 'string' ? Number.parseInt(port, 10) : port,
})

export default (Client = FtpClient) =>
  async function connect(
    options: EndpointOptions,
    auth: Record<string, unknown> | null,
    connection: Connection | null = null
  ): Promise<Connection> {
    if (connection?.status === 'ok') {
      return connection
    }

    const client = new Client()
    const clientOptions = prepareOptions(options, auth)
    if (!clientOptions.host || Number.isNaN(clientOptions.port)) {
      return {
        status: 'badrequest',
        error: 'FTP needs a valid host and port to connect',
      }
    }

    try {
      await client.connect(clientOptions)
      return { status: 'ok', client }
    } catch (error) {
      return { status: 'error', error: `Connection failed. ${error}` }
    }
  }
