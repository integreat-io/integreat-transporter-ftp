import send from './send'
import prepareOptions from './prepareOptions'
import connect from './connect'
import disconnect from './disconnect'
import { Transporter } from './types'

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
