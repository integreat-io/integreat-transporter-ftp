import test from 'ava'
import sinon from 'sinon'
import FtpClient from 'ssh2-sftp-client'

import send from './send.js'

// Setup

const dirData = [
  {
    type: '-',
    name: 'entry2.json',
    size: 303741975,
    modifyTime: 1636921620000,
    accessTime: 1636865942000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1069,
    group: 1073,
  },
  {
    type: 'd',
    name: 'archive',
    size: 237,
    modifyTime: 1636921620000,
    accessTime: 1636921363000,
    rights: { user: 'rwx', group: 'rx', other: 'rx' },
    owner: 1069,
    group: 1073,
  },
  {
    type: '-',
    name: 'entry1.json',
    size: 303741975,
    modifyTime: 1636890180000,
    accessTime: 1636865939000,
    rights: { user: 'rw', group: 'r', other: 'r' },
    owner: 1069,
    group: 1073,
  },
]

// Tests

test('should fetch data from ftp server', async (t) => {
  const endStub = sinon.stub().resolves(true)
  const existsStub = sinon.stub().resolves('-')
  const getStub = sinon
    .stub()
    .resolves(Buffer.from('{"id":"ent1","title":"Entry 1"}'))
  const connect = async () =>
    ({ exists: existsStub, get: getStub, end: endStub } as unknown as FtpClient)
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder/entry1.json',
      },
    },
  }
  const connection = { status: 'ok', connect }
  const expectedData = '{"id":"ent1","title":"Entry 1"}'

  const ret = await send(action, connection)

  t.is(ret.status, 'ok', ret.error)
  t.is(existsStub.callCount, 1)
  t.is(existsStub.args[0][0], '/folder/entry1.json')
  t.is(getStub.callCount, 1)
  t.is(getStub.args[0][0], '/folder/entry1.json')
  t.deepEqual(ret.data, expectedData)
  t.is(endStub.callCount, 1)
})

test('should fetch directory from ftp server', async (t) => {
  const existsStub = sinon.stub().resolves('d')
  const listStub = sinon.stub().resolves(dirData)
  const connect = async () =>
    ({
      exists: existsStub,
      list: listStub,
      end: async () => undefined,
    } as unknown as FtpClient)
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder',
      },
    },
  }
  const connection = { status: 'ok', connect }
  const expectedData = [
    {
      id: '/folder/entry2.json',
      name: 'entry2.json',
      type: 'file',
      size: 303741975,
      updatedAt: 1636921620000,
    },
    {
      id: '/folder/archive',
      name: 'archive',
      type: 'dir',
      size: 237,
      updatedAt: 1636921620000,
    },
    {
      id: '/folder/entry1.json',
      name: 'entry1.json',
      type: 'file',
      size: 303741975,
      updatedAt: 1636890180000,
    },
  ]

  const ret = await send(action, connection)

  t.is(ret.status, 'ok', ret.error)
  t.is(existsStub.callCount, 1)
  t.is(existsStub.args[0][0], '/folder')
  t.is(listStub.callCount, 1)
  t.is(listStub.args[0][0], '/folder')
  t.deepEqual(ret.data, expectedData)
})

test('should zap double slashes from ids', async (t) => {
  const connect = async () =>
    ({
      exists: async () => 'd',
      list: async () => dirData,
      end: async () => undefined,
    } as unknown as FtpClient)
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/',
      },
    },
  }
  const connection = { status: 'ok', connect }
  const expectedData = [
    {
      id: '/entry2.json',
      name: 'entry2.json',
      type: 'file',
      size: 303741975,
      updatedAt: 1636921620000,
    },
    {
      id: '/archive',
      name: 'archive',
      type: 'dir',
      size: 237,
      updatedAt: 1636921620000,
    },
    {
      id: '/entry1.json',
      name: 'entry1.json',
      type: 'file',
      size: 303741975,
      updatedAt: 1636890180000,
    },
  ]

  const ret = await send(action, connection)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expectedData)
})

test('should return notfound when file does not exist', async (t) => {
  const existsStub = sinon.stub().resolves(false)
  const connect = async () =>
    ({ exists: existsStub, end: async () => undefined } as unknown as FtpClient)
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder/entry0.json',
      },
    },
  }
  const connection = { status: 'ok', connect }

  const ret = await send(action, connection)

  t.is(ret.status, 'notfound', ret.error)
  t.is(typeof ret.error, 'string')
  t.is(existsStub.callCount, 1)
  t.is(existsStub.args[0][0], '/folder/entry0.json')
})

test('should return badresponse when file is of unknown type', async (t) => {
  const existsStub = sinon.stub().resolves('u') // File type u doesn't exist
  const connect = async () =>
    ({ exists: existsStub, end: async () => undefined } as unknown as FtpClient)
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder/entry2.json',
      },
    },
  }
  const connection = { status: 'ok', connect }

  const ret = await send(action, connection)

  t.is(ret.status, 'badresponse', ret.error)
  t.is(typeof ret.error, 'string')
  t.is(existsStub.callCount, 1)
  t.is(existsStub.args[0][0], '/folder/entry2.json')
})

test('should return badrequest when no options', async (t) => {
  const connect = async () => ({} as unknown as FtpClient)
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {},
  }
  const connection = { status: 'ok', connect }

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return badrequest when no uri', async (t) => {
  const connect = async () => ({} as unknown as FtpClient)
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        // No uri,
      },
    },
  }
  const connection = { status: 'ok', connect }

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return badrequest when connection has error', async (t) => {
  const connect = async () => ({} as unknown as FtpClient)
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder/entry1.json',
      },
    },
  }
  const connection = { status: 'badrequest', error: 'No host or uri', connect }

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return badrequest when no connection', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder/entry1.json',
      },
    },
  }
  const connection = null

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return badrequest when no connect method', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder/entry1.json',
      },
    },
  }
  const connection = { status: 'ok', connect: undefined }

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return error when connect method returns no client', async (t) => {
  const connect = async () => undefined as unknown as FtpClient // Type hack
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder/entry1.json',
      },
    },
  }
  const connection = { status: 'ok', connect }

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return noaction for SET action', async (t) => {
  const connect = async () => ({} as unknown as FtpClient)
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent1' } },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        uri: '/folder/entry1.json',
      },
    },
  }
  const connection = { status: 'ok', connect }

  const ret = await send(action, connection)

  t.is(ret.status, 'noaction', ret.error)
})

test.todo('should return badresponse when file is binary')
test.todo('should handle link type')
