const { WebSocketServer } = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket работает!' }));
});

server.listen(3002, () => {
  console.log('WebSocket server running on port 3002');
});