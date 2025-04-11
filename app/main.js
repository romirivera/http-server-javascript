if (method === 'GET' && path.startsWith('/echo/')) {
  const str = path.slice(6);
  const acceptEncodingHeader = headers.find((line) =>
    line.toLowerCase().startsWith('accept-encoding:')
  );

  let acceptEncoding = '';
  if (acceptEncodingHeader) {
    acceptEncoding = acceptEncodingHeader.split(':')[1].trim();
  }

  // Convertimos la lista a un array y revisamos si incluye 'gzip'
  const encodings = acceptEncoding.split(',').map((enc) => enc.trim().toLowerCase());

  let responseHeaders = `HTTP/1.1 200 OK\r\n` + `Content-Type: text/plain\r\n`;

  if (encodings.includes('gzip')) {
    responseHeaders += `Content-Encoding: gzip\r\n`;
  }

  const body = str;
  const length = Buffer.byteLength(body);
  responseHeaders += `Content-Length: ${length}\r\n\r\n`;

  socket.write(responseHeaders + body);
  socket.end();
}
