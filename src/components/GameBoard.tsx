'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';

interface Props {
  sessionId: string;
  userId: string;
}

interface Player {
  userId: string | null;
  isBot: boolean;
  color: string;
  errors: number;
  progress: number;
  name: string | null;
}

interface GameState {
  table: number[][];
  status: string;
  winnerId: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  players: Player[];
  takenNumbers: Record<number, string>;
  currentNumber: number;
  maxPlayers: number;
  myColor: string;
}

export default function GameBoard({ sessionId, userId }: Props) {
  const router = useRouter();
  const [takenNumbers, setTakenNumbers] = useState<Record<number, string>>({});
  const [myMoves, setMyMoves] = useState<Set<number>>(new Set());
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [winner, setWinner] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [hasCleanedUp, setHasCleanedUp] = useState<boolean>(false);
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [grid, setGrid] = useState<number[][] | null>(null);
  const [currentNumber, setCurrentNumber] = useState<number>(1);
  const [myErrors, setMyErrors] = useState<number>(0);
  const [myProgress, setMyProgress] = useState<number>(0);
  const [myColor, setMyColor] = useState<string>('#FF6B6B');
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const botThinkingRef = useRef<boolean>(false);
  const currentNumberRef = useRef<number>(1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnmountedRef = useRef<boolean>(false);

  const { data: stateRaw, refetch } = trpc.game.getGameState.useQuery(
    { sessionId },
    { 
      refetchInterval: false,
      enabled: true,
    }
  );

  const makeMove = trpc.game.makeMove.useMutation();
  const makeBotMove = trpc.game.makeBotMove.useMutation();
  const exitGame = trpc.game.exitGame.useMutation();

  const state = stateRaw as GameState | undefined;

  // Таймер на основе серверного startedAt
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (gameStatus === 'active' && startedAt) {
      const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        setTimeElapsed(elapsed);
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else if (gameStatus === 'finished' && state?.finishedAt && startedAt) {
      const elapsed = Math.floor((state.finishedAt - startedAt) / 1000);
      setTimeElapsed(elapsed);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStatus, startedAt, state?.finishedAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${secs} сек`;
  };

  // Обновление состояния из БД
  useEffect(() => {
    if (state && !hasUnmountedRef.current) {
      if (state.players) setPlayers(state.players);
      if (state.takenNumbers) setTakenNumbers(state.takenNumbers);
      if (state.status !== gameStatus) setGameStatus(state.status);
      if (state.winnerId) setWinner(state.winnerId);
      if (state.table) setGrid(state.table);
      if (state.myColor) setMyColor(state.myColor);

      const newCurrentNumber = state.currentNumber ?? 1;
      if (newCurrentNumber !== currentNumberRef.current) {
        currentNumberRef.current = newCurrentNumber;
        setCurrentNumber(newCurrentNumber);
      }

      if (state.startedAt && !startedAt) setStartedAt(state.startedAt);

      const currentPlayer = state.players?.find(
        (p: Player) => String(p.userId) === String(userId)
      );
      if (currentPlayer) {
        setMyErrors(currentPlayer.errors || 0);
        setMyProgress(currentPlayer.progress || 0);
      }
    }
  }, [state, userId, gameStatus, startedAt]);

  const handleExit = async (): Promise<void> => {
    if (hasCleanedUp) return;
    setHasCleanedUp(true);
    hasUnmountedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await exitGame.mutateAsync({ sessionId });
    } catch (err) {
      console.error('Exit error:', err);
    }
    router.push('/rooms');
  };

  // Обработка клика по ячейке с оптимистичным обновлением (мгновенно)
  const handleCellClick = async (number: number): Promise<void> => {
    if (myMoves.has(number)) return;
    if (takenNumbers[number]) return;
    if (gameStatus !== 'active') return;
    
    // МГНОВЕННОЕ оптимистичное обновление UI
    setTakenNumbers(prev => ({ ...prev, [number]: myColor }));
    setMyMoves(prev => new Set(prev).add(number));
    
    try {
      const result = await makeMove.mutateAsync({ sessionId, number });
      if (result.valid) {
        setMyProgress(prev => prev + 1);
        setCurrentNumber(prev => prev + 1);
        await refetch();
      } else {
        // Откат при ошибке
        setTakenNumbers(prev => {
          const newObj = { ...prev };
          delete newObj[number];
          return newObj;
        });
        setMyMoves(prev => {
          const newSet = new Set(prev);
          newSet.delete(number);
          return newSet;
        });
        setMyErrors(prev => prev + 1);
        if (result.message) console.log(result.message);
      }
    } catch (err) {
      // Откат при ошибке
      setTakenNumbers(prev => {
        const newObj = { ...prev };
        delete newObj[number];
        return newObj;
      });
      setMyMoves(prev => {
        const newSet = new Set(prev);
        newSet.delete(number);
        return newSet;
      });
      setMyErrors(prev => prev + 1);
      console.error('Move error:', err);
    }
  };

  // Ход бота
  const runBotMove = useCallback(async (): Promise<(() => void) | undefined> => {
    if (botThinkingRef.current) return;
    botThinkingRef.current = true;

    let cancelled = false;

    try {
      const delay = 700 + Math.random() * 2500;
      await new Promise(resolve => setTimeout(resolve, delay));
      if (cancelled) return;

      const result = await makeBotMove.mutateAsync({ sessionId });
      if (cancelled) return;
      if (result?.success) await refetch();
    } catch (err) {
      console.error('Bot move error:', err);
    } finally {
      botThinkingRef.current = false;
    }

    return () => { cancelled = true; };
  }, [sessionId, makeBotMove, refetch]);

  useEffect(() => {
    const hasBot = players?.some((p: Player) => p.isBot);
    if (!hasBot) return;
    if (gameStatus !== 'active') return;
    if (winner) return;
    if (currentNumber > 25) return;

    let cleanupFn: (() => void) | undefined;
    runBotMove().then((fn: (() => void) | undefined) => { cleanupFn = fn; });

    return () => {
      if (cleanupFn) cleanupFn();
    };
  }, [currentNumber, gameStatus, winner, players, runBotMove]);

  if (!grid || grid.length === 0) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0b0f1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'white' }}>Загрузка игры...</div>
      </div>
    );
  }

  const isFinished = gameStatus === 'finished';
  const humanPlayers = players?.filter((p: Player) => !p.isBot) || [];
  const maxPlayers = state?.maxPlayers || 4;
  const waitingForPlayers =
    !players?.some((p: Player) => p.isBot) &&
    humanPlayers.length < maxPlayers &&
    gameStatus === 'waiting';

  const getWinnerLabel = (): string => {
    if (!winner) return '';
    if (String(winner) === String(userId)) return 'Вы победили!';
    if (winner === 'bot' || winner === null) return 'Победил: 🤖 Бот';
    return `Победил: Игрок ${winner.slice(0, 8)}`;
  };

  const shortSessionId = sessionId.slice(0, 8);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f1a' }}>
      <Header />
      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div>
            <div style={{ color: '#9ca3af' }}>Комната #{shortSessionId}</div>
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
            <div style={{ color: '#9ca3af' }}>
              {gameStatus === 'active' ? 'Найти число' : 'Ожидание'}
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#a78bfa' }}>
              {gameStatus === 'active' && !isFinished ? currentNumber : '—'}
            </div>
            <div style={{ color: '#6b7280' }}>из 25</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#9ca3af' }}>Время игры</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>
              {formatTime(timeElapsed)}
            </div>
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '250px 1fr 250px', gap: '24px' }}
        >
          {/* Левая панель - игроки */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '20px' }}>
            <h3 style={{ marginBottom: '16px', color: 'white' }}>Игроки</h3>
            {players.map((player: Player, idx: number) => {
              const isCurrentUser = String(player.userId) === String(userId);
              return (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    marginTop: '12px',
                    background: isCurrentUser ? 'rgba(106,92,255,0.1)' : '#0b0f1a',
                    border: isCurrentUser ? '1px solid #6a5cff' : '1px solid #1f2540',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: player.color,
                      }}
                    />
                    <span style={{ color: 'white' }}>
                      {isCurrentUser
                        ? 'Вы'
                        : player.name || (player.isBot ? '🤖 Бот' : `Игрок ${player.userId?.slice(0, 4)}`)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9ca3af' }}>
                    <span>Ошибок: {player.errors || 0}</span>
                    <span>Прогресс: {player.progress || 0}/25</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Центр - игровое поле */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '24px' }}>
            {waitingForPlayers ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#9ca3af' }}>
                <div style={{ fontSize: '48px' }}>🕐</div>
                <div>Ожидание игроков... ({humanPlayers.length}/{maxPlayers})</div>
              </div>
            ) : isFinished && winner ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
                <h2 style={{ color: 'white', marginBottom: '8px' }}>{getWinnerLabel()}</h2>
                <p style={{ color: '#fbbf24', marginBottom: '16px' }}>Время: {formatTime(timeElapsed)}</p>
                <button
                  onClick={handleExit}
                  style={{
                    padding: '10px 20px',
                    background: '#6a5cff',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: 'pointer',
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
                        background: cellColor || '#1a1f33',
                        borderRadius: '12px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: cellColor ? 'white' : '#E8EAFF',
                        border: isCurrent && !cellColor && gameStatus === 'active'
                          ? '3px solid #F5A623'
                          : '1px solid #2a2f45',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.6 : 1,
                        boxShadow: isCurrent && !cellColor && gameStatus === 'active'
                          ? '0 0 15px rgba(245,166,35,0.6)'
                          : 'none',
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

          {/* Правая панель - информация */}
          <div style={{ background: '#101528', borderRadius: '20px', padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af' }}>Ваш цвет</div>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: myColor,
                  margin: '8px auto',
                }}
              />
            </div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af' }}>Ваш прогресс</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>
                {myProgress}/25
              </div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ color: '#9ca3af' }}>Следующее число</div>
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#a78bfa' }}>
                {gameStatus === 'active' && !isFinished ? currentNumber : '—'}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#9ca3af' }}>Ошибок</div>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
                {myErrors}
              </div>
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
                  width: '100%',
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