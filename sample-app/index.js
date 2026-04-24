import http from 'node:http';

const port = Number(process.env.PORT ?? 3000);

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      app: 'brimble-sample-app',
      path: req.url,
      status: 'ok',
    })
  );
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Sample app listening on ${port}`);
});
