import test from 'ava'
import FtpClient = require('ssh2-sftp-client')

import disconnect from './disconnect'

// Tests

test('should do nothing when connection has an error', async (t) => {
  const connection = {
    status: 'ok',
    connect: async () => ({} as unknown as FtpClient),
  }

  await t.notThrowsAsync(disconnect(connection))
})
