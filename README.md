# FTP transport for Integreat

Transporter that lets
[Integreat](https://github.com/integreat-io/integreat) send and receive data
over ftp/sftp.

**Note:** We're only supporting fetching for now. You may get from a remote FTP
server and provide a virtual SFTP server for others to fetch from.

## Getting started

### Prerequisits

Requires node v18 and Integreat v0.8.

### Installing and using

Install from npm:

```
npm install integreat-transporter-ftp
```

Example of use:

```javascript
import Integreat from 'integreat'
import ftp from 'integreat-transporter-ftp'
import defs from './config'

const resources = {
  transporters: { ftp },
}
const great = Integreat.create(defs, resources)

// ... and then dispatch actions as usual
```

Example source configuration:

```javascript
{
  id: 'files',
  transporter: 'ftp',
  endpoints: [
    { options: { host: 'ftp.com', port: 22, uri: '/folder/latest.csv' } }
  ]
}
```

_Note:_ The `connect()` method doesn't really connect, but instead returns a
connection object with its own `connect()` method. The connection is made just
in time and ended immidiately afterwards to keep SFTP connection from staying
open.

#### Running a virtual SFTP server

**Note:** The virtual server does only support a root directory with a list of
files. In the future, we plan to offer options to configure a folder structure
that maps to different schemas and action params.

Add an `incoming` object to the `options` object an rund `await great.listen()`
to run a virtual SFTP server.

The incoming options needs the following properties:

- `host`: The host to listen to, e.g. `'localhost'`
- `port`: The port to listen to, e.g. `22`
- `privateKey`: The RSA Private Key to use for the SFTP server

The transporter will handle a lot of different SFTP requests, and will on a few
occations dispatch actions to get data and meta information to return to the FTP
client.

To get directory content (the list of "files"), this action will be dispatched:

```javascript
{
  type: 'GET',
  payload: { path: '/', host: 'localhost', port: 22 }
}
```

To get content and meta information on one "file", this action will be
dispatched:

```javascript
{
  type: 'GET',
  payload: { path: '/', id: 'latest.csv', host: 'localhost', port: 22 }
}
```

Note that `path` is always set to the path, and the file name is used as an id.

Integreat will also add the payload parameter `sourceService` with the id of the
FTP service.

### Running the tests

The tests can be run with `npm test`.

## Contributing

Please read
[CONTRIBUTING](https://github.com/integreat-io/integreat-transporter-ftp/blob/master/CONTRIBUTING.md)
for details on our code of conduct, and the process for submitting pull
requests.

## License

This project is licensed under the ISC License - see the
[LICENSE](https://github.com/integreat-io/integreat-transporter-ftp/blob/master/LICENSE)
file for details.
