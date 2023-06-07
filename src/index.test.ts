import test from 'ava'

import transporter from './index.js'

// Tests

test('should be a transporter', (t) => {
  t.is(typeof transporter.authentication, 'string')
  t.is(typeof transporter.prepareOptions, 'function')
  t.is(typeof transporter.connect, 'function')
  t.is(typeof transporter.send, 'function')
  t.is(typeof transporter.listen, 'function')
  t.is(typeof transporter.disconnect, 'function')
})

test('should have authentication string', (t) => {
  t.is(transporter.authentication, 'asObject')
})

test('connect should return connection object', async (t) => {
  const connection = { status: 'ok' }

  const ret = await transporter.connect({}, {}, connection, () => undefined)

  t.deepEqual(ret, connection)
})

test('should do nothing when callling disconnect', async (t) => {
  const ret = await transporter.disconnect(null)

  t.is(ret, undefined)
})
