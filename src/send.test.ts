import test from 'ava'
import sinon = require('sinon')
import FtpClient = require('ssh2-sftp-client')

import send from './send'

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
  const existsStub = sinon.stub().resolves('-')
  const getStub = sinon
    .stub()
    .resolves(Buffer.from('{"id":"ent1","title":"Entry 1"}'))
  const client = { exists: existsStub, get: getStub } as unknown as FtpClient
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        path: '/folder/entry1.json',
      },
    },
  }
  const connection = { status: 'ok', client }
  const expectedData = '{"id":"ent1","title":"Entry 1"}'

  const ret = await send(action, connection)

  t.is(ret.status, 'ok', ret.error)
  t.is(existsStub.callCount, 1)
  t.is(existsStub.args[0][0], '/folder/entry1.json')
  t.is(getStub.callCount, 1)
  t.is(getStub.args[0][0], '/folder/entry1.json')
  t.deepEqual(ret.data, expectedData)
})

test('should fetch directory from ftp server', async (t) => {
  const existsStub = sinon.stub().resolves('d')
  const listStub = sinon.stub().resolves(dirData)
  const client = { exists: existsStub, list: listStub } as unknown as FtpClient
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        path: '/folder',
      },
    },
  }
  const connection = { status: 'ok', client }
  const expectedData = [
    {
      name: 'entry2.json',
      type: 'file',
      size: 303741975,
      updatedAt: 1636921620000,
    },
    {
      name: 'archive',
      type: 'dir',
      size: 237,
      updatedAt: 1636921620000,
    },
    {
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

test('should return notfound when file does not exist', async (t) => {
  const existsStub = sinon.stub().resolves(false)
  const client = { exists: existsStub } as unknown as FtpClient
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        path: '/folder/entry0.json',
      },
    },
  }
  const connection = { status: 'ok', client }

  const ret = await send(action, connection)

  t.is(ret.status, 'notfound', ret.error)
  t.is(typeof ret.error, 'string')
  t.is(existsStub.callCount, 1)
  t.is(existsStub.args[0][0], '/folder/entry0.json')
})

test('should return badresponse when file is unknown type', async (t) => {
  const existsStub = sinon.stub().resolves('u') // File type u doesn't exist
  const client = { exists: existsStub } as unknown as FtpClient
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        path: '/folder/entry2.json',
      },
    },
  }
  const connection = { status: 'ok', client }

  const ret = await send(action, connection)

  t.is(ret.status, 'badresponse', ret.error)
  t.is(typeof ret.error, 'string')
  t.is(existsStub.callCount, 1)
  t.is(existsStub.args[0][0], '/folder/entry2.json')
})

test('should return badrequest when no options', async (t) => {
  const client = {} as unknown as FtpClient
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {},
  }
  const connection = { status: 'ok', client }

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return badrequest when no path', async (t) => {
  const client = {} as unknown as FtpClient
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        // No path,
      },
    },
  }
  const connection = { status: 'ok', client }

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return badrequest when connection has error', async (t) => {
  const client = {} as unknown as FtpClient
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        path: '/folder/entry1.json',
      },
    },
  }
  const connection = { status: 'badrequest', error: 'No host or path', client }

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
        path: '/folder/entry1.json',
      },
    },
  }
  const connection = null

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return badrequest when no client', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: {
      options: {
        host: 'server.test',
        port: '22',
        path: '/folder/entry1.json',
      },
    },
  }
  const connection = { status: 'ok', client: undefined }

  const ret = await send(action, connection)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(typeof ret.error, 'string')
})

test.todo('should return badresponse when file is binary')
test.todo('should handle link type')
test.todo('should use auth')
