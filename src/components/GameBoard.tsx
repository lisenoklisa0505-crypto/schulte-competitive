'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';

interface Props {
  sessionId: number;
  userId: string;
  playerColor: string;
}

export default function GameBoard({ sessionId, userId, playerColor }: Props) {
  const router = useRouter();
  const [takenNumbers, setTakenNumbers] = useState<Record<number, string>>({});
  const [myMoves, setMyMoves] = useState<Set<number>>(new Set());
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [winner, setWinner] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [hasCleanedUp, setHasCleanedUp] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [grid, setGrid] = useState<number[][] | null>(null);
  const [currentNumber, setCurrentNumber] = useState(1);
  const [myErrors, setMyErrors] = useState(0);
  const [myProgress, setMyProgress] = useState(0);
  const [isBotThinking, setIsBotThinking] = useState(false);

  const { data: stateRaw, refetch } = trpc.game.getGameState.useQuery(
    { sessionId },
    { refetchInterval: 100 } // Быстрое обновление 100 мс
  );

  const makeMove = trpc.game.makeMove.useMutation();
  const makeBotMove = trpc.game.makeBotMove.useMutation();
  const exitGame = trpc.game.exitGame.useMutation();

  const state = stateRaw as any;

  // Таймер
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (gameStatus === 'active') {
      setTimeElapsed(0);
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameStatus, sessionId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${secs} сек`;
  };

  // Обновление состояния из БД
  useEffect(() => {
    if (state) {
      if (state.players) setPlayers(state.players);
      if (state.takenNumbers) setTakenNumbers(state.takenNumbers);
      if (state.status !== gameStatus) {
        setGameStatus(state.status || 'waiting');
      }
      if (state.winnerId) setWinner(state.winnerId);
      if (state.table) setGrid(state.table);
      if (state.currentNumber) setCurrentNumber(state.currentNumber);
      
      const currentPlayer = state.players?.find((p: any) => String(p.userId) === String(userId));
      if (currentPlayer) {
        setMyErrors(currentPlayer.errors || 0);
        setMyProgress(currentPlayer.progress || 0);
      }
    }
  }, [state, userId, gameStatus]);

  // Выход из игры
  const handleExit = async () => {
    if (hasCleanedUp) return;
    setHasCleanedUp(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await exitGame.mutateAsync({ sessionId });
    } catch (err) {
      console.error('Exit error:', err);
    }

    router.push('/rooms');
  };

  // Обработка клика по ячейке с оптимистичным обновлением (мгновенно)
  const handleCellClick = async (number: number) => {
    if (myMoves.has(number)) return;
    if (takenNumbers[number]) return;
    if (gameStatus !== 'active') return;
    if (currentNumber !== number) return; // Только нужное число

    // Оптимистичное обновление - мгновенная реакция
    setMyMoves(prev => new Set(prev).add(number));
    setTakenNumbers(prev => ({ ...prev, [number]: playerColor }));
    setMyProgress(prev => prev + 1);
    
    try {
      const result = await makeMove.mutateAsync({ sessionId, number });
      if (!result.valid && result.message) {
        // Откат при ошибке
        setMyMoves(prev => {
          const newSet = new Set(prev);
          newSet.delete(number);
          return newSet;
        });
        setTakenNumbers(prev => {
          const newObj = { ...prev };
          delete newObj[number];
          return newObj;
        });
        setMyProgress(prev => prev - 1);
        alert(result.message);
      }
      refetch();
    } catch (err) {
      // Откат при ошибке
      setMyMoves(prev => {
        const newSet = new Set(prev);
        newSet.delete(number);
        return newSet;
      });
      setTakenNumbers(prev => {
        const newObj = { ...prev };
        delete newObj[number];
        return newObj;
      });
      setMyProgress(prev => prev - 1);
      console.error('Move error:', err);
    }
  };

  // Бот - быстрый и стабильный
  useEffect(() => {
    const hasBot = players?.some((p: any) => p.isBot);
    if (hasBot && gameStatus === 'active' && !winner && !isBotThinking) {
      const timer = setTimeout(() => {
        setIsBotThinking(true);
        makeBotMove.mutate({ sessionId }, {
          onSuccess: () => {
            refetch();
            setIsBotThinking(false);
          },
          onError: () => {
            setIsBotThinking(false);
          }
        });
      }, 600); // Задержка 600 мс для естественности
      return () => clearTimeout(timer);
    }
  }, [players, gameStatus, sessionId, makeBotMove, refetch, winner, currentNumber, isBotThinking]);

  // Проверка загрузки
  if (!grid || grid.length === 0) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white' }}>Загрузка игры...</div>
      </div>
    );
  }

  const isFinished = gameStatus === 'finished';
  const humanPlayers = players?.filter((p: any) => !p.isBot) || [];
  const maxPlayers = state?.maxPlayers || 4;
  const waitingForPlayers = !players?.some((p: any) => p.isBot) && humanPlayers.length < maxPlayers && gameStatus === 'waiting';

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
            {gameStatus === 'active' && !isFinished && (
              <div style={{ color: '#10b981', fontSize: '12px' }}>Игра идёт!</div>
            )}
            {isFinished && (
              <div style={{ color: '#ef4444', fontSize: '12px' }}>Игра окончена</div>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af' }}>{gameStatus === 'active' ? 'Найти число' : 'Ожидание'}</div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#a78bfa' }}>
              {gameStatus === 'active' && !isFinished ? currentNumber : '—'}
            </div>
            <div style={{ color: '#6b7280' }}>из 25</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#9ca3af' }}>Время игры</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>
              {gameStatus === 'active' && !isFinished ? formatTime(timeElapsed) : (isFinished ? formatTime(timeElapsed) : '0 сек')}
            </div>
          </div>
        </div>

        {/* Game Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr 250px', gap: '24px' }}>
          {/* Left Panel - Players */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '20px' }}>
            <h3 style={{ marginBottom: '16px', color: 'white' }}>Игроки</h3>
            {players.map((player: any, idx: number) => {
              const isCurrentUser = String(player.userId) === String(userId);
              return (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    marginTop: '12px',
                    background: isCurrentUser ? 'rgba(106,92,255,0.1)' : '#0b0f1a',
                    border: isCurrentUser ? '1px solid #6a5cff' : '1px solid #1f2540'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: player.color }} />
                    <span style={{ color: 'white' }}>
                      {isCurrentUser ? 'Вы' : (player.name || (player.isBot ? '🤖 Бот' : `Игрок ${player.userId?.slice(0, 4)}`))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9ca3af' }}>
                    <span>Ошибок: {player.errors || 0}</span>
                    <span>Прогресс: {player.progress || 0}/25</span>
                  </div>
                </div>
              );
            })}
            {players.length === 0 && (
              <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>Нет игроков</div>
            )}
          </div>

          {/* Center - Game Grid */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '24px' }}>
            {waitingForPlayers ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px' }}>🕐</div>
                <div>Ожидание игроков... ({humanPlayers.length}/{maxPlayers})</div>
              </div>
            ) : isFinished && winner ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
                <h2 style={{ color: 'white', marginBottom: '8px' }}>
                  {String(winner) === String(userId) ? 'Вы победили!' : `Победил: ${winner === 'bot' ? 'Бот' : winner.slice(0, 8)}`}
                </h2>
                <p style={{ color: '#fbbf24', marginBottom: '16px' }}>Время: {formatTime(timeElapsed)}</p>
                <button
                  onClick={handleExit}
                  style={{
                    padding: '10px 20px',
                    background: '#6a5cff',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                {grid.flat().map((num: number, idx: number) => {
                  const cellColor = takenNumbers[num];
                  const isCurrent = num === currentNumber;
                  const isDisabled = !!cellColor || myMoves.has(num) || isFinished || gameStatus !== 'active';
                  
                  let bgColor = '#1a1f33';
                  if (cellColor === '#FF6B6B') bgColor = '#FF6B6B';
                  else if (cellColor === '#4ECDC4') bgColor = '#4ECDC4';
                  else if (cellColor === '#45B7D1') bgColor = '#45B7D1';
                  else if (cellColor === '#96CEB4') bgColor = '#96CEB4';
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCellClick(num)}
                      disabled={isDisabled}
                      style={{
                        aspectRatio: '1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: cellColor ? bgColor : '#1a1f33',
                        borderRadius: '12px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: cellColor ? 'white' : '#E8EAFF',
                        border: isCurrent && !cellColor && gameStatus === 'active' ? '3px solid #F5A623' : '1px solid #2a2f45',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.6 : 1,
                        boxShadow: isCurrent && !cellColor && gameStatus === 'active' ? '0 0 15px rgba(245,166,35,0.6)' : 'none',
                        transition: 'all 0.05s ease',
                      }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel - Info */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af' }}>Ваш прогресс</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>{myProgress}/25</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af' }}>Следующее число</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#a78bfa' }}>
                {gameStatus === 'active' && !isFinished ? currentNumber : '—'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#9ca3af' }}>Ошибок</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>{myErrors}</div>
            </div>
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <button
                onClick={handleExit}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Выйти из комнаты
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}