const net = require('net');

const server = net.createServer((socket) => {
  socket.on('data', () => {
    socket.write('HTTP/1.1 200 OK\r\n\r\n');
    socket.end();
  });
  socket.on('close', () => {
    socket.end();
  });
});
server.listen(4221, 'localhost', () => {
  console.log('Servidor escuchando en http://localhost:4221');
});
