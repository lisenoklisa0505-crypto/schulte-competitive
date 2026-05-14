'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';

export default function HistoryPage() {
  const { data: session } = useSession();
  const { data: historyData, isLoading } = trpc.game.getMatchHistory.useQuery(undefined, {
    enabled: !!session,
  });

  const [matches, setMatches] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    wins: 0,
    losses: 0,
    bestTime: 0,
  });

  useEffect(() => {
    if (historyData && Array.isArray(historyData)) {
      setMatches(historyData);
      
      const wins = historyData.filter((m: any) => m.winnerId === session?.user?.id).length;
      const losses = historyData.length - wins;
      const bestTime = Math.min(...historyData.map((m: any) => m.duration || Infinity), Infinity);
      
      setStats({
        total: historyData.length,
        wins,
        losses,
        bestTime: bestTime === Infinity ? 0 : bestTime,
      });
    }
  }, [historyData, session?.user?.id]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s} сек`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                <Stat label="Матчи" value={stats.total} />
                <Stat label="Победы" value={stats.wins} />
                <Stat label="Поражения" value={stats.losses} />
                <Stat label="Лучшее" value={formatDuration(stats.bestTime)} />
              </div>
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
          grid-template-columns: 170px 1fr 120px 100px 100px;
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
      `}</style>
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