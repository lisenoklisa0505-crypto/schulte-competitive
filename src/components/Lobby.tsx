'use client';

import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';
import Header from '@/components/Header';
import { useState } from 'react';

export default function LobbyPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [gameCode, setGameCode] = useState('');
  const [withBot, setWithBot] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Гость';

  const handleCreateGame = async () => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withBot, maxPlayers: 4 }),
      });
      const data = await response.json();
      if (data.sessionId) {
        router.push(`/game/${data.sessionId}`);
      } else {
        alert('Ошибка создания игры');
      }
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
          <h1 style={{ fontSize: '28px', marginBottom: '16px', color: 'white' }}>
            Добро пожаловать, <span style={{ color: '#6a5cff' }}>{userName}</span>!
          </h1>
          
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