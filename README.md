# FTP transport for Integreat

Transporter that lets
[Integreat](https://github.com/integreat-io/integreat) send and receive data
over ftp/sftp.

**Note:** Only receiving is implemented at this time.

## Getting started

### Prerequisits

Requires node v12.9 and Integreat v0.8.

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

const resources = Integreat.mergeResources(integreat.resources(), {
  transporters: { ftp },
})
const great = Integreat.create(defs, resources)

// ... and then dispatch actions as usual
```

Example source configuration:

```javascript
{
  id: 'files',
  transporter: 'ftp',
  endpoints: [
    { options: { uri: 'sftp://api.com:22/folder/latest.csv' } }
  ]
}
```

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
