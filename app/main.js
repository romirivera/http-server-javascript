const http = require('http');
const zlib = require('zlib');

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (method === 'GET' && path.startsWith('/echo/')) {
    const message = decodeURIComponent(path.slice(6)); // remove "/echo/"
    const body = Buffer.from(message, 'utf-8');

    // Check if client accepts gzip
    const supportsGzip = acceptEncoding
      .split(',')
      .map((e) => e.trim())
      .includes('gzip');

    res.setHeader('Content-Type', 'text/plain');

    if (supportsGzip) {
      zlib.gzip(body, (err, compressed) => {
        if (err) {
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Content-Length', compressed.length);
        res.writeHead(200);
        res.end(compressed);
      });
    } else {
      res.setHeader('Content-Length', body.length);
      res.writeHead(200);
      res.end(body);
    }
  } else {
    // 404 for other routes
    res.writeHead(404);
    res.end();
  }
});

server.listen(4221, () => {
  console.log('Servidor corriendo en http://localhost:4221');
});
