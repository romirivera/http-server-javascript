const net = require('net');

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = data.toString();
    const requestLine = request.split('\r\n')[0]; // Primera línea
    const [method, path, version] = requestLine.split(' '); // Divide en partes

    // Lógica para responder según el path
    if (method === 'GET' && path === '/') {
      socket.write('HTTP/1.1 200 OK\r\n\r\n');
    } else if (method === 'GET' && path.startsWith('/echo/')) {
      const str = path.slice(6); // Extrae lo que viene después de "/echo/"
      const contentLength = Buffer.byteLength(str); // Longitud en bytes

      const response =
        `HTTP/1.1 200 OK\r\n` +
        `Content-Type: text/plain\r\n` +
        `Content-Length: ${contentLength}\r\n` +
        `\r\n` +
        `${str}`;

      socket.write(response);
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    }

    socket.end(); // Cierra la conexión después de responder
  });

  socket.on('close', () => {
    socket.end();
  });
});
server.listen(4221, 'localhost', () => {
  console.log('Servidor escuchando en http://localhost:4221');
});
