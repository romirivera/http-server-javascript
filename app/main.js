const http = require('http');
const fs = require('fs');
const zlib = require('zlib');

const directoryFlagIndex = process.argv.indexOf('--directory');
const filesDirectory =
  directoryFlagIndex !== -1 ? process.argv[directoryFlagIndex + 1] : null;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // Accept-Encoding header
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Echo endpoint
  if (method === 'GET' && path.startsWith('/echo/')) {
    const echoValue = path.split('/echo/')[1];
    const body = Buffer.from(echoValue, 'utf-8');

    res.writeHead(200, {
      'Content-Type': 'text/plain',
      ...(acceptEncoding.includes('gzip') ? { 'Content-Encoding': 'gzip' } : {}),
    });

    if (acceptEncoding.includes('gzip')) {
      zlib.gzip(body, (err, compressed) => {
        if (err) {
          res.statusCode = 500;
          return res.end();
        }
        res.setHeader('Content-Length', compressed.length);
        res.end(compressed);
      });
    } else {
      res.setHeader('Content-Length', body.length);
      res.end(body);
    }

    // Default route
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(4221, () => {
  console.log('Server listening on port 4221');
});
