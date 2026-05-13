import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initWebSocketServer } from './websocket-server';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let server: any;

async function startServer() {
  await app.prepare();
  
  server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '', true);
    handle(req, res, parsedUrl);
  });
  
  // Инициализируем WebSocket
  initWebSocketServer(server);
  
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
    console.log(`> WebSocket server running on ws://localhost:${port}/ws`);
  });
}

startServer();
