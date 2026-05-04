'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

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
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<GameUpdate | null>(null);
  const [playersMoves, setPlayersMoves] = useState<Map<number, number[]>>(new Map());

  useEffect(() => {
    if (!sessionId) {
      console.log('No sessionId, skipping WebSocket connection');
      return;
    }

    const socket = io({
      path: '/socket.io/',
      addTrailingSlash: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setIsConnected(true);
      socket.emit('join-game', String(sessionId));
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('joined', (data: { sessionId: string; success: boolean }) => {
      console.log('📦 Joined game room:', data);
    });

    socket.on('game-update', (update: GameUpdate) => {
      console.log('🔄 Game update:', update);
      setLastUpdate(update);
      
      setPlayersMoves(prev => {
        const newMap = new Map(prev);
        const moves = newMap.get(update.userId) || [];
        moves.push(update.number);
        newMap.set(update.userId, moves);
        return newMap;
      });
    });

    socket.on('game-finished', (data: { winnerId: number; winnerName: string }) => {
      console.log('🏆 Game finished! Winner:', data.winnerName);
    });

    socketRef.current = socket;

    return () => {
      if (socket) {
        socket.emit('leave-game', String(sessionId));
        socket.disconnect();
      }
    };
  }, [sessionId]);

  const emitMove = useCallback((data: MoveData) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('game-move', data);
    } else {
      console.warn('WebSocket not connected, cannot emit move');
    }
  }, []);

  const emitComplete = useCallback((data: { sessionId: number; winnerId: number; winnerName: string }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('game-complete', data);
    }
  }, []);

  return {
    isConnected,
    lastUpdate,
    playersMoves,
    emitMove,
    emitComplete,
  };
}