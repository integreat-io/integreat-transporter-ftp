import FtpClient from 'ssh2-sftp-client'
import type { Connection as BaseConnection } from 'integreat'

export interface IncomingAccess {
  GET?: boolean
  SET?: boolean
  DELETE?: boolean
}

export interface IncomingOptions {
  host: string
  port: number
  path?: string
  privateKey?: string
  access?: IncomingAccess
}

export interface EndpointOptions extends Record<string, unknown> {
  uri?: string
  host?: string
  baseUri?: string // Alias of host
  port?: number | string
  path?: string
  incoming?: IncomingOptions
}

export interface Connection extends BaseConnection {
  connect?: () => Promise<FtpClient>
  incoming?: IncomingOptions
}

export interface FileItem {
  id: string | null
  filename: string
  content: string
  createdAt: Date
  updatedAt: Date
}
