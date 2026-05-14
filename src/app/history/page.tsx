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
  const { data: historyData, isLoading } = trpc.game.getMatchHistory.useQuery(undefined, {
    enabled: !!session,
  });
  const { data: leaderboard } = trpc.game.getLeaderboard.useQuery(undefined, {
    enabled: !!session,
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

  useEffect(() => {
    if (historyData && Array.isArray(historyData)) {
      setMatches(historyData);
      
      const wins = historyData.filter((m: any) => m.winnerId === session?.user?.id).length;
      const losses = historyData.length - wins;
      const validTimes = historyData.filter((m: any) => m.duration && m.duration > 0).map((m: any) => m.duration);
      const bestTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;
      
      setStats({
        total: historyData.length,
        wins,
        losses,
        bestTime,
      });
    }
  }, [historyData, session?.user?.id]);

  useEffect(() => {
    if (leaderboard && Array.isArray(leaderboard) && session?.user) {
      const top3 = leaderboard.slice(0, 3);
      setTopPlayers(top3);
      
      const userInTop3 = top3.some((p: any) => p.id === session.user.id);
      setIsUserInTop(userInTop3);
      
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
    if (!dateStr) return '—';
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

  if (isLoading) {
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

        <div className="layout">
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
                  <span className={isWin ? 'winText' : 'loseText'}>
                    {isWin ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
                  </span>
                  <span>{m.players?.find((p: any) => p.id === session?.user?.id)?.progress || 0}/25</span>
                  <span>{formatDuration(m.duration)}</span>
                </div>
              );
            })}

            {matches.length === 0 && (
              <div className="empty">Нет сыгранных матчей</div>
            )}
          </div>

          <div className="side">
            <div className="card">
              <h3>Статистика</h3>
              <div className="grid">
                <div className="stat">
                  <div className="v">{stats.total}</div>
                  <div className="l">Матчи</div>
                </div>
                <div className="stat">
                  <div className="v">{stats.wins}</div>
                  <div className="l">Победы</div>
                </div>
                <div className="stat">
                  <div className="v">{stats.losses}</div>
                  <div className="l">Поражения</div>
                </div>
                <div className="stat">
                  <div className="v">{formatDuration(stats.bestTime)}</div>
                  <div className="l">Лучшее</div>
                </div>
              </div>
            </div>

            <div className="card rating-card">
              <h3>🏆 Рейтинг игроков</h3>
              
              <div className="top-players">
                {topPlayers.map((player, idx) => {
                  const isCurrentUser = player.id === session?.user?.id;
                  return (
                    <div key={player.id} className={`top-player ${isCurrentUser ? 'current-user' : ''}`}>
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
                    <span className="medal">#{userRank.position}</span>
                    <span className="name">{userRank.username}</span>
                    <span className="wins">{userRank.wins} 🏆</span>
                  </div>
                </div>
              )}
              
              {isUserInTop && userRank && (
                <div className="user-in-top">
                  <div className="rank-line">
                    <span>📌 Ваше место</span>
                    <span className="rank-number">#{userRank.position}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 20%, #1a1f33, transparent 40%),
                      radial-gradient(circle at 80% 30%, #2a2f45, transparent 40%),
                      #0b0f1a;
          color: white;
        }
        .container { max-width: 1300px; margin: 40px auto; padding: 0 24px; }
        h1 { font-size: 32px; margin-bottom: 6px; }
        .sub { color: #9ca3af; margin-bottom: 30px; }
        .layout { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
        .table { background: #101528; border-radius: 18px; border: 1px solid #1f2540; overflow: hidden; }
        .head, .row {
          display: grid;
          grid-template-columns: 150px 1fr 100px 80px 80px;
          padding: 14px 18px;
          align-items: center;
        }
        .head { background: #1a1f33; font-size: 12px; color: #9ca3af; }
        .row { border-top: 1px solid #1f2540; font-size: 13px; }
        .row.win { background: rgba(16,185,129,0.06); }
        .winText { color: #10b981; font-weight: 600; }
        .loseText { color: #ef4444; font-weight: 600; }
        .empty { padding: 40px; text-align: center; color: #9ca3af; }
        .side { display: flex; flex-direction: column; gap: 16px; }
        .card { background: #101528; border: 1px solid #1f2540; border-radius: 18px; padding: 16px; }
        .card h3 { margin-bottom: 16px; font-size: 18px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .stat { background: #1a1f33; padding: 12px; border-radius: 12px; text-align: center; }
        .stat .v { font-size: 20px; font-weight: 700; }
        .stat .l { font-size: 11px; color: #9ca3af; }
        
        .top-players { margin-bottom: 12px; }
        .top-player {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #1f2540;
        }
        .top-player:last-child { border-bottom: none; }
        .top-player.current-user {
          background: rgba(106,92,255,0.15);
          margin: 0 -8px;
          padding: 10px 8px;
          border-radius: 10px;
        }
        .medal { font-size: 20px; width: 36px; font-weight: bold; }
        .name { flex: 1; font-size: 14px; color: white; }
        .wins { color: #fbbf24; font-weight: bold; font-size: 14px; }
        
        .user-rank {
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px solid #6a5cff;
          background: rgba(106,92,255,0.08);
          border-radius: 12px;
          padding: 12px;
        }
        .user-in-top {
          margin-top: 8px;
          padding-top: 12px;
          border-top: 1px solid #6a5cff;
          text-align: center;
          padding: 12px;
        }
        .rank-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }
        .rank-number { color: #6a5cff; font-weight: bold; font-size: 16px; }
      `}</style>
    </div>
  );
}