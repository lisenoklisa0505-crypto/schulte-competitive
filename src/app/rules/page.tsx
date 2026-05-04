'use client';

import Header from '@/components/Header';

export default function RulesPage() {
  const rules = [
    { icon: '🎯', title: 'Цель игры', text: 'Найти числа от 1 до 25 по порядку быстрее остальных игроков.' },
    { icon: '🧠', title: 'Игровое поле', text: 'Таблица 5×5 с перемешанными числами генерируется случайно для каждой игры.' },
    { icon: '👥', title: 'Мультиплеер', text: 'Все игроки видят одинаковое поле в реальном времени.' },
    { icon: '⚡', title: 'Механика', text: 'Первый игрок, выбравший число, “забирает” его для всех.' },
    { icon: '🏆', title: 'Победа', text: 'Побеждает тот, кто первым завершит всю последовательность.' },
    { icon: '📊', title: 'Рейтинг', text: 'Место зависит от количества побед в матчах.' }
  ];

  return (
    <div className="page">
      <Header />

      {/* КОСМИЧЕСКИЙ ФОН */}
      <div className="background" />

      <div className="container">
        <div className="hero">
          <h1>📘 Правила игры</h1>
          <p>Пойми механику за 1 минуту и начинай играть</p>
        </div>

        <div className="rules-grid">
          {rules.map((r, i) => (
            <div key={i} className="card">
              <div className="icon">{r.icon}</div>
              <h3>{r.title}</h3>
              <p>{r.text}</p>
            </div>
          ))}
        </div>

        <div className="tip">
          💡 Совет: тренируй периферийное зрение — это ключ к быстрому результату
        </div>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
        }

        /* 🌌 ФОН */
        .background {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(circle at 20% 20%, #1a1f33, transparent 40%),
            radial-gradient(circle at 80% 30%, #2a2f45, transparent 40%),
            #0b0f1a;
        }

        .background::before {
          content: "";
          position: absolute;
          width: 200%;
          height: 200%;
          background-image: radial-gradient(white 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.05;
          animation: starsMove 80s linear infinite;
        }

        @keyframes starsMove {
          from { transform: translate(0, 0); }
          to { transform: translate(-200px, -200px); }
        }

        .container {
          max-width: 1200px;
          margin: 40px auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }

        .hero {
          text-align: center;
          margin-bottom: 40px;
          margin-top: 40px;
        }

        h1 {
          font-size: 42px;
          margin-bottom: 8px;
        }

        .hero p {
          color: #9ca3af;
        }

        .rules-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .card {
          background: rgba(16, 21, 40, 0.75);
          backdrop-filter: blur(12px);
          border: 1px solid #1f2540;
          border-radius: 18px;
          padding: 24px;
          transition: 0.25s;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 0 25px rgba(106,92,255,0.25);
        }

        .icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        h3 {
          margin-bottom: 8px;
          color: white;
          font-size: 20px;
        }

        p {
          color: #9ca3af;
          line-height: 1.5;
        }

        .tip {
          margin-top: 30px;
          padding: 20px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(106,92,255,0.15), rgba(79,140,255,0.15));
          border: 1px solid rgba(106,92,255,0.3);
          color: #d1d5db;
          text-align: center;
        }

        @media (max-width: 800px) {
          .rules-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}