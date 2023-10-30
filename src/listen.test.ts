import test from 'ava'
import sinon from 'sinon'
import FtpClient from 'ssh2-sftp-client'

import listen from './listen.js'

interface FtpClientWithLstat extends FtpClient {
  lstat: (remotePath: string) => Promise<FtpClient.FileStats>
}

// Setup

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIICXAIBAAKBgQDG0/bqUuti9+nG+bO6pbVHFImnXNzvVjyt60A0qzwvIvNv8UOt
a062cXifPIcPUuXblcbzifzrYKMiJNTm37Xumj0JNSVVMrWcAc2Az4yEVf6P4aaI
BiZLR2pJtBovraIbjIPZpBoNVRSiyW+DZdZZNBqS5bvl7ult6MzAt9lNQwIDAQAB
AoGBAJZ7HHiys0ZfPccDe7y6591ZNOm/RdO6oAg9cYWrR8yhFj/WCRO6kINSlClo
hQvbAO7ViBMQj6SRqkYQPDZUgHs0z5KVYlgxZsVyfE0j/+lAxP7K0kR00wrDqvnV
dPENTAQR2arFo4zbTGUaWr/MD/0/wrhkicBQUIK/gLYpG4sxAkEA7E5aLaxRkJcL
Mw+gXpo0Ox1E+HdFmlr3tX5fJ0nEFrZ5Tzwhoo8volL+1ER8+2Pwc9TQ63OSEks9
f9+1NKwT+QJBANdmAh/gC0H2JjEO9fzTIgRq0zQJd8Lu4kyH3oMONRYPjcAKSC6j
pG427SUEp/D2yW6DqQL9G/Xsk64YA3o1QhsCQEXU1bNfk+79o9KgEI1EVqENgj9G
x+vYbBFXWfk7RFZN8EVpCKuIUtROYH4MCz8jBoDEaETcL1N2pqLuUhdRrskCQE+U
g5JtPxuGqsOTSHS5OKczJIbkPJgLlBY8WIxI8noNEwzxf4ujr/t8VY9IsheHxhIL
mKTfCLaKSmGWw6oiBSMCQEXv4L9LC1M14JxTZ5fboxqBQmjWCjnasvHcB4IZIDUt
rgUh2eKFVZN9ZWcvMI4xCrF/cFyWgJcUlhU/zxoFUhc=
-----END RSA PRIVATE KEY-----`

const createFtpOptions = (port: number) =>
  ({
    host: 'localhost',
    port,
    username: 'johnf',
    password: 's3cr3t',
    // debug: console.log,
  }) as FtpClient.ConnectOptions

const files = [
  {
    id: 'file1.csv',
    content: 'id;title\n1;Line 1\n2;Line 2',
    createdAt: new Date('2023-03-18T00:43:14.183Z'),
    updatedAt: new Date('2023-03-19T13:04:53.992Z'),
  },
  {
    id: 'file2.csv',
    content: '',
    createdAt: new Date('2023-03-18T07:14:44.009Z'),
    updatedAt: new Date('2023-03-19T17:14:45.123Z'),
  },
]

const authenticate = async () => ({
  status: 'ok',
  access: { ident: { id: 'userFromIntegreat' } },
})

// Tests -- directory

test('should respond to incoming ftp request for directory content', async (t) => {
  const port = 3020
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries'
  const expectedAction = {
    type: 'GET',
    payload: { path: '/entries', host: 'localhost', port },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected = [
    {
      type: '-',
      name: 'file1.csv',
      size: 26,
      modifyTime: 1679231094000,
      accessTime: 1679231094000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  26 Mar 19 14:04 file1.csv',
    },
    {
      type: '-',
      name: 'file2.csv',
      size: 0,
      modifyTime: 1679246085000,
      accessTime: 1679246085000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  0 Mar 19 18:14 file2.csv',
    },
  ]

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.list(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(response, expected)
})

test('should respond to incoming ftp request for directory content with path ending in slash', async (t) => {
  const port = 3021
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/'
  const expectedAction = {
    type: 'GET',
    payload: { path: '/', host: 'localhost', port },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected = [
    {
      type: '-',
      name: 'file1.csv',
      size: 26,
      modifyTime: 1679231094000,
      accessTime: 1679231094000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  26 Mar 19 14:04 file1.csv',
    },
    {
      type: '-',
      name: 'file2.csv',
      size: 0,
      modifyTime: 1679246085000,
      accessTime: 1679246085000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  0 Mar 19 18:14 file2.csv',
    },
  ]

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.list(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(response, expected)
})

test('should respond to incoming ftp request for directory with dot path', async (t) => {
  const port = 3022
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '.'
  const expectedAction = {
    type: 'GET',
    payload: { path: '/', host: 'localhost', port },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected = [
    {
      type: '-',
      name: 'file1.csv',
      size: 26,
      modifyTime: 1679231094000,
      accessTime: 1679231094000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  26 Mar 19 14:04 file1.csv',
    },
    {
      type: '-',
      name: 'file2.csv',
      size: 0,
      modifyTime: 1679246085000,
      accessTime: 1679246085000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  0 Mar 19 18:14 file2.csv',
    },
  ]

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.list(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(response, expected)
})

test('should respond to incoming ftp request for directory with slash and dot path', async (t) => {
  const port = 3023
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/.'
  const expectedAction = {
    type: 'GET',
    payload: { path: '/', host: 'localhost', port },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected = [
    {
      type: '-',
      name: 'file1.csv',
      size: 26,
      modifyTime: 1679231094000,
      accessTime: 1679231094000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  26 Mar 19 14:04 file1.csv',
    },
    {
      type: '-',
      name: 'file2.csv',
      size: 0,
      modifyTime: 1679246085000,
      accessTime: 1679246085000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  0 Mar 19 18:14 file2.csv',
    },
  ]

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.list(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(response, expected)
})

test('should filter away data not in the expected format', async (t) => {
  const port = 3024
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [...files, {}] })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries'
  const expectedAction = {
    type: 'GET',
    payload: { path: '/entries', host: 'localhost', port },
    meta: { ident: { id: 'userFromIntegreat' } },
  }

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.list(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.is(response.length, 2) // We've filtered away the empty object
})

test('should handle unknown directory', async (t) => {
  const port = 3025
  t.timeout(5000)
  const dispatch = sinon
    .stub()
    .resolves({ status: 'notfound', error: 'No such directory or whatever' })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const err = await t.throwsAsync(client.list(path))

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.is((err as Error).message, 'list: No such file or directory /entries')
})

test('should handle errors from dispatch when fetching directory content', async (t) => {
  const port = 3026
  t.timeout(5000)
  const dispatch = sinon
    .stub()
    .resolves({ status: 'badrequest', error: 'No matching endpoint' })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const err = await t.throwsAsync(client.list(path))

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.is((err as Error).message, 'list: Failure /entries')
})

test('should respond to incoming REALPATH request for directory', async (t) => {
  const port = 3027
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries'
  const expected = '/entries'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.realPath(path)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(response, expected)
})

test('should respond to incoming REALPATH request for current directory', async (t) => {
  const port = 3028
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '.'
  const expected = '/'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.realPath(path)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(response, expected)
})

// Tests -- file read

test('should respond to incoming ftp request for file content', async (t) => {
  const port = 3030
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files[0] })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries/file1.csv'
  const expectedAction = {
    type: 'GET',
    payload: {
      path: '/entries',
      id: 'file1.csv',
      host: 'localhost',
      port,
    },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected = 'id;title\n1;Line 1\n2;Line 2'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.get(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.is(response.toString(), expected)
})

test('should respond to incoming ftp request for file content on root', async (t) => {
  const port = 3031
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files[0] })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/file1.csv'
  const expectedAction = {
    type: 'GET',
    payload: {
      path: '/',
      id: 'file1.csv',
      host: 'localhost',
      port,
    },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected = 'id;title\n1;Line 1\n2;Line 2'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.get(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.is(response.toString(), expected)
})

test('should handle unknown file', async (t) => {
  const port = 3032
  t.timeout(5000)
  const dispatch = sinon
    .stub()
    .resolves({ status: 'notfound', error: 'The file is missing' })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries/file1.csv'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const err = await t.throwsAsync(client.get(path))

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.is(
    (err as Error).message,
    'get: No such file or directory /entries/file1.csv',
  )
})

test('should handle unknown error when fetching file', async (t) => {
  const port = 3033
  t.timeout(5000)
  const dispatch = sinon
    .stub()
    .resolves({ status: 'error', error: 'Just not right' })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries/file1.csv'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const err = await t.throwsAsync(client.get(path))

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.is((err as Error).message, 'get: Failure /entries/file1.csv')
})

test('should respond to incoming REALPATH request for file with full path', async (t) => {
  const port = 3034
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries/file.csv'
  const expected = '/entries/file.csv'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.realPath(path)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(response, expected)
})

test('should respond to incoming REALPATH request for filename only', async (t) => {
  const port = 3035
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = 'file.csv'
  const expected = '/file.csv'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.realPath(path)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(response, expected)
})

test('should respond to incoming REALPATH request for filename in current folder', async (t) => {
  const port = 3036
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = './file.csv'
  const expected = '/file.csv'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.realPath(path)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(response, expected)
})

// Tests -- stat

test('should respond to incoming STAT request for root directory', async (t) => {
  const port = 3040
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/'

  const before = Math.round(Date.now() / 1000) * 1000
  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.stat(path)
  const after = Math.round(Date.now() / 1000) * 1000

  t.is(ret.status, 'ok', ret.error)
  t.is(response.mode, 0o40444)
  t.is(response.uid, 1000)
  t.is(response.gid, 1000)
  t.is(response.size, 0)
  t.true(response.isDirectory)
  t.true(response.accessTime >= before)
  t.true(response.accessTime <= after)
  t.is(response.accessTime, response.modifyTime)
})

test('should respond to incoming STAT request for root directory with full permissions', async (t) => {
  const port = 3041
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const connection = {
    status: 'ok',
    incoming: {
      host: 'localhost',
      port,
      privateKey,
      access: { GET: true, SET: true, DELETE: true },
    },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/'

  const before = Math.round(Date.now() / 1000) * 1000
  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.stat(path)
  const after = Math.round(Date.now() / 1000) * 1000

  t.is(ret.status, 'ok', ret.error)
  t.is(response.mode, 0o40777)
  t.is(response.uid, 1000)
  t.is(response.gid, 1000)
  t.is(response.size, 0)
  t.true(response.isDirectory)
  t.true(response.accessTime >= before)
  t.true(response.accessTime <= after)
  t.is(response.accessTime, response.modifyTime)
})

test('should respond to incoming STAT request for file on root', async (t) => {
  const port = 3042
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files[0] })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/file1.csv'
  const expectedAction = {
    type: 'GET',
    payload: {
      path: '/',
      id: 'file1.csv',
      host: 'localhost',
      port,
    },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected = {
    mode: 0o100444,
    uid: 1000,
    gid: 1000,
    size: 26,
    isDirectory: false,
    isBlockDevice: false,
    isCharacterDevice: false,
    isFIFO: false,
    isFile: true,
    isSocket: false,
    isSymbolicLink: false,
    modifyTime: 1679231094000,
    accessTime: 1679231094000,
  }

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.stat(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(response, expected)
})

test('should respond to incoming LSTAT request for file on root', async (t) => {
  const port = 3043
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files[0] })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/file1.csv'
  const expectedAction = {
    type: 'GET',
    payload: {
      path: '/',
      id: 'file1.csv',
      host: 'localhost',
      port,
    },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected = {
    mode: 0o100444,
    uid: 1000,
    gid: 1000,
    size: 26,
    isDirectory: false,
    isBlockDevice: false,
    isCharacterDevice: false,
    isFIFO: false,
    isFile: true,
    isSocket: false,
    isSymbolicLink: false,
    modifyTime: 1679231094000,
    accessTime: 1679231094000,
  }

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await (client as FtpClientWithLstat).lstat(path) // TODO: Remove type hack when @types file for 'ssh2-sftp-client' is updated

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(response, expected)
})

// Tests -- file remove

test('should dispatch DELETE action on file remove', async (t) => {
  const port = 3050
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/file1.csv'
  const expectedAction = {
    type: 'DELETE',
    payload: {
      path: '/',
      id: 'file1.csv',
      host: 'localhost',
      port,
    },
    meta: { ident: { id: 'userFromIntegreat' } },
  }

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  await client.delete(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
})

test('should throw when trying to remove an unknown file', async (t) => {
  const port = 3051
  t.timeout(5000)
  const dispatch = sinon
    .stub()
    .resolves({ status: 'notfound', error: 'The file is missing' })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/file1.csv'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const err = await t.throwsAsync(client.delete(path))

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.is((err as Error).message, 'delete: No such file or directory /file1.csv')
})

test('should throw when removing file fails', async (t) => {
  const port = 3052
  t.timeout(5000)
  const dispatch = sinon
    .stub()
    .resolves({ status: 'error', error: 'Will not delete' })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/file1.csv'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const err = await t.throwsAsync(client.delete(path))

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.is((err as Error).message, 'delete: Failure /file1.csv')
})

// Tests -- several actions

test('should fetch directory content and then download file', async (t) => {
  const port = 3060
  t.timeout(5000)
  const dispatch = sinon
    .stub()
    .onCall(0)
    .resolves({ status: 'ok', data: files })
    .onCall(1)
    .resolves({ status: 'ok', data: files[0] })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path0 = '/entries'
  const path1 = '/entries/file1.csv'
  const expectedAction0 = {
    type: 'GET',
    payload: { path: '/entries', host: 'localhost', port },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expectedAction1 = {
    type: 'GET',
    payload: {
      path: '/entries',
      id: 'file1.csv',
      host: 'localhost',
      port,
    },
    meta: { ident: { id: 'userFromIntegreat' } },
  }
  const expected0 = [
    {
      type: '-',
      name: 'file1.csv',
      size: 26,
      modifyTime: 1679231094000,
      accessTime: 1679231094000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  26 Mar 19 14:04 file1.csv',
    },
    {
      type: '-',
      name: 'file2.csv',
      size: 0,
      modifyTime: 1679246085000,
      accessTime: 1679246085000,
      rights: { user: 'r', group: 'r', other: 'r' },
      owner: 1000,
      group: 1000,
      longname: '-r--r--r--  1 anon  anon  0 Mar 19 18:14 file2.csv',
    },
  ]
  const expected1 = 'id;title\n1;Line 1\n2;Line 2'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response0 = await client.list(path0)
  const response1 = await client.get(path1)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expectedAction0)
  t.deepEqual(dispatch.args[1][0], expectedAction1)
  t.deepEqual(response0, expected0)
  t.deepEqual(response1.toString(), expected1)
})

// Tests -- authentication

test('should authenticate with provided method', async (t) => {
  const port = 3070
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files[0] })
  const authenticate = sinon
    .stub()
    .resolves({ status: 'ok', access: { ident: { id: 'johnf' } } })
  const connection = {
    status: 'ok',
    incoming: { host: 'localhost', port, privateKey },
  }
  const options = createFtpOptions(port)
  const client = new FtpClient()
  client.on('error', console.error)
  const path = '/entries/file1.csv'
  const expectedAction = {
    type: 'GET',
    payload: {
      path: '/entries',
      id: 'file1.csv',
      host: 'localhost',
      port,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = 'id;title\n1;Line 1\n2;Line 2'

  const ret = await listen(dispatch, connection, authenticate)
  await t.notThrowsAsync(client.connect(options))
  const response = await client.get(path)

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.is(response.toString(), expected)
})

// Tests -- error handling

test('should return error when no connection', async (t) => {
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files })
  const connection = null

  const ret = await listen(dispatch, connection, authenticate)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(ret.error, 'FTP transporter cannot listen without a connection')
})

test('should return error when no host or port', async (t) => {
  t.timeout(5000)
  const dispatch = sinon.stub().resolves({ status: 'ok', data: files })
  const connection = { status: 'ok' }

  const ret = await listen(dispatch, connection, authenticate)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(
    ret.error,
    'FTP transporter cannot listen without a host, a port, and a private key',
  )
})
