'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { trpc } from '@/trpc/client';
import { useState } from 'react';
import CreateGameModal from '@/components/CreateGameModal';

export default function Home() {
  const router = useRouter();
  const { data: user } = trpc.auth.me.useQuery();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const previewTable = [
    [1, 14, 7, 22, 9],
    [18, 3, 25, 11, 16],
    [6, 20, 13, 2, 24],
    [10, 15, 4, 19, 8],
    [21, 12, 17, 5, 23]
  ];

  const handlePlay = () => {
    if (user) {
      setShowCreateModal(true);
    } else {
      router.push('/login');
    }
  };

  return (
    <>
      <CreateGameModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      
      <div className="page">
        <Header />

        <div className="container">
          <div className="hero">
            <div className="left">
              <div className="badge">🧠 Когнитивный тренажёр</div>
              <h1>Таблицы <span>Шульте</span></h1>
              <p className="subtitle">Соревнуйтесь. Тренируйте мозг.</p>
              <p className="desc">Находите числа по порядку быстрее соперников. Одинаковое поле для всех — побеждает самый внимательный!</p>
              <div className="buttons">
                <button className="primary" onClick={handlePlay}>🔵 Новая игра</button>
                <button className="secondary" onClick={handlePlay}>⚙️ Игра с ботом</button>
              </div>
            </div>

            <div className="grid-box">
              <div className="grid">
                {previewTable.flat().map((num, i) => (
                  <div key={i} className={`cell ${num === 1 ? 'purple' : num === 2 ? 'orange' : num === 6 ? 'green' : ''}`} style={{ animationDelay: `${i * 0.05}s` }}>{num}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="features">
            {[
              { icon: '👥', title: 'Мультиплеер', desc: 'Играйте в реальном времени', action: handlePlay },
              { icon: '🤖', title: 'Бот', desc: 'Тренируйтесь против ИИ', action: handlePlay },
              { icon: '🏆', title: 'Рейтинг', desc: 'Поднимайтесь в топ', path: '/rating' },
              { icon: '📊', title: 'История', desc: 'Смотрите результаты', path: '/history' }
            ].map((f, i) => (
              <div key={i} className="card" onClick={() => f.action ? f.action() : router.push(f.path)} style={{ cursor: 'pointer' }}>
                <div className="icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="stats">
            {[
              ['1247', 'Игроков'],
              ['5421', 'Матчей'],
              ['892', 'Побед'],
              ['15.3с', 'Рекорд']
            ].map((s, i) => (
              <div key={i} className="stat">
                <h2>{s[0]}</h2>
                <p>{s[1]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 20%, #1a1f33, transparent 40%),
                      radial-gradient(circle at 80% 30%, #2a2f45, transparent 40%),
                      #0b0f1a;
          position: relative;
          overflow: hidden;
        }
        .page::before {
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
        .container {
          max-width: 1400px;
          margin: 60px auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }
        .hero {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 20px;
          align-items: center;
        }
        .badge {
          background: #1a1f33;
          padding: 6px 12px;
          border-radius: 20px;
          display: inline-block;
          margin-bottom: 15px;
        }
        h1 { font-size: 72px; line-height: 1.05; font-weight: 800; margin-bottom: 10px; }
        h1 span { color: #6a5cff; }
        .subtitle { font-size: 26px; margin-bottom: 10px; color: #d1d5db; }
        .desc { font-size: 17px; line-height: 1.6; color: #9ca3af; margin-bottom: 30px; max-width: 700px; }
        .buttons { display: flex; gap: 14px; }
        .primary {
          padding: 16px 36px;
          border-radius: 14px;
          background: linear-gradient(135deg, #6a5cff, #4f8cff);
          border: none;
          color: white;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(106,92,255,0.6);
          transition: all 0.2s;
        }
        .primary:hover { transform: translateY(-2px); box-shadow: 0 0 25px rgba(106,92,255,0.8); }
        .secondary {
          padding: 16px 36px;
          border-radius: 14px;
          background: #1a1f33;
          border: 1px solid #2a2f45;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .secondary:hover { background: #2a2f45; transform: translateY(-2px); }
        .grid-box {
          padding: 20px;
          border-radius: 20px;
          background: rgba(16, 21, 40, 0.6);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 0 40px rgba(79,140,255,0.25);
        }
        .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
        .cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1f33;
          border-radius: 10px;
          font-weight: bold;
          animation: float 3s ease-in-out infinite;
        }
        .purple { background: #6a5cff; }
        .orange { background: #f59e0b; }
        .green { background: #10b981; }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0px); }
        }
        .features { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 80px; }
        .card {
          background: #101528;
          padding: 20px;
          border-radius: 15px;
          border: 1px solid #1f2540;
          transition: all 0.3s;
          cursor: pointer;
        }
        .card:hover { transform: translateY(-5px); border-color: #6a5cff; box-shadow: 0 0 20px rgba(106,92,255,0.2); }
        .card p { color: #9ca3af; }
        .stats { margin-top: 80px; display: grid; grid-template-columns: repeat(4, 1fr); text-align: center; background: #101528; padding: 30px; border-radius: 20px; }
        .stat h2 { font-size: 28px; color: #a78bfa; }
        .stat p { color: #9ca3af; }
        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; }
          h1 { font-size: 48px; }
          .features { grid-template-columns: repeat(2, 1fr); }
          .stats { grid-template-columns: repeat(2, 1fr); gap: 20px; }
        }
      `}</style>
    </>
  );
}