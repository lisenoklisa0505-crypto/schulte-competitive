import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';

export function initWebSocketServer(server: HTTPServer) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('WebSocket connected');
    
    ws.on('message', (data) => {
      console.log('Received:', data.toString());
    });
    
    ws.on('close', () => {
      console.log('WebSocket disconnected');
    });
  });
  
  return wss;
}
