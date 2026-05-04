'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';

interface Props {
  user?: {
    id: number;
    username: string;
    rating: number;
  };
  onLoginClick?: () => void;
  onPlayClick?: () => void;
  onLogout?: () => void;
}

export default function MainLayout({ user, onLoginClick, onPlayClick, onLogout }: Props) {
  const router = useRouter();
  const [stats] = useState({
    activePlayers: 1247,
    totalMatches: 5421,
    winsToday: 892,
    bestTime: 15.3
  });

  const previewTable = [
    [1, 14, 7, 22, 9],
    [18, 3, 25, 11, 16],
    [6, 20, 13, 2, 24],
    [10, 15, 4, 19, 8],
    [21, 12, 17, 5, 23]
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0b0f1a' }}>
      <Header />
      
      <main style={{ maxWidth: '1200px', margin: '60px auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
          <div>
            <div style={{ background: '#1a1f33', display: 'inline-block', padding: '6px 12px', borderRadius: '20px', marginBottom: '20px', fontSize: '14px' }}>🧠 Когнитивный тренажёр</div>
            <h1 style={{ fontSize: '48px', marginBottom: '16px', color: 'white' }}>Таблицы <span style={{ color: '#6a5cff' }}>Шульте</span></h1>
            <p style={{ fontSize: '20px', color: '#d1d5db', marginBottom: '16px' }}>Соревнуйтесь. Тренируйте мозг.</p>
            <p style={{ color: '#9ca3af', marginBottom: '32px', lineHeight: 1.6 }}>Находите числа по порядку быстрее соперников. Одинаковое поле для всех — побеждает самый внимательный!</p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={onPlayClick} style={{ padding: '12px 28px', borderRadius: '12px', background: 'linear-gradient(135deg, #6a5cff, #4f8cff)', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>🔵 Новая игра</button>
            </div>
          </div>
          
          <div style={{ background: '#101528', padding: '24px', borderRadius: '20px', boxShadow: '0 0 30px rgba(79,140,255,0.2)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {previewTable.map((row, i) => row.map((num, j) => (
                <div key={`${i}-${j}`} style={{ aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: num === 1 ? '#6a5cff' : num === 2 ? '#f59e0b' : num === 6 ? '#10b981' : '#1a1f33', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', color: 'white', border: '1px solid #2a2f45' }}>{num}</div>
              )))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginTop: '80px' }}>
          {[
            { icon: '👥', title: 'Мультиплеер', desc: 'Играйте с 2–4 игроками в реальном времени' },
            { icon: '🤖', title: 'Игра с ботом', desc: 'Тренируйтесь против бота' },
            { icon: '🏆', title: 'Рейтинг', desc: 'Соревнуйтесь и поднимайтесь в таблице лидеров' },
            { icon: '📊', title: 'История матчей', desc: 'Смотрите свою статистику и результаты игр' }
          ].map((f, i) => (
            <div key={i} onClick={() => router.push(i === 2 ? '/rating' : i === 3 ? '/history' : '/lobby')} style={{ background: '#101528', padding: '24px', borderRadius: '20px', border: '1px solid #1f2540', cursor: 'pointer', transition: '0.3s' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ color: '#9ca3af', fontSize: '14px' }}>{f.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '80px', background: '#101528', padding: '40px', borderRadius: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', textAlign: 'center' }}>
          <div><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#a78bfa' }}>{stats.activePlayers}</div><div style={{ color: '#9ca3af' }}>Активных игроков</div></div>
          <div><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#60a5fa' }}>{stats.totalMatches}</div><div style={{ color: '#9ca3af' }}>Сыграно матчей</div></div>
          <div><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#34d399' }}>{stats.winsToday}</div><div style={{ color: '#9ca3af' }}>Побед сегодня</div></div>
          <div><div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>{stats.bestTime} сек</div><div style={{ color: '#9ca3af' }}>Лучшее время дня</div></div>
        </div>
      </main>
    </div>
  );
}