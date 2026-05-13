import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

export let io: Server;

export function initSocketServer(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
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

    socket.on('leave-game', (sessionId: string) => {
      socket.leave(`game:${sessionId}`);
      console.log(`🚪 Socket ${socket.id} left game ${sessionId}`);
    });

    socket.on('game-move', (data) => {
      console.log(`🎯 Move in game ${data.sessionId}: Player ${data.userId} clicked ${data.number}`);
      io.to(`game:${data.sessionId}`).emit('game-update', {
        type: 'move',
        number: data.number,
        playerColor: data.playerColor,
        userId: data.userId,
        playerName: data.playerName,
        timestamp: Date.now(),
      });
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });

  return io;
}
