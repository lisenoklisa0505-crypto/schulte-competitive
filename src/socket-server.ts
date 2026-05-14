import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

export let io: Server;

export function initSocketServer(server: HTTPServer) {
  io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    socket.on('join-game', (sessionId: string) => {
      socket.join(`game:${sessionId}`);
      console.log(`📦 Socket ${socket.id} joined game ${sessionId}`);
      socket.emit('joined', { sessionId, success: true });
    });

    socket.on('game-move', (data) => {
      io.to(`game:${data.sessionId}`).emit('game-update', {
        type: 'move',
        number: data.number,
        playerColor: data.playerColor,
        userId: data.userId,
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });
  return io;
}