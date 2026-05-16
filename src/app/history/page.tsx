'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';

interface LeaderboardPlayer {
  id: string;
  username: string;
  wins: number;
  bestTime: number;
}

export default function HistoryPage() {
  const { data: session } = useSession();
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = trpc.game.getMatchHistory.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 5000, // Обновляем историю каждые 5 секунд
  });
  const { data: leaderboard, isLoading: leaderboardLoading, refetch: refetchLeaderboard } = trpc.game.getLeaderboard.useQuery(undefined, {
    enabled: !!session,
    refetchInterval: 5000, // Обновляем рейтинг каждые 5 секунд (синхронизация!)
  });

  const [matches, setMatches] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    wins: 0,
    losses: 0,
    bestTime: 0,
  });
  const [topPlayers, setTopPlayers] = useState<LeaderboardPlayer[]>([]);
  const [userRank, setUserRank] = useState<{ position: number; wins: number; username: string } | null>(null);
  const [isUserInTop, setIsUserInTop] = useState(false);

  // История матчей
  useEffect(() => {
    if (historyData && Array.isArray(historyData)) {
      setMatches(historyData);
      
      const wins = historyData.filter((m: any) => m.winnerId === session?.user?.id).length;
      const losses = historyData.length - wins;
      const validTimes = historyData.filter((m: any) => m.duration && m.duration > 0).map((m: any) => m.duration);
      const bestTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;
      
      setStats({ total: historyData.length, wins, losses, bestTime });
    }
  }, [historyData, session?.user?.id]);

  // Мини-рейтинг (синхронизируется с основным)
  useEffect(() => {
    if (leaderboard && Array.isArray(leaderboard) && session?.user) {
      // Топ-3 игрока
      const top3 = leaderboard.slice(0, 3);
      setTopPlayers(top3);
      
      // Проверяем, входит ли пользователь в топ-3
      const userInTop3 = top3.some((p: any) => p.id === session.user.id);
      setIsUserInTop(userInTop3);
      
      // Находим место пользователя в общем рейтинге
      const userIndex = leaderboard.findIndex((p: any) => p.id === session.user.id);
      if (userIndex !== -1) {
        setUserRank({
          position: userIndex + 1,
          wins: leaderboard[userIndex].wins,
          username: leaderboard[userIndex].username || 'Вы',
        });
      } else {
        setUserRank({
          position: leaderboard.length + 1,
          wins: 0,
          username: 'Вы',
        });
      }
    }
  }, [leaderboard, session?.user]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins} мин ${secs} сек`;
    return `${secs} сек`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMedal = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}`;
  };

  if (historyLoading || leaderboardLoading) {
    return (
      <div className="page">
        <Header />
        <div className="container">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header />

      <div className="container">
        <h1>История матчей</h1>
        <p className="sub">Все твои игры и результаты</p>

        {/* Статистика */}
        <div className="stats-cards">
          <div className="stat-card"><div className="value">{stats.total}</div><div className="label">Матчи</div></div>
          <div className="stat-card"><div className="value">{stats.wins}</div><div className="label">Победы</div></div>
          <div className="stat-card"><div className="value">{stats.losses}</div><div className="label">Поражения</div></div>
          <div className="stat-card"><div className="value">{formatDuration(stats.bestTime)}</div><div className="label">Лучшее время</div></div>
        </div>

        <div className="two-columns">
          {/* Таблица с историей матчей */}
          <div className="table">
            <div className="head">
              <span>Дата</span>
              <span>Противник</span>
              <span>Результат</span>
              <span>Прогресс</span>
              <span>Время</span>
            </div>

            {matches.map((m) => {
              const isWin = m.winnerId === session?.user?.id;
              const opponent = m.players?.find((p: any) => p.id !== session?.user?.id);
              
              return (
                <div key={m.id} className={`row ${isWin ? 'win' : ''}`}>
                  <span>{formatDate(m.createdAt)}</span>
                  <span>{opponent?.username || 'Бот'}</span>
                  <span className={isWin ? 'winText' : 'loseText'}>{isWin ? 'Победа' : 'Поражение'}</span>
                  <span>{m.players?.find((p: any) => p.id === session?.user?.id)?.progress || 0}/25</span>
                  <span>{formatDuration(m.duration)}</span>
                </div>
              );
            })}

            {matches.length === 0 && <div className="empty">Нет сыгранных матчей</div>}
          </div>

          {/* Мини-рейтинг (топ-3 + место пользователя) */}
          <div className="mini-rating">
            <h3>🏆 Топ игроков</h3>
            
            <div className="top-list">
              {topPlayers.map((player, idx) => {
                const isCurrentUser = player.id === session?.user?.id;
                return (
                  <div key={player.id} className={`top-item ${isCurrentUser ? 'current' : ''}`}>
                    <span className="medal">{getMedal(idx)}</span>
                    <span className="name">{player.username || 'Игрок'}</span>
                    <span className="wins">{player.wins} 🏆</span>
                  </div>
                );
              })}
            </div>
            
            {!isUserInTop && userRank && (
              <div className="user-rank">
                <div className="rank-line">
                  <span className="rank-position">#{userRank.position}</span>
                  <span className="rank-name">{userRank.username}</span>
                  <span className="rank-wins">{userRank.wins} 🏆</span>
                </div>
              </div>
            )}
            
            {isUserInTop && userRank && (
              <div className="user-in-top-note">
                <span>📌 Ваше место — #{userRank.position}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #0b0f1a;
          color: white;
        }
        .container { max-width: 1300px; margin: 40px auto; padding: 0 24px; }
        h1 { font-size: 32px; margin-bottom: 6px; }
        .sub { color: #9ca3af; margin-bottom: 30px; }
        
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: #101528;
          border: 1px solid #1f2540;
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }
        .stat-card .value { font-size: 28px; font-weight: bold; color: #a78bfa; }
        .stat-card .label { font-size: 13px; color: #9ca3af; margin-top: 6px; }
        
        .two-columns {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 24px;
        }
        
        .table {
          background: #101528;
          border-radius: 18px;
          border: 1px solid #1f2540;
          overflow: hidden;
        }
        .head, .row {
          display: grid;
          grid-template-columns: 150px 1fr 90px 80px 90px;
          padding: 14px 18px;
          align-items: center;
        }
        .head { background: #1a1f33; font-size: 12px; color: #9ca3af; }
        .row { border-top: 1px solid #1f2540; font-size: 13px; }
        .row.win { background: rgba(16,185,129,0.05); }
        .winText { color: #10b981; font-weight: 600; }
        .loseText { color: #ef4444; font-weight: 600; }
        .empty { padding: 60px; text-align: center; color: #9ca3af; }
        
        .mini-rating {
          background: #101528;
          border: 1px solid #1f2540;
          border-radius: 18px;
          padding: 18px;
          height: fit-content;
        }
        .mini-rating h3 {
          font-size: 18px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #1f2540;
        }
        .top-list { margin-bottom: 16px; }
        .top-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #1f2540;
        }
        .top-item:last-child { border-bottom: none; }
        .top-item.current {
          background: rgba(106,92,255,0.15);
          margin: 0 -8px;
          padding: 10px 8px;
          border-radius: 10px;
        }
        .medal { font-size: 22px; width: 40px; }
        .name { flex: 1; font-size: 14px; color: white; }
        .wins { color: #fbbf24; font-size: 13px; font-weight: bold; }
        
        .user-rank {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #6a5cff;
          background: rgba(106,92,255,0.08);
          border-radius: 12px;
          padding: 12px;
        }
        .rank-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .rank-position { color: #6a5cff; font-weight: bold; font-size: 16px; }
        .rank-name { color: white; font-size: 14px; flex: 1; margin-left: 12px; }
        .rank-wins { color: #fbbf24; font-size: 13px; font-weight: bold; }
        
        .user-in-top-note {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #6a5cff;
          text-align: center;
          padding: 12px;
          color: #a78bfa;
          font-size: 13px;
        }
        
        @media (max-width: 900px) {
          .two-columns { grid-template-columns: 1fr; }
          .head, .row { grid-template-columns: 130px 1fr 80px 70px 80px; font-size: 11px; }
          .stats-cards { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}