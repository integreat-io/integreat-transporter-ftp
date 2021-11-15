import test from 'ava'
import sinon = require('sinon')
import FtpClient = require('ssh2-sftp-client')

import disconnect from './disconnect'

// Tests

test('should call end on client', async (t) => {
  const endStub = sinon.stub().resolves(true)
  const client = { end: endStub } as unknown as FtpClient
  const connection = { status: 'ok', client }

  await disconnect(connection)

  t.is(endStub.callCount, 1)
})

test('should do nothing when connection has an error', async (t) => {
  const connection = {
    status: 'badrequest',
    error: 'No host or port or something',
    client: {} as unknown as FtpClient, // To make sure it doesn't bail out due to missing client
  }

  await t.notThrowsAsync(disconnect(connection))
})

test('should do nothing when no client', async (t) => {
  const connection = { status: 'ok', client: undefined }

  await t.notThrowsAsync(disconnect(connection))
})

test('should do nothing when no connection', async (t) => {
  await t.notThrowsAsync(disconnect(null))
})
