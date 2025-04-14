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

    while (true) {
      const headersEndIndex = buffer.indexOf('\r\n\r\n');
      if (headersEndIndex === -1) break;

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

      if (buffer.length < totalLength) break;

      const body = buffer.slice(headersEndIndex + 4, totalLength);
      buffer = buffer.slice(totalLength);

      const userAgent = headers['user-agent'] || '';
      const acceptEncoding = headers['accept-encoding'] || '';
      const wantsClose = (headers['connection'] || '').toLowerCase() === 'close';

      const writeResponse = (statusLine, headersObj, body) => {
        let headerStr = `${statusLine}\r\n`;
        for (const [key, value] of Object.entries(headersObj)) {
          headerStr += `${key}: ${value}\r\n`;
        }

        if (wantsClose) {
          headerStr += `Connection: close\r\n`;
        }

        socket.write(headerStr + '\r\n');
        if (body) socket.write(body);

        if (wantsClose) {
          socket.end(); // Cierra la conexión solo si se pidió
        }
      };

      // Ruta "/"
      if (method === 'GET' && requestPath === '/') {
        writeResponse('HTTP/1.1 200 OK', {}, null);
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
          writeResponse(
            'HTTP/1.1 200 OK',
            {
              'Content-Type': 'text/plain',
              'Content-Encoding': 'gzip',
              'Content-Length': compressed.length,
            },
            compressed
          );
        } else {
          writeResponse(
            'HTTP/1.1 200 OK',
            {
              'Content-Type': 'text/plain',
              'Content-Length': Buffer.byteLength(str),
            },
            str
          );
        }

        continue;
      }

      // Ruta "/user-agent"
      if (method === 'GET' && requestPath === '/user-agent') {
        writeResponse(
          'HTTP/1.1 200 OK',
          {
            'Content-Type': 'text/plain',
            'Content-Length': Buffer.byteLength(userAgent),
          },
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
          writeResponse(
            'HTTP/1.1 200 OK',
            {
              'Content-Type': 'application/octet-stream',
              'Content-Length': content.length,
            },
            content
          );
        } catch {
          writeResponse('HTTP/1.1 404 Not Found', {}, null);
        }

        continue;
      }

      // Ruta "/files/{filename}" POST
      if (method === 'POST' && requestPath.startsWith('/files/')) {
        const filename = requestPath.replace('/files/', '');
        const filepath = path.join(baseDirectory, filename);

        fs.writeFile(filepath, body, (err) => {
          if (err) {
            writeResponse('HTTP/1.1 500 Internal Server Error', {}, null);
          } else {
            writeResponse('HTTP/1.1 201 Created', {}, null);
          }
        });

        continue;
      }

      // Ruta no encontrada
      writeResponse('HTTP/1.1 404 Not Found', {}, null);
    }
  });

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
