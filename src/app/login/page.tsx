'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/trpc/client';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        if (rememberMe) localStorage.setItem('remember', 'true');
        router.push('/');
      }
    },
    onError: (error) => setError(error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    loginMutation.mutate({ username, password });
  };

  const isLoading = loginMutation.status === 'loading';

  return (
    <div className="page">
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ background: '#101528', padding: '40px', borderRadius: '20px', width: '400px', border: '1px solid #1f2540' }}>
          <h1 style={{ fontSize: '28px', marginBottom: '8px', color: 'white', textAlign: 'center' }}>Вход в аккаунт</h1>
          <p style={{ color: '#9ca3af', marginBottom: '32px', textAlign: 'center' }}>Добро пожаловать!</p>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Никнейм"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#1a1f33', border: '1px solid #2a2f45', color: 'white' }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#1a1f33', border: '1px solid #2a2f45', color: 'white' }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                Запомнить меня
              </label>
            </div>
            
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #6a5cff, #4f8cff)', border: 'none', color: 'white', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isLoading ? 0.6 : 1 }}
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          
          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#9ca3af' }}>
            Нет аккаунта? <a href="/register" style={{ color: '#6a5cff', textDecoration: 'none' }}>Зарегистрируйтесь</a>
          </div>
        </div>
      </div>
    </div>
  );
}
