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
    let secs = seconds;
    if (seconds > 60) {
      secs = Math.floor(seconds / 1000);
    }
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) return `${mins} мин ${remainingSecs} сек`;
    return `${secs} сек`;
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return '#ffd700';
    if (index === 1) return '#c0c0c0';
    if (index === 2) return '#cd7f32';
    return 'white';
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
          boxShadow: '0 0 30px rgba(79,140,255,0.2)'
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
            <div>🏆 Победы</div>
            <div>⚡ Лучшее время</div>
          </div>
          
          {players.map((player, index) => {
            const isCurrentUser = session?.user?.id === player.id;
            const displayName = player.username || 'Игрок';
            const wins = player.wins || 0;
            const bestTime = player.bestTime || 0;
            
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
                  borderLeft: isCurrentUser ? '3px solid #6a5cff' : 'none'
                }}
              >
                <div style={{ 
                  fontSize: index < 3 ? '28px' : '18px', 
                  fontWeight: 'bold', 
                  color: getRankColor(index),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {getMedal(index)}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #6a5cff, #4f8cff)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: 'white'
                  }}>
                    {displayName[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '600', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', color: 'white' }}>
                      {displayName}
                      {isCurrentUser && (
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 10px', 
                          background: '#6a5cff', 
                          borderRadius: '20px', 
                          color: 'white' 
                        }}>
                          Вы
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>
                    {wins}
                  </span>
                </div>
                
                <div>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '16px' }}>
                    {formatTime(bestTime)}
                  </span>
                </div>
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
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at 20% 20%, #1a1f33, transparent 40%),
                      radial-gradient(circle at 80% 30%, #2a2f45, transparent 40%),
                      #0b0f1a;
        }
        .rating-page::before {
          content: "";
          position: absolute;
          width: 200%;
          height: 200%;
          background-image: radial-gradient(white 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.05;
          animation: starsMove 60s linear infinite;
        }
        @keyframes starsMove {
          from { transform: translate(0, 0); }
          to { transform: translate(-200px, -200px); }
        }
      `}</style>
    </div>
  );
}