'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';
import Header from '@/components/Header';
import CreateGameModal from '@/components/CreateGameModal';

interface Room {
  id: number;
  name: string;
  players: number;
  maxPlayers: number;
  isPrivate: boolean;
}

export default function RoomsPage() {
  const router = useRouter();
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const { data: activeSessions, refetch } = trpc.game.getActiveSessions.useQuery(undefined, {
    refetchInterval: 5000,
  });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (activeSessions && Array.isArray(activeSessions)) {
      const formatted = activeSessions.map((s: any) => ({
        id: s.id,
        name: s.name || `Комната ${s.id}`,
        players: s.players || 1,
        maxPlayers: s.maxPlayers || 4,
        isPrivate: s.isPrivate || false,
      }));
      setRooms(formatted);
    }
  }, [activeSessions]);

  const handleJoinRoom = (room: Room) => {
    if (room.isPrivate) {
      const pass = prompt('Введите пароль');
      if (!pass) return;
      router.push(`/game/${room.id}?password=${encodeURIComponent(pass)}`);
    } else {
      router.push(`/game/${room.id}`);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'white' }}>Загрузка...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <>
      <CreateGameModal isOpen={showCreateModal} onClose={() => {
        setShowCreateModal(false);
        refetch();
      }} />

      <div className="rooms-page">
        <Header />

        <div className="rooms-container">
          <div className="rooms-header">
            <h1>Игровые комнаты</h1>
            <p>Присоединяйтесь к существующим сессиям или создайте свою</p>
          </div>

          <button onClick={() => setShowCreateModal(true)} className="create-room-btn">
            + Создать комнату
          </button>

          <div className="rooms-grid">
            {rooms.map(room => (
              <div
                key={room.id}
                className="room-card"
                onClick={() => handleJoinRoom(room)}
              >
                <div className="room-header">
                  <span className="room-name">{room.name}</span>
                  <span className={`room-status ${room.players < room.maxPlayers ? 'free' : 'full'}`}>
                    {room.players < room.maxPlayers ? 'Свободна' : 'Занята'}
                  </span>
                </div>

                <div className="room-players">
                  👥 {room.players}/{room.maxPlayers} игроков
                </div>

                <div className="room-footer">
                  <span className={`room-privacy ${room.isPrivate ? 'private' : 'public'}`}>
                    {room.isPrivate ? '🔒 Приватная' : '🌍 Открытая'}
                  </span>
                  <span className="room-join">Войти →</span>
                </div>
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="empty-rooms">Нет активных комнат. Создайте первую!</div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .rooms-page {
          min-height: 100vh;
          background: radial-gradient(circle at 20% 20%, #1a1f33, transparent 40%),
                      radial-gradient(circle at 80% 30%, #2a2f45, transparent 40%),
                      #0b0f1a;
          position: relative;
          overflow: hidden;
        }
        .rooms-page::before {
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
        .rooms-container {
          max-width: 1200px;
          margin: 60px auto;
          padding: 0 24px;
          position: relative;
          z-index: 1;
        }
        .rooms-header { margin-bottom: 32px; }
        .rooms-header h1 { font-size: 32px; margin-bottom: 8px; color: white; }
        .rooms-header p { color: #9ca3af; }
        .create-room-btn {
          margin-bottom: 32px;
          padding: 12px 28px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #6a5cff, #4f8cff);
          color: white;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(106,92,255,0.6);
          transition: all 0.2s;
        }
        .create-room-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(106,92,255,0.8);
        }
        .rooms-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
        .room-card {
          background: #101528;
          border-radius: 20px;
          padding: 24px;
          border: 1px solid #1f2540;
          transition: all 0.3s;
          cursor: pointer;
        }
        .room-card:hover {
          transform: translateY(-5px);
          border-color: #6a5cff;
          box-shadow: 0 0 20px rgba(106,92,255,0.2);
        }
        .room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .room-name { font-size: 18px; font-weight: 600; color: white; }
        .room-status { font-size: 12px; padding: 4px 10px; border-radius: 20px; }
        .room-status.free { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .room-status.full { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .room-players { font-size: 14px; color: #9ca3af; margin-bottom: 16px; }
        .room-footer { display: flex; justify-content: space-between; align-items: center; }
        .room-privacy { font-size: 12px; padding: 4px 10px; border-radius: 20px; }
        .room-privacy.public { background: rgba(16, 185, 129, 0.2); color: #10b981; }
        .room-privacy.private { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .room-join { font-size: 14px; color: #a78bfa; font-weight: 500; }
        .empty-rooms { grid-column: 1 / -1; text-align: center; padding: 60px; background: #101528; border-radius: 20px; color: #9ca3af; }
        @media (max-width: 900px) { .rooms-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}