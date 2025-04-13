const net = require('net');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const directoryIndex = process.argv.indexOf('--directory');
const baseDirectory = directoryIndex !== -1 ? process.argv[directoryIndex + 1] : null;

const server = net.createServer((socket) => {
  let buffer = '';

  socket.on('data', (chunk) => {
    buffer += chunk.toString();

    // Procesar múltiples solicitudes si vienen juntas
    while (true) {
      const headersEndIndex = buffer.indexOf('\r\n\r\n');
      if (headersEndIndex === -1) break; // no hay headers completos aún

      const headerPart = buffer.slice(0, headersEndIndex);
      const [requestLine, ...headerLines] = headerPart.split('\r\n');
      const [method, requestPath] = requestLine.split(' ');
      const headers = {};

      headerLines.forEach((line) => {
        const [key, value] = line.split(': ');
        headers[key.toLowerCase()] = value;
      });

      const contentLength = parseInt(headers['content-length'] || 0);
      const totalLength = headersEndIndex + 4 + contentLength;

      if (buffer.length < totalLength) break; // aún no llega todo el body

      const body = buffer.slice(headersEndIndex + 4, totalLength);
      buffer = buffer.slice(totalLength); // eliminar solicitud procesada del buffer

      const userAgent = headers['user-agent'] || '';
      const acceptEncoding = headers['accept-encoding'] || '';
      const connectionHeader = headers['connection'] || '';

      // Ruta "/"
      if (method === 'GET' && requestPath === '/') {
        socket.write('HTTP/1.1 200 OK\r\n\r\n');
        continue;
      }

      // Ruta "/echo/{str}"
      if (method === 'GET' && requestPath.startsWith('/echo/')) {
        const str = requestPath.slice(6);
        const supportsGzip = acceptEncoding
          .split(',')
          .map((e) => e.trim())
          .includes('gzip');

        if (supportsGzip) {
          const compressed = zlib.gzipSync(Buffer.from(str));
          socket.write(
            `HTTP/1.1 200 OK\r\n` +
              `Content-Type: text/plain\r\n` +
              `Content-Encoding: gzip\r\n` +
              `Content-Length: ${compressed.length}\r\n\r\n`
          );
          socket.write(compressed);
        } else {
          socket.write(
            `HTTP/1.1 200 OK\r\n` +
              `Content-Type: text/plain\r\n` +
              `Content-Length: ${Buffer.byteLength(str)}\r\n\r\n` +
              str
          );
        }

        continue;
      }

      // Ruta "/user-agent"
      if (method === 'GET' && requestPath === '/user-agent') {
        socket.write(
          `HTTP/1.1 200 OK\r\n` +
            `Content-Type: text/plain\r\n` +
            `Content-Length: ${Buffer.byteLength(userAgent)}\r\n\r\n` +
            userAgent
        );
        continue;
      }

      // Ruta "/files/{filename}" GET
      if (method === 'GET' && requestPath.startsWith('/files/')) {
        const filename = requestPath.replace('/files/', '');
        const filepath = path.join(baseDirectory, filename);

        try {
          const content = fs.readFileSync(filepath);
          socket.write(
            `HTTP/1.1 200 OK\r\n` +
              `Content-Type: application/octet-stream\r\n` +
              `Content-Length: ${content.length}\r\n\r\n`
          );
          socket.write(content);
        } catch {
          socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        }
        continue;
      }

      // Ruta "/files/{filename}" POST
      if (method === 'POST' && requestPath.startsWith('/files/')) {
        const filename = requestPath.replace('/files/', '');
        const filepath = path.join(baseDirectory, filename);

        fs.writeFile(filepath, body, (err) => {
          if (err) {
            socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
          } else {
            socket.write('HTTP/1.1 201 Created\r\n\r\n');
          }
        });
        continue;
      }

      // Ruta no encontrada
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    }
  });

  // 🔧 Cierra solo si el cliente explícitamente lo pide
  socket.on('end', () => {
    socket.end();
  });

  socket.on('error', () => {
    socket.end();
  });
});

server.listen(4221, 'localhost', () => {
  console.log('Servidor escuchando en http://localhost:4221');
});
