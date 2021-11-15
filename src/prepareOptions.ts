import url = require('url')
import { EndpointOptions } from './types'

function extractFromUri(uri: string) {
  try {
    const { hostname: host, port, pathname: path } = new url.URL(uri)
    return { host, port, path: path || '/' }
  } catch {
    return {}
  }
}

export default function (options: EndpointOptions): EndpointOptions {
  const { uri, host, port, path } = options
  const nextOptions = { uri, host, port, path }

  if (typeof uri === 'string') {
    return {
      ...nextOptions,
      ...extractFromUri(uri),
    }
  }

  return nextOptions
}
