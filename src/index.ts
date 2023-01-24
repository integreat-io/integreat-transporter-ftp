import send from './send.js'
import prepareOptions from './prepareOptions.js'
import connect from './connect.js'
import disconnect from './disconnect.js'
import { Transporter } from './types.js'

/**
 * HTTP Transporter for Integreat
 */
const ftpTransporter: Transporter = {
  authentication: 'asObject',

  prepareOptions,

  connect: connect(),

  send,

  disconnect,
}

export default ftpTransporter
