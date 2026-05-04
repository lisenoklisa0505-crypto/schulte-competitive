'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';

interface Player {
  id: number;
  username: string;
  wins: number;
  bestTime: number;
}

export default function RatingPage() {
  const { data: user } = trpc.auth.me.useQuery();
  const { data: leaderboardData } = trpc.game.getLeaderboard.useQuery();
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (leaderboardData && Array.isArray(leaderboardData)) {
      const sorted = [...leaderboardData]
        .map((p: any) => ({
          id: p.id,
          username: p.username,
          wins: p.wins ?? 0,
          bestTime: p.bestTime ?? 0,
        }))
        .sort((a, b) => (b.wins || 0) - (a.wins || 0));
      setPlayers(sorted);
    }
  }, [leaderboardData]);

  const formatTime = (seconds: number) => {
    if (!seconds || seconds === 0) return '—';
    return `${seconds.toFixed(1)} сек`;
  };

  const getMedal = (index: number) => {
    if (index === 0) return '👑';
    if (index === 1) return '👑';
    if (index === 2) return '👑';
    return `${index + 1}`;
  };

  const getRankColor = (index: number) => {
    if (index === 0) return '#ffd700';
    if (index === 1) return '#c0c0c0';
    if (index === 2) return '#cd7f32';
    return 'white';
  };

  if (!user) {
    return (
      <div className="rating-page">
        <Header />
        <div style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p style={{ color: '#9ca3af' }}>Загрузка...</p>
        </div>

        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="rating-page">
      <Header />
      
      <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Рейтинг игроков</h1>
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
            const isCurrentUser = user?.id === player.id;
            
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
                  color: getRankColor(index)
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
                    {player.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '600', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {player.username}
                      {isCurrentUser && (
                        <span style={{ 
                          fontSize: '12px', 
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
                    {player.wins || 0}
                  </span>
                </div>
                
                <div>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '16px' }}>
                    {formatTime(player.bestTime)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
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
`;