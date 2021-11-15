import FtpClient = require('ssh2-sftp-client')
import { EndpointOptions, Connection } from './types'

const prepareOptions = ({ host, port }: EndpointOptions) => ({
  host,
  port: typeof port === 'string' ? Number.parseInt(port, 10) : port,
})

export default (Client = FtpClient) =>
  async function connect(
    options: EndpointOptions,
    _auth: Record<string, unknown> | null,
    connection: Connection | null = null
  ): Promise<Connection> {
    if (connection?.status === 'ok') {
      return connection
    }

    const client = new Client()
    const clientOptions = prepareOptions(options)
    if (!clientOptions.host || Number.isNaN(clientOptions.port)) {
      return {
        status: 'badrequest',
        error: 'FTP needs a valid host and port to connect',
      }
    }

    await client.connect(clientOptions)
    return { status: 'ok', client }
  }
