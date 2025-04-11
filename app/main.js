const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const pathModule = require('path');

// Obtener directorio base desde los argumentos del programa
const directoryArgIndex = process.argv.indexOf('--directory');
const baseDirectory =
  directoryArgIndex !== -1 ? process.argv[directoryArgIndex + 1] : '.';

// Verifica si el directorio existe, y si no, crea uno nuevo.
if (!fs.existsSync(baseDirectory)) {
  fs.mkdirSync(baseDirectory, { recursive: true });
}

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
      res.setHeader('Content-Encoding', 'gzip');
      res.writeHead(200);
      res.end(body);
    } else {
      res.setHeader('Content-Length', body.length);
      res.writeHead(200);
      res.end(body);
    }

    return;
  }

  // Ruta "/files/{filename}" GET
  if (method === 'GET' && requestPath.startsWith('/files/')) {
    const filename = requestPath.replace('/files/', '');
    const filepath = path.join(baseDirectory, filename);

    fs.readFile(filepath, (err, content) => {
      if (err) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      } else {
        socket.write(
          `HTTP/1.1 200 OK\r\n` +
            `Content-Type: application/octet-stream\r\n` +
            `Content-Length: ${content.length}\r\n\r\n` +
            content
        );
      }
      socket.end();
    });
    return;
  }

  // Ruta "/files/{filename}" POST
  if (method === 'POST' && requestPath.startsWith('/files/')) {
    const filename = requestPath.replace('/files/', '');
    const filepath = path.join(baseDirectory, filename);

    fs.writeFile(filepath, body.slice(0, contentLength), (err) => {
      if (err) {
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
      } else {
        socket.write('HTTP/1.1 201 Created\r\n\r\n');
      }
      socket.end();
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
