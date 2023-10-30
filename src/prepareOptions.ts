import url from 'url'
import { ServiceOptions, IncomingOptions } from './types.js'
import { isObject } from './utils/is.js'

function extractFromUri(uri: string) {
  try {
    const { hostname: host, port, pathname: path } = new url.URL(uri)
    return { host, port, path: path || '/' }
  } catch {
    return {}
  }
}

const prepareIncoming = ({ host, port, privateKey }: IncomingOptions) => ({
  host,
  port,
  privateKey,
})

export default function (options: ServiceOptions, _serviceId: string): ServiceOptions {
  const { uri, host, port, path, incoming } = options
  const nextOptions = {
    host,
    port,
    path,
    ...(isObject(incoming) ? { incoming: prepareIncoming(incoming) } : {}),
  }

  if (typeof uri === 'string') {
    return {
      ...nextOptions,
      ...extractFromUri(uri),
    }
  } else {
    return nextOptions
  }
}
