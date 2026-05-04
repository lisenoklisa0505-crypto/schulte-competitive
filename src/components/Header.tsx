'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { trpc } from '@/trpc/client';
import CreateGameModal from './CreateGameModal';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: user, refetch } = trpc.auth.me.useQuery();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = () => {
    // Полная очистка
    localStorage.clear();
    sessionStorage.clear();
    // Принудительная перезагрузка
    window.location.href = '/';
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof window !== 'undefined') {
        refetch();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [refetch]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
    }, 300);
  };

  // Закрытие дропдауна при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Главная', href: '/' },
    { name: 'Рейтинг', href: '/rating' },
    { name: 'История матчей', href: '/history' },
    { name: 'Комнаты', href: '/rooms' },
    { name: 'Правила', href: '/rules' },
    { name: 'О игре', href: '/about' },
  ];

  return (
    <>
      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          background: '#0b0f1a',
          borderBottom: '1px solid #1f2540',
          padding: '14px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        {/* LOGO */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          onClick={() => router.push('/')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 8px)', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#6a5cff' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#4f8cff' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#4f8cff' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#6a5cff' }} />
          </div>

          <span style={{ fontSize: '20px', fontWeight: 700, color: 'white' }}>
            Таблицы <span style={{ color: '#6a5cff' }}>Шульте</span>
          </span>
        </div>

        {/* NAV */}
        <nav style={{ display: 'flex', gap: '22px' }}>
          {navItems.map((item) => (
            <a
              key={item.href}
              onClick={() => router.push(item.href)}
              style={{
                color: pathname === item.href ? 'white' : '#9aa0c3',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'none',
                transition: '0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = pathname === item.href ? 'white' : '#9aa0c3')
              }
            >
              {item.name}
            </a>
          ))}
        </nav>

        {/* RIGHT SIDE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <>
              {/* USER */}
              <div
                ref={dropdownRef}
                style={{ position: 'relative' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#1a1f33',
                    padding: '6px 14px',
                    borderRadius: '30px',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6a5cff, #4f8cff)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {user.username[0].toUpperCase()}
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', color: 'white' }}>
                      {user.username}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a78bfa' }}>
                      🏆 {user.wins || 0}
                    </div>
                  </div>
                </div>

                {showDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      background: '#101528',
                      border: '1px solid #1f2540',
                      borderRadius: '12px',
                      minWidth: '160px',
                      overflow: 'hidden',
                    }}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#1a1f33')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      Выйти
                    </button>
                  </div>
                )}
              </div>

              {/* PLAY BUTTON */}
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6a5cff, #4f8cff)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '0.3px',
                  boxShadow: '0 0 12px rgba(106, 92, 255, 0.45)',
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                🎮 Играть
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push('/login')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: '1px solid #2a2f45',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Войти
              </button>

              <button
                onClick={() => router.push('/register')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6a5cff, #4f8cff)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 0 10px rgba(106, 92, 255, 0.5)',
                }}
              >
                Регистрация
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ height: '70px' }} />
    </>
  );
}