'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';

interface Player {
  id: string;
  username: string;
  wins: number;
  bestTime: number;
}

export default function RatingPage() {
  const { data: session } = useSession();
  const { data: leaderboard, refetch } = trpc.game.getLeaderboard.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 5000,
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (leaderboard && Array.isArray(leaderboard)) {
      setPlayers(leaderboard);
      setIsLoading(false);
    }
  }, [leaderboard]);

  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} мин ${secs} сек`;
    return `${secs} сек`;
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  if (isLoading) {
    return (
      <div className="rating-page">
        <Header />
        <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
          <p style={{ color: '#9ca3af' }}>Загрузка рейтинга...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rating-page">
      <Header />
      
      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px', color: 'white' }}>Рейтинг игроков</h1>
        <p style={{ color: '#9ca3af', marginBottom: '32px' }}>Соревнуйтесь и поднимайтесь в таблице лидеров</p>

        <div style={{ 
          background: '#101528', 
          borderRadius: '20px', 
          overflow: 'hidden', 
          border: '1px solid #1f2540',
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '80px 1fr 100px 120px', 
            padding: '16px 20px', 
            background: '#1a1f33', 
            color: '#9ca3af', 
            fontSize: '14px', 
            fontWeight: '500' 
          }}>
            <div>Место</div>
            <div>Игрок</div>
            <div>Победы</div>
            <div>Лучшее время</div>
          </div>
          
          {players.map((player, index) => {
            const isCurrentUser = session?.user?.id === player.id;
            const displayName = player.username || 'Игрок';
            
            return (
              <div 
                key={player.id} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '80px 1fr 100px 120px', 
                  padding: '16px 20px', 
                  alignItems: 'center', 
                  borderTop: '1px solid #1f2540',
                  background: isCurrentUser ? 'rgba(106, 92, 255, 0.1)' : 'transparent',
                }}
              >
                <div style={{ fontWeight: 'bold', color: index < 3 ? '#fbbf24' : 'white' }}>
                  {getMedal(index)}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #6a5cff, #4f8cff)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: 'white'
                  }}>
                    {displayName[0]?.toUpperCase()}
                  </div>
                  <span style={{ color: 'white' }}>{displayName}</span>
                  {isCurrentUser && <span style={{ fontSize: '11px', padding: '2px 8px', background: '#6a5cff', borderRadius: '20px' }}>Вы</span>}
                </div>
                
                <div style={{ color: '#10b981', fontWeight: 'bold' }}>{player.wins}</div>
                <div style={{ color: '#fbbf24' }}>{formatTime(player.bestTime)}</div>
              </div>
            );
          })}

          {players.length === 0 && (
            <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
              Нет игроков в рейтинге
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .rating-page {
          min-height: 100vh;
          background: #0b0f1a;
        }
      `}</style>
    </div>
  );
}