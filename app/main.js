const net = require('net');
const fs = require('fs');
const path = require('path');

// Leer el directorio desde los argumentos
const directoryIndex = process.argv.indexOf('--directory');
const baseDirectory = directoryIndex !== -1 ? process.argv[directoryIndex + 1] : null;

const server = net.createServer((socket) => {
  let requestData = '';

  socket.on('data', (chunk) => {
    requestData += chunk.toString();

    const headersEndIndex = requestData.indexOf('\r\n\r\n');
    if (headersEndIndex === -1) return; // Aún no llegan todos los headers

    const headerPart = requestData.slice(0, headersEndIndex);
    const [requestLine, ...headerLines] = headerPart.split('\r\n');
    const [method, requestPath] = requestLine.split(' ');
    const headers = {};

    headerLines.forEach((line) => {
      const [key, value] = line.split(': ');
      headers[key.toLowerCase()] = value;
    });

    const contentLength = parseInt(headers['content-length'] || 0);
    const body = requestData.slice(headersEndIndex + 4);

    // Esperar a que llegue el body completo si aún no está
    if (body.length < contentLength) return;

    // Obtener User-Agent
    const userAgent = headers['user-agent'] || '';

    // Ruta "/"
    if (method === 'GET' && requestPath === '/') {
      socket.write('HTTP/1.1 200 OK\r\n\r\n');
      socket.end();
      return;
    }

    // Ruta "/echo/{str}"
    if (method === 'GET' && requestPath.startsWith('/echo/')) {
      const str = requestPath.slice(6);
      const length = Buffer.byteLength(str);

      const acceptEncodingHeaders = headers['accept-encoding'];

      // Analizar si cliente acepta gzip
      const supportsGzip = acceptEncodingHeaders
        .split(',')
        .map((e) => e.trim())
        .includes('gzip');

      let response = '';

      if (supportsGzip) {
        response =
          `HTTP/1.1 200 OK\r\n` +
          `Content-Type: text/plain\r\n` +
          `Content-Encoding: gzip\r\n` +
          `Content-Length: ${length}\r\n\r\n` +
          `${str}`;
      } else {
        response =
          `HTTP/1.1 200 OK\r\n` +
          `Content-Type: text/plain\r\n` +
          `Content-Length: ${length}\r\n\r\n` +
          `${str}`;
      }

      socket.write(response);
      socket.end();
      return;
    }

    // Ruta "/user-agent"
    if (method === 'GET' && requestPath === '/user-agent') {
      const length = Buffer.byteLength(userAgent);
      const response =
        `HTTP/1.1 200 OK\r\n` +
        `Content-Type: text/plain\r\n` +
        `Content-Length: ${length}\r\n\r\n` +
        `${userAgent}`;

      socket.write(response);
      socket.end();
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

    // Si no se reconoce la ruta
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.end();
  });

  socket.on('close', () => {
    socket.end();
  });
});

server.listen(4221, 'localhost', () => {
  console.log('Servidor escuchando en http://localhost:4221');
});

// correr el servidor: ./your_program.sh --directory /tmp/
