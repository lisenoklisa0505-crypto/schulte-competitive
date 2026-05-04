'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateGameModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [gameMode, setGameMode] = useState<'multiplayer' | 'bot'>('multiplayer');
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const createGame = trpc.game.createGame.useMutation();
  const startBotGame = trpc.game.startBotGame.useMutation();

  const handleSubmit = async () => {
    setIsCreating(true);
    try {
      if (gameMode === 'bot') {
        const result = await startBotGame.mutateAsync();
        onClose();
        router.push(`/game/${result.sessionId}`);
      } else {
        if (!roomName.trim()) {
          alert('Введите название комнаты');
          setIsCreating(false);
          return;
        }
        const result = await createGame.mutateAsync({ 
          maxPlayers: maxPlayers, 
          withBot: false,
          name: roomName,
          isPrivate: isPrivate,
          password: isPrivate ? password : undefined
        });
        onClose();
        setRoomName('');
        setIsPrivate(false);
        setPassword('');
        router.push(`/game/${result.sessionId}`);
      }
    } catch (error) {
      console.error('Create game error:', error);
      alert('Ошибка создания игры: ' + (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#101528',
        borderRadius: '24px',
        padding: '32px',
        width: '450px',
        border: '1px solid #1f2540'
      }}>
        <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Создание игры</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#cfd3ff' }}>Режим игры</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setGameMode('multiplayer')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                background: gameMode === 'multiplayer' ? 'linear-gradient(135deg, #6a5cff, #4f8cff)' : '#1a1f33',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              👥 С игроками
            </button>
            <button
              onClick={() => setGameMode('bot')}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                background: gameMode === 'bot' ? 'linear-gradient(135deg, #6a5cff, #4f8cff)' : '#1a1f33',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              🤖 С ботом
            </button>
          </div>
        </div>

        {gameMode === 'multiplayer' && (
          <>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#cfd3ff' }}>Название комнаты</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Введите название"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#0b0f1a',
                  border: '1px solid #2a2f45',
                  color: 'white'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#cfd3ff' }}>Количество игроков</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setMaxPlayers(num)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      background: maxPlayers === num ? 'linear-gradient(135deg, #6a5cff, #4f8cff)' : '#1a1f33',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    {num} игрока
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                <span style={{ color: 'white' }}>Приватная комната</span>
              </label>
            </div>

            {isPrivate && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#cfd3ff' }}>Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Введите пароль"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    background: '#0b0f1a',
                    border: '1px solid #2a2f45',
                    color: 'white'
                  }}
                />
              </div>
            )}
          </>
        )}

        {gameMode === 'bot' && (
          <div style={{ marginBottom: '20px', padding: '16px', background: '#1a1f33', borderRadius: '12px' }}>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              🤖 Игра с ботом начнется сразу. Комната не будет создана.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            onClick={handleSubmit}
            disabled={isCreating}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6a5cff, #4f8cff)',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              cursor: isCreating ? 'not-allowed' : 'pointer',
              opacity: isCreating ? 0.6 : 1
            }}
          >
            {isCreating ? 'Создание...' : (gameMode === 'bot' ? 'Играть с ботом' : 'Создать комнату')}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: 'transparent',
              border: '1px solid #2a2f45',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}