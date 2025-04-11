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

  // Ruta: POST /files/{filename}
  if (method === 'POST' && path.startsWith('/files/')) {
    const filename = path.slice('/files/'.length);
    // Sanitiza el nombre del archivo para evitar posibles problemas de directorios maliciosos
    const sanitizedFilename = pathModule.basename(filename);
    const filePath = pathModule.join(baseDirectory, sanitizedFilename);

    let bodyChunks = [];
    req.on('data', (chunk) => {
      console.log('Recibiendo datos...', chunk);
      bodyChunks.push(chunk);
    });

    req.on('end', () => {
      const body = Buffer.concat(bodyChunks);
      console.log('Archivo completo recibido', body.length);

      // Guarda el archivo recibido en el directorio base
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
