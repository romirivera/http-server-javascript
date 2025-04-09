const net = require('net');
const fs = require('fs');
const path = require('path');

// Leer el directorio desde los argumentos
const directoryIndex = process.argv.indexOf('--directory');
const baseDirectory = directoryIndex !== -1 ? process.argv[directoryIndex + 1] : null;

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = data.toString();
    const [requestLine, ...headerLines] = request.split('\r\n');
    const [method, requestPath] = requestLine.split(' ');

    // Obtener User-Agent si existe
    const userAgentLine = headerLines.find((line) =>
      line.toLowerCase().startsWith('user-agent:')
    );
    const userAgent = userAgentLine ? userAgentLine.split(': ')[1] : '';

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

      const response =
        `HTTP/1.1 200 OK\r\n` +
        `Content-Type: text/plain\r\n` +
        `Content-Length: ${length}\r\n\r\n` +
        `${str}`;

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

    // Ruta "/files/{filename}"
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

    // Si no se reconoció la ruta
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
