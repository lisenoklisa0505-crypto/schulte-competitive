'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';
import io from 'socket.io-client';
import Header from '@/components/Header';

interface Props {
  sessionId: number;
  userId: number;
  playerColor: string;
}

export default function GameBoard({ sessionId, userId, playerColor }: Props) {
  const router = useRouter();
  const [socket, setSocket] = useState<any>(null);
  const [takenNumbers, setTakenNumbers] = useState<Record<number, string>>({});
  const [myMoves, setMyMoves] = useState<Set<number>>(new Set());
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [winner, setWinner] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [players, setPlayers] = useState<any[]>([]);
  const [hasCleanedUp, setHasCleanedUp] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: stateRaw, refetch } = trpc.game.getGameState.useQuery(
    { sessionId },
    { refetchInterval: 1000 }
  );

  const makeMove = trpc.game.makeMove.useMutation();
  const makeBotMove = trpc.game.makeBotMove.useMutation();
  const exitGame = trpc.game.exitGame.useMutation();

  const state = stateRaw as any;

  // Таймер
  useEffect(() => {
    if (gameStatus === 'active') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${secs} сек`;
  };

  // Socket.IO
  useEffect(() => {
    const newSocket = io({
      path: '/socket.io/',
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join-game', String(sessionId));
    });

    newSocket.on('room-deleted', ({ sessionId: deletedId }) => {
      if (deletedId === sessionId) {
        router.push('/rooms');
      }
    });

    newSocket.on('game-update', (data: any) => {
      if (data.type === 'move') {
        setTakenNumbers(prev => ({ ...prev, [data.number]: data.playerColor }));
        refetch();
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [sessionId, router, refetch]);

  // Выход из игры
  const handleExit = async () => {
    if (hasCleanedUp) return;
    setHasCleanedUp(true);

    try {
      const result = await exitGame.mutateAsync({ sessionId });
      if (result?.roomDeleted) {
        if (socket && isConnected) {
          socket.emit('room-deleted', { sessionId });
        }
      }
    } catch (err) {
      console.error('Exit error:', err);
    }

    if (socket) socket.disconnect();
    if (timerRef.current) clearInterval(timerRef.current);
    router.push('/rooms');
  };

  // Обновление состояния из БД
  useEffect(() => {
    if (state?.players) setPlayers(state.players);
    if (state?.takenNumbers) setTakenNumbers(state.takenNumbers);
    if (state?.status !== gameStatus) setGameStatus(state?.status || 'waiting');
    if (state?.winnerId !== winner) setWinner(state?.winnerId);
  }, [state]);

  // Обработка клика по ячейке
  const handleCellClick = async (number: number) => {
    if (myMoves.has(number)) return;
    if (takenNumbers[number]) return;
    if (gameStatus !== 'active') return;

    try {
      const result = await makeMove.mutateAsync({ sessionId, number });
      if (result.valid) {
        setMyMoves(prev => new Set(prev).add(number));
        setTakenNumbers(prev => ({ ...prev, [number]: playerColor }));
        if (socket && isConnected) {
          socket.emit('game-move', { sessionId, number, playerColor, userId });
        }
        refetch();
      } else if (result.message) {
        alert(result.message);
      }
    } catch (err) {
      console.error('Move error:', err);
    }
  };

  // Бот
  useEffect(() => {
    const hasBot = players?.some((p: any) => p.isBot);
    if (hasBot && gameStatus === 'active') {
      const interval = setInterval(() => {
        makeBotMove.mutate({ sessionId });
        refetch();
      }, 800 + Math.random() * 700);
      return () => clearInterval(interval);
    }
  }, [players, gameStatus, sessionId, makeBotMove, refetch]);

  // Проверка данных
  if (!state || !state.table) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white' }}>Загрузка игры...</div>
      </div>
    );
  }

  const table = state.table;
  const currentNumber = state.currentNumber || 1;
  const isFinished = gameStatus === 'finished';
  const currentPlayer = players?.find((p: any) => p.userId === userId);
  const hasBot = players?.some((p: any) => p.isBot);
  const humanPlayers = players?.filter((p: any) => !p.isBot) || [];
  const maxPlayers = 4;
  const waitingForPlayers = !hasBot && humanPlayers.length < maxPlayers && gameStatus === 'waiting';

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f1a' }}>
      <Header />

      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
        {/* Game Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <div style={{ color: '#9ca3af' }}>Комната #{sessionId}</div>
            {waitingForPlayers && (
              <div style={{ color: '#fbbf24', fontSize: '12px' }}>
                Ожидание игроков... ({humanPlayers.length}/{maxPlayers})
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af' }}>{gameStatus === 'active' ? 'Найти число' : 'Ожидание'}</div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#a78bfa' }}>
              {gameStatus === 'active' ? currentNumber : '—'}
            </div>
            <div style={{ color: '#6b7280' }}>из 25</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#9ca3af' }}>Время игры</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>
              {gameStatus === 'active' ? formatTime(timeElapsed) : '0 сек'}
            </div>
          </div>
        </div>

        {/* Game Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 250px', gap: '24px' }}>
          {/* Left Panel - Players */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '20px' }}>
            <h3 style={{ marginBottom: '16px', color: 'white' }}>Игроки</h3>
            {players?.map((player: any, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  marginTop: '12px',
                  background: player.userId === userId ? 'rgba(106,92,255,0.1)' : '#0b0f1a',
                  border: player.userId === userId ? '1px solid #6a5cff' : '1px solid #1f2540'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: player.color }} />
                  <span style={{ color: 'white' }}>
                    {player.userId === userId ? 'Вы' : player.isBot ? '🤖 Бот' : `Игрок ${player.userId}`}
                    {player.order === 0 && !player.isBot && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', color: '#fbbf24' }}>👑 Хост</span>
                    )}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9ca3af' }}>
                  <span>Ошибок: {player.errors || 0}</span>
                  <span>Прогресс: {player.progress || 0}/25</span>
                </div>
              </div>
            ))}
          </div>

          {/* Center - Game Grid */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '24px' }}>
            {waitingForPlayers ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px' }}>🕐</div>
                <div>Ожидание игроков... ({humanPlayers.length}/{maxPlayers})</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {table.map((row: number[], i: number) =>
                  row.map((num: number, j: number) => {
                    const cellColor = takenNumbers[num];
                    const isCurrent = num === currentNumber;
                    const isDisabled = !!cellColor || myMoves.has(num) || isFinished || gameStatus !== 'active';
                    
                    return (
                      <button
                        key={`${i}-${j}-${num}`}
                        onClick={() => handleCellClick(num)}
                        disabled={isDisabled}
                        style={{
                          aspectRatio: '1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: cellColor || '#1a1f33',
                          borderRadius: '12px',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          color: 'white',
                          border: isCurrent && !cellColor && gameStatus === 'active' ? '2px solid #a78bfa' : 'none',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1,
                          boxShadow: isCurrent && !cellColor && gameStatus === 'active' ? '0 0 15px rgba(167,139,250,0.5)' : 'none'
                        }}
                      >
                        {num}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Info */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af' }}>Ваш прогресс</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{myMoves.size}/25</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af' }}>Следующее число</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#a78bfa' }}>
                {gameStatus === 'active' ? currentNumber : '—'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#9ca3af' }}>Ошибок</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{currentPlayer?.errors || 0}</div>
            </div>
          </div>
        </div>

        {/* Exit Button */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={handleExit}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1px solid #ef4444',
              color: '#ef4444',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#ef4444';
            }}
          >
            Выйти из комнаты
          </button>
        </div>

        {/* Winner Modal */}
        {isFinished && winner && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#101528', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '400px', width: '90%' }}>
              {winner === userId ? (
                <>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
                  <h2 style={{ color: 'white', marginBottom: '8px' }}>Вы победили!</h2>
                  <p style={{ color: '#fbbf24', marginBottom: '16px' }}>Время: {formatTime(timeElapsed)}</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>💔</div>
                  <h2 style={{ color: 'white', marginBottom: '8px' }}>Игра окончена</h2>
                  <p style={{ color: '#fbbf24', marginBottom: '16px' }}>Победил: {winner === -1 ? 'Бот' : `Игрок ${winner}`}</p>
                </>
              )}
              <button
                onClick={handleExit}
                style={{
                  marginTop: '20px',
                  padding: '10px 20px',
                  background: '#6a5cff',
                  border: 'none',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#4f8cff'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#6a5cff'}
              >
                В меню
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}