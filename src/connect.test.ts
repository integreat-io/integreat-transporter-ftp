import test from 'ava'
import FtpClient = require('ssh2-sftp-client')
import { SFTPWrapper } from 'ssh2'

import connect from './connect'

// Tests

test('should connect and return connection with client', async (t) => {
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

  t.is(ret.status, 'ok')
  t.true(ret.client instanceof MockClient)
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

  t.is(ret.status, 'ok')
  t.true(ret.client instanceof MockClient)
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

  t.is(ret.status, 'ok')
  t.true(ret.client instanceof MockClient)
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

  t.is(ret.status, 'ok')
  t.true(ret.client instanceof MockClient)
  t.deepEqual(calledOptions, expectedOptions)
})

test('should return error when client.connect() throws', async (t) => {
  class MockClient extends FtpClient {
    async connect(_options: FtpClient.ConnectOptions) {
      throw new Error('No more, please!')
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

  const ret = await connect(MockClient)(options, auth, connection)

  t.is(ret.status, 'error')
  t.is(typeof ret.error, 'string')
  t.falsy(ret.client)
})

test('should set status to badrequest when host or port are missing', async (t) => {
  let calledOptions: FtpClient.ConnectOptions | null = null
  class MockClient extends FtpClient {
    async connect(options: FtpClient.ConnectOptions) {
      calledOptions = options
      return {} as SFTPWrapper
    }
  }

  const options = {
    // Missing host and port
    path: '/folder',
  }
  const auth = null
  const connection = null

  const ret = await connect(MockClient)(options, auth, connection)

  t.is(ret.status, 'badrequest')
  t.is(ret.client, undefined)
  t.is(calledOptions, null)
})
