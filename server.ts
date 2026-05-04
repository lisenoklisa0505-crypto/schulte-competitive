import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initSocketServer } from './src/lib/socket-server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

async function startServer() {
  await app.prepare();
  
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    handle(req, res, parsedUrl);
  });
  
  // Инициализируем Socket.IO
  initSocketServer(server);
  
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`
    ╔════════════════════════════════════════╗
    ║     🚀 SERVER STARTED SUCCESSFULLY     ║
    ╠════════════════════════════════════════╣
    ║  HTTP:   http://localhost:${port}         ║
    ║  WS:     ws://localhost:${port}/socket.io  ║
    ╚════════════════════════════════════════╝
    `);
  });
}

startServer();