import test from 'ava'

import prepareOptions from './prepareOptions.js'

// Setup

const serviceId = 'ftp'

// Tests

test('should return options with host, port, and path', (t) => {
  const options = {
    host: 'server.test',
    port: '22',
    path: '/folder/entry1.json',
  }
  const expected = {
    host: 'server.test',
    port: '22',
    path: '/folder/entry1.json',
  }

  const ret = prepareOptions(options, serviceId)

  t.deepEqual(ret, expected)
})

test('should extract host, port, and path from uri', (t) => {
  const options = {
    uri: 'sftp://server.test:22/folder/entry1.json',
  }
  const expected = {
    host: 'server.test',
    port: '22',
    path: '/folder/entry1.json',
  }

  const ret = prepareOptions(options, serviceId)

  t.deepEqual(ret, expected)
})

test('should extract root path as slash', (t) => {
  const options = {
    uri: 'sftp://server.test:22',
  }
  const expected = {
    host: 'server.test',
    port: '22',
    path: '/',
  }

  const ret = prepareOptions(options, serviceId)

  t.deepEqual(ret, expected)
})

test('should handle invalid uri', (t) => {
  const options = {
    uri: 'no uri',
  }
  const expected = {
    host: undefined,
    port: undefined,
    path: undefined,
  }

  const ret = prepareOptions(options, serviceId)

  t.deepEqual(ret, expected)
})

test('should include incoming options', (t) => {
  const options = {
    host: 'server.test',
    port: '22',
    path: '/folder/entry1.json',
    incoming: {
      host: 'localhost',
      port: 22,
      privateKey: 'k3y',
      unknown: 'bad!',
    }, // Not the right key format at all, but works for the test
  }
  const expected = {
    host: 'server.test',
    port: '22',
    path: '/folder/entry1.json',
    incoming: { host: 'localhost', port: 22, privateKey: 'k3y' },
  }

  const ret = prepareOptions(options, serviceId)

  t.deepEqual(ret, expected)
})
