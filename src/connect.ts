import FtpClient from 'ssh2-sftp-client'
import { EndpointOptions, Connection } from './types.js'

const removeKeyAndSecret = ({
  key,
  secret,
  ...auth
}: Record<string, unknown>) => auth

const extractAuth = (auth: Record<string, unknown> | null) =>
  auth
    ? {
        ...removeKeyAndSecret(auth),
        username: auth.key as string | undefined,
        password: auth.secret as string | undefined,
      }
    : {}

const prepareOptions = (
  { host, baseUri, port }: EndpointOptions,
  auth: Record<string, unknown> | null
) => ({
  ...extractAuth(auth),
  host: host || baseUri,
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

    const clientOptions = prepareOptions(options, auth)
    if (!clientOptions.host || Number.isNaN(clientOptions.port)) {
      return {
        status: 'badrequest',
        error: 'FTP needs a valid host and port to connect',
      }
    }

    const connectFn = async () => {
      const client = new Client()
      try {
        await client.connect(clientOptions as FtpClient.ConnectOptions) // Type hack to fix some outdated typing in FtpClient
        return client
      } catch (error) {
        throw new Error(`Connection failed. ${error}`)
      }
    }

    return { status: 'ok', connect: connectFn }
  }
