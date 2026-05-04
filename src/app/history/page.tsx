'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';

export default function HistoryPage() {
  const { data: user, refetch } = trpc.auth.me.useQuery();
  const { data: historyData, refetch: refetchHistory } =
    trpc.game.getMatchHistory.useQuery();
  const { data: leaderboardData, refetch: refetchLeaderboard } =
    trpc.game.getLeaderboard.useQuery();

  const [matches, setMatches] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    wins: 0,
    losses: 0,
    bestTime: 0,
  });

  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [userRank, setUserRank] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      refetchHistory();
      refetchLeaderboard();
    }, 3000);

    return () => clearInterval(interval);
  }, [refetch, refetchHistory, refetchLeaderboard]);

  useEffect(() => {
    if (!historyData || !user) return;

    setMatches(historyData);

    const userMatches = historyData.filter((m: any) =>
      m.players?.some((p: any) => p.id === user.id)
    );

    const wins = userMatches.filter(
      (m: any) => m.winnerId === user.id
    ).length;

    const losses = userMatches.length - wins;

    const bestTimeRaw = Math.min(
      ...userMatches
        .filter((m: any) => m.winnerId === user.id)
        .map((m: any) => m.duration),
      Infinity
    );

    setStats({
      total: userMatches.length,
      wins,
      losses,
      bestTime: bestTimeRaw === Infinity ? 0 : bestTimeRaw,
    });
  }, [historyData, user]);

  useEffect(() => {
    if (!leaderboardData || !user) return;

    const sorted = [...leaderboardData].sort(
      (a, b) => (b.wins || 0) - (a.wins || 0)
    );

    setTopPlayers(sorted.slice(0, 3));
    setUserRank(sorted.findIndex((p) => p.id === user.id) + 1);
  }, [leaderboardData, user]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isWin = (match: any) => match.winnerId === user?.id;

  if (!user) {
    return (
      <div className="page">
        <Header />
        <div className="container">Загрузка...</div>
        <style jsx>{styles}</style>
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
          {/* TABLE */}
          <div className="table">
            <div className="head">
              <span>Дата</span>
              <span>Противник</span>
              <span>Результат</span>
              <span>Прогресс</span>
              <span>Время</span>
            </div>

            {matches.map((m) => {
              const win = isWin(m);

              return (
                <div key={m.id} className={`row ${win ? 'win' : ''}`}>
                  <span>{formatDate(m.createdAt)}</span>
                  <span>
                    {m.players?.find((p: any) => p.id !== user?.id)
                      ?.username || 'Бот'}
                  </span>
                  <span className={win ? 'winText' : 'loseText'}>
                    {win ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}
                  </span>
                  <span>
                    {m.players?.find((p: any) => p.id === user?.id)
                      ?.progress || 0}
                    /25
                  </span>
                  <span>{formatDuration(m.duration)}</span>
                </div>
              );
            })}

            {!matches.length && (
              <div className="empty">Нет матчей</div>
            )}
          </div>

          {/* SIDE */}
          <div className="side">
            <div className="card">
              <h3>Статистика</h3>

              <div className="grid">
                <Stat label="Матчи" value={stats.total} />
                <Stat label="Победы" value={stats.wins} />
                <Stat label="Поражения" value={stats.losses} />
                <Stat label="Лучшее" value={formatDuration(stats.bestTime)} />
              </div>
            </div>

            <div className="card">
              <h3>Топ игроков</h3>

              {topPlayers.map((p, i) => (
                <div key={p.id} className="player">
                  <span className="medal">👑</span>
                  <span>{p.username}</span>
                  <span className="wins">{p.wins}</span>
                </div>
              ))}

              <div className="me">
                <span>#{userRank}</span>
                <span>{user.username}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{styles}</style>
    </div>
  );
}

function Stat({ label, value }: any) {
  return (
    <div className="stat">
      <div className="v">{value}</div>
      <div className="l">{label}</div>
    </div>
  );
}

const styles = `
.page {
  min-height: 100vh;
  background: radial-gradient(circle at 20% 20%, #1a1f33, transparent 40%),
              radial-gradient(circle at 80% 30%, #2a2f45, transparent 40%),
              #0b0f1a;
  color: white;
  position: relative;
  overflow: hidden;
}

.page::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px);
  background-size: 42px 42px;
  opacity: 0.06;
  pointer-events: none;
}

.container {
  max-width: 1300px;
  margin: 40px auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
}

h1 {
  font-size: 32px;
  margin-bottom: 6px;
}

.sub {
  color: #9ca3af;
  margin-bottom: 30px;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
}

/* TABLE */
.table {
  background: #101528;
  border-radius: 18px;
  border: 1px solid #1f2540;
  overflow: hidden;
}

.head,
.row {
  display: grid;
  grid-template-columns: 170px 1fr 120px 100px 100px;
  padding: 14px 18px;
  align-items: center;
}

.head {
  background: #1a1f33;
  font-size: 12px;
  color: #9ca3af;
}

.row {
  border-top: 1px solid #1f2540;
  font-size: 13px;
}

.row.win {
  background: rgba(16,185,129,0.06);
}

.winText {
  color: #10b981;
  font-weight: 600;
}

.loseText {
  color: #ef4444;
  font-weight: 600;
}

.empty {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
}

/* SIDE */
.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card {
  background: #101528;
  border: 1px solid #1f2540;
  border-radius: 18px;
  padding: 16px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stat {
  background: #1a1f33;
  padding: 12px;
  border-radius: 12px;
  text-align: center;
}

.stat .v {
  font-size: 20px;
  font-weight: 700;
}

.stat .l {
  font-size: 11px;
  color: #9ca3af;
}

.player {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #1a1f33;
  border-radius: 10px;
  margin-bottom: 8px;
}

.medal {
  color: #ffd700;
}

.wins {
  color: #a78bfa;
}

.me {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid #6a5cff;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  background: rgba(106,92,255,0.08);
}
`;