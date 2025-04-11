const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const pathModule = require('path');

// Obtener directorio base desde los argumentos del programa
const directoryArgIndex = process.argv.indexOf('--directory');
const baseDirectory =
  directoryArgIndex !== -1 ? process.argv[directoryArgIndex + 1] : '.';

const server = http.createServer((req, res) => {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Ruta: GET /echo/{mensaje}
  if (method === 'GET' && path.startsWith('/echo/')) {
    const message = decodeURIComponent(path.slice(6)); // quita "/echo/"
    const body = Buffer.from(message, 'utf-8');

    // Analizar si cliente acepta gzip
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

    return;
  }

  // Ruta: POST /files/{filename}
  if (method === 'POST' && path.startsWith('/files/')) {
    const filename = path.slice('/files/'.length);
    const filePath = pathModule.join(baseDirectory, filename);

    let bodyChunks = [];
    req.on('data', (chunk) => {
      bodyChunks.push(chunk);
    });

    req.on('end', () => {
      const body = Buffer.concat(bodyChunks);
      fs.writeFile(filePath, body, (err) => {
        if (err) {
          res.writeHead(500);
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(201); // Created
        res.end();
      });
    });

    return;
  }

  // Cualquier otra ruta: 404
  res.writeHead(404);
  res.end();
});

server.listen(4221, () => {
  console.log('Servidor corriendo en http://localhost:4221');
});
