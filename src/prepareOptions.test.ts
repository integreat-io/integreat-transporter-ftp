import test from 'ava'

import prepareOptions from './prepareOptions'

// Tests

test('should return options with host, port, and path', (t) => {
  const options = {
    host: 'server.test',
    port: '22',
    path: '/folder/entry1.json',
  }
  const expected = {
    uri: undefined,
    host: 'server.test',
    port: '22',
    path: '/folder/entry1.json',
  }

  const ret = prepareOptions(options)

  t.deepEqual(ret, expected)
})

test('should extract host, port, and path from uri', (t) => {
  const options = {
    uri: 'sftp://server.test:22/folder/entry1.json',
  }
  const expected = {
    uri: 'sftp://server.test:22/folder/entry1.json',
    host: 'server.test',
    port: '22',
    path: '/folder/entry1.json',
  }

  const ret = prepareOptions(options)

  t.deepEqual(ret, expected)
})

test('should extract root path as slash', (t) => {
  const options = {
    uri: 'sftp://server.test:22',
  }
  const expected = {
    uri: 'sftp://server.test:22',
    host: 'server.test',
    port: '22',
    path: '/',
  }

  const ret = prepareOptions(options)

  t.deepEqual(ret, expected)
})

test('should handle invalid uri', (t) => {
  const options = {
    uri: 'no uri',
  }
  const expected = {
    uri: 'no uri',
    host: undefined,
    port: undefined,
    path: undefined,
  }

  const ret = prepareOptions(options)

  t.deepEqual(ret, expected)
})
