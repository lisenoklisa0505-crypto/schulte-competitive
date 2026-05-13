'use client';

import Header from '@/components/Header';

export default function AboutPage() {
  return (
    <>
      <div className="page">
        <Header />

        <div className="container">

          <div className="card">

            <h1>🧠 О игре «Таблицы Шульте»</h1>

            <p className="lead">
              «Таблицы Шульте» — это когнитивный тренажёр, созданный для развития
              концентрации, скорости обработки информации и периферического зрения.
            </p>

            <p>
              В основе игры лежит классический психологический метод,
              который используется для тренировки внимания и ускорения чтения.
              Игроку необходимо находить числа в правильной последовательности
              на случайно сгенерированной таблице.
            </p>

            <p>
              В отличие от одиночных тренажёров, наша версия построена как
              соревновательная онлайн-игра. Вы можете играть против других
              игроков в реальном времени или тренироваться против бота.
            </p>

            <p>
              Все участники видят одинаковое игровое поле, что делает
              соревнование честным и полностью зависящим от скорости мышления
              и реакции.
            </p>

            <div className="block">
              <h2>🎮 Основные особенности</h2>
              <ul>
                <li>✔ Мультиплеер до 4 игроков в реальном времени</li>
                <li>✔ Игра против адаптивного бота</li>
                <li>✔ Общая синхронизированная таблица для всех участников</li>
                <li>✔ Система рейтинга и прогресса</li>
                <li>✔ История всех сыгранных матчей</li>
              </ul>
            </div>

            <div className="block">
              <h2>📈 Зачем это нужно</h2>
              <p>
                Регулярные тренировки с таблицами Шульте помогают улучшить:
                скорость чтения, концентрацию, устойчивость внимания и
                способность быстро переключаться между задачами.
              </p>
            </div>

            <div className="footer">
              🚀 Игра создана как смесь тренажёра и соревновательной платформы.
              Развивай мозг — и одновременно соревнуйся с другими игроками.
            </div>

          </div>

        </div>
      </div>

      {/* STYLE */}
      <style jsx>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 20%, #1a1f33, transparent 40%),
                      radial-gradient(circle at 80% 30%, #2a2f45, transparent 40%),
                      #0b0f1a;
          position: relative;
          overflow: hidden;
        }

        /* subtle stars */
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
          max-width: 900px;
          margin: 70px auto;
          padding: 0 20px;
          position: relative;
          z-index: 2;
        }

        .card {
          background: rgba(16, 21, 40, 0.75);
          backdrop-filter: blur(14px);
          border: 1px solid #1f2540;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 0 40px rgba(106,92,255,0.12);
        }

        h1 {
          font-size: 36px;
          margin-bottom: 20px;
        }

        .lead {
          font-size: 18px;
          color: white;
          line-height: 1.6;
          margin-bottom: 15px;
        }

        p {
          color: #9ca3af;
          line-height: 1.7;
          margin-bottom: 14px;
        }

        .block {
          margin-top: 25px;
          padding: 20px;
          border-radius: 14px;
          background: #101528;
          border: 1px solid #1f2540;
        }

        .block h2 {
          font-size: 18px;
          margin-bottom: 10px;
          color: white;
        }

        ul {
          margin: 0;
          padding-left: 18px;
          color: #9ca3af;
          line-height: 1.7;
        }

        .footer {
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px solid #1f2540;
          color: #a78bfa;
          font-size: 14px;
        }
      `}</style>
    </>
  );
}
