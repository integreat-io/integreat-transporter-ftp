/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import FtpClient from 'ssh2-sftp-client'
import { SFTPWrapper } from 'ssh2'

import connect from './connect.js'

// Tests -- outgoing

test('should return connection with connect function', async (t) => {
  const options = {
    host: 'server.test',
    port: 22,
    path: '/folder',
  }
  const auth = null
  const connection = null

  const ret = await connect(FtpClient)(options, auth, connection)

  t.is(ret.status, 'ok')
  t.is(typeof ret.connect, 'function')
})

test('should return client when calling connect()', async (t) => {
  let calledOptions: FtpClient.ConnectOptions | null = null
  class MockClient extends FtpClient {
    async connect(options: FtpClient.ConnectOptions) {
      calledOptions = options
      return {} as SFTPWrapper
    }
  }

  const options = {
    host: 'server.test',
    port: 22,
    path: '/folder',
  }
  const auth = null
  const connection = null
  const expectedOptions = {
    host: 'server.test',
    port: 22,
  }

  const ret = await connect(MockClient)(options, auth, connection)
  const client = await ret.connect!()

  t.is(ret.status, 'ok')
  t.true(client instanceof MockClient)
  t.deepEqual(calledOptions, expectedOptions)
})

test('should treat baseUri as an alias of host', async (t) => {
  let calledOptions: FtpClient.ConnectOptions | null = null
  class MockClient extends FtpClient {
    async connect(options: FtpClient.ConnectOptions) {
      calledOptions = options
      return {} as SFTPWrapper
    }
  }

  const options = {
    baseUri: 'server.test',
    port: 22,
    path: '/folder',
  }
  const auth = null
  const connection = null
  const expectedOptions = {
    host: 'server.test',
    port: 22,
  }

  const ret = await connect(MockClient)(options, auth, connection)
  const client = await ret.connect!()

  t.is(ret.status, 'ok')
  t.true(client instanceof MockClient)
  t.deepEqual(calledOptions, expectedOptions)
})

test('should connect with auth', async (t) => {
  let calledOptions: FtpClient.ConnectOptions | null = null
  class MockClient extends FtpClient {
    async connect(options: FtpClient.ConnectOptions) {
      calledOptions = options
      return {} as SFTPWrapper
    }
  }
  const options = {
    host: 'server.test',
    port: 22,
    path: '/folder',
  }
  const auth = { key: 'johnf', secret: 's3cr3t' }
  const connection = null
  const expectedOptions = {
    host: 'server.test',
    port: 22,
    username: 'johnf',
    password: 's3cr3t',
  }

  const ret = await connect(MockClient)(options, auth, connection)
  const client = await ret.connect!()

  t.is(ret.status, 'ok')
  t.true(client instanceof MockClient)
  t.deepEqual(calledOptions, expectedOptions)
})

test('should cast port to number', async (t) => {
  let calledOptions: FtpClient.ConnectOptions | null = null
  class MockClient extends FtpClient {
    async connect(options: FtpClient.ConnectOptions) {
      calledOptions = options
      return {} as SFTPWrapper
    }
  }

  const options = {
    host: 'server.test',
    port: '22',
    path: '/folder',
  }
  const auth = null
  const connection = null
  const expectedOptions = {
    host: 'server.test',
    port: 22,
  }

  const ret = await connect(MockClient)(options, auth, connection)
  const client = await ret.connect!()

  t.is(ret.status, 'ok')
  t.true(client instanceof MockClient)
  t.deepEqual(calledOptions, expectedOptions)
})

test('should return existing connection when given', async (t) => {
  let calledOptions: FtpClient.ConnectOptions | null = null
  class MockClient extends FtpClient {
    async connect(options: FtpClient.ConnectOptions) {
      calledOptions = options
      return {} as SFTPWrapper
    }
  }

  const options = {
    host: 'server.test',
    port: '22',
    path: '/folder',
  }
  const auth = null
  const connection = { status: 'ok', client: new MockClient() }

  const ret = await connect(MockClient)(options, auth, connection)

  t.is(ret, connection)
  t.is(calledOptions, null)
})

test('should connect and return new connection when given connection has an error', async (t) => {
  let calledOptions: FtpClient.ConnectOptions | null = null
  class MockClient extends FtpClient {
    async connect(options: FtpClient.ConnectOptions) {
      calledOptions = options
      return {} as SFTPWrapper
    }
  }

  const options = {
    host: 'server.test',
    port: 22,
    path: '/folder',
  }
  const auth = null
  const connection = { status: 'error', client: new MockClient() }
  const expectedOptions = {
    host: 'server.test',
    port: 22,
  }

  const ret = await connect(MockClient)(options, auth, connection)
  const client = await ret.connect!()

  t.is(ret.status, 'ok')
  t.true(client instanceof MockClient)
  t.deepEqual(calledOptions, expectedOptions)
})

test('should throw when client.connect() throws', async (t) => {
  class MockClient extends FtpClient {
    async connect(_options: FtpClient.ConnectOptions) {
      throw new Error('No more, please!')
    }
  }

  const options = {
    host: 'server.test',
    port: 22,
    path: '/folder',
  }
  const auth = null
  const connection = null

  const ret = await connect(MockClient)(options, auth, connection)
  const err = await t.throwsAsync(ret.connect!())

  t.true(err instanceof Error)
  t.is(err!.message, 'Connection failed. Error: No more, please!')
})

// Tests -- incoming

test('should return connection for incoming', async (t) => {
  const options = {
    incoming: { host: 'localhost', port: 22, privateKey: 'pr1v4t3!' },
  }
  const auth = null
  const connection = null
  const expected = {
    status: 'ok',
    connect: undefined,
    incoming: { host: 'localhost', port: 22, privateKey: 'pr1v4t3!' },
  }

  const ret = await connect(FtpClient)(options, auth, connection)

  t.deepEqual(ret, expected)
})

test('should return connection with connect function and incoming', async (t) => {
  const options = {
    host: 'server.test',
    port: 22,
    path: '/folder',
    incoming: { host: 'localhost', port: 22, privateKey: 'pr1v4t3!' },
  }
  const auth = null
  const connection = null

  const ret = await connect(FtpClient)(options, auth, connection)

  t.is(ret.status, 'ok')
  t.is(typeof ret.connect, 'function')
  t.deepEqual(ret.incoming, options.incoming)
})
