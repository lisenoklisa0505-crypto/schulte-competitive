'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';

interface MoveData {
  sessionId: number;
  number: number;
  playerColor: string;
  userId: number;
  playerName: string;
}

interface GameUpdate {
  type: string;
  number: number;
  playerColor: string;
  userId: number;
  playerName: string;
  timestamp: number;
}

export function useWebSocket(sessionId: number | null) {
  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<GameUpdate | null>(null);
  const [playersMoves, setPlayersMoves] = useState<Map<number, number[]>>(new Map());

  useEffect(() => {
    if (!sessionId) return;

    const socket = io('/', {
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      socket.emit('join-game', String(sessionId));
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('game-update', (update: GameUpdate) => {
      setLastUpdate(update);
      setPlayersMoves(prev => {
        const newMap = new Map(prev);
        const moves = newMap.get(update.userId) || [];
        moves.push(update.number);
        newMap.set(update.userId, moves);
        return newMap;
      });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  const emitMove = useCallback((data: MoveData) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('game-move', data);
    }
  }, []);

  const emitComplete = useCallback((data: { sessionId: number; winnerId: number; winnerName: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('game-complete', data);
    }
  }, []);

  return { isConnected, lastUpdate, playersMoves, emitMove, emitComplete };
}