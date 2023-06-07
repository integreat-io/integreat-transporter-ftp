import prepareOptions from './prepareOptions.js'
import connect from './connect.js'
import send from './send.js'
import listen from './listen.js'
import disconnect from './disconnect.js'
import type { Transporter } from 'integreat'

/**
 * HTTP Transporter for Integreat
 */
const ftpTransporter: Transporter = {
  authentication: 'asObject',

  prepareOptions,

  connect: connect(),

  send,

  listen,

  disconnect,
}

export default ftpTransporter
