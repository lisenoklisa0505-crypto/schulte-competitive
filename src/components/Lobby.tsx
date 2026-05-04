'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';
import { useState } from 'react';

export default function LobbyPage() {
  const router = useRouter();
  const { data: user } = trpc.auth.me.useQuery();
  const [gameCode, setGameCode] = useState('');
  const [withBot, setWithBot] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const createGame = trpc.game.createGame.useMutation();
  const startBotGame = trpc.game.startBotGame.useMutation();

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      let result;
      if (withBot) {
        result = await startBotGame.mutateAsync();
      } else {
        result = await createGame.mutateAsync({ maxPlayers: 4, withBot: false });
      }
      router.push(`/game/${result.sessionId}`);
    } catch (error) {
      console.error('Create game error:', error);
      alert('Ошибка создания игры');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGame = () => {
    if (gameCode) {
      router.push(`/game/${gameCode}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f1a' }}>
      <Header />
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 24px' }}>
        <div style={{ background: '#101528', borderRadius: '20px', padding: '48px', textAlign: 'center', border: '1px solid #1f2540' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>
            Добро пожаловать, <span style={{ color: '#6a5cff' }}>{user?.username}</span>!
          </h1>
          <p style={{ color: '#a78bfa', fontSize: '18px', marginBottom: '32px' }}>⭐ Рейтинг: {user?.rating}</p>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={withBot} onChange={(e) => setWithBot(e.target.checked)} style={{ width: '18px', height: '18px' }} />
              <span style={{ color: 'white' }}>🤖 Игра с ботом</span>
            </label>
          </div>
          
          <button 
            onClick={handleCreateGame} 
            disabled={isCreating}
            style={{ 
              width: '100%', 
              padding: '14px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, #6a5cff, #4f8cff)', 
              border: 'none', 
              color: 'white', 
              cursor: isCreating ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold', 
              fontSize: '16px', 
              marginBottom: '16px',
              opacity: isCreating ? 0.6 : 1
            }}
          >
            {isCreating ? 'Создание...' : '🎮 Создать игру'}
          </button>
          
          <div style={{ borderTop: '1px solid #1f2540', paddingTop: '24px', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="Введите код комнаты"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#1a1f33', border: '1px solid #374151', color: 'white', marginBottom: '12px' }}
            />
            <button 
              onClick={handleJoinGame} 
              disabled={!gameCode}
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '12px', 
                background: '#1f2937', 
                border: '1px solid #374151', 
                color: 'white', 
                cursor: gameCode ? 'pointer' : 'not-allowed', 
                opacity: gameCode ? 1 : 0.5 
              }}
            >
              🔗 Присоединиться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}