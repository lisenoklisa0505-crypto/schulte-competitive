'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth-client';

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const result = await signUp.email({
        email,
        password,
        name: username,
      });
      
      if (result.error) {
        setError(result.error.message || 'Ошибка регистрации');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('Ошибка соединения');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div style={{ minHeight: '100vh', background: '#0b0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#101528', padding: '40px', borderRadius: '20px', width: '400px', border: '1px solid #1f2540' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px', color: 'white', textAlign: 'center' }}>Регистрация</h1>
        <p style={{ color: '#9ca3af', marginBottom: '32px', textAlign: 'center' }}>Создайте новый аккаунт</p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#1a1f33', border: '1px solid #2a2f45', color: 'white' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
        
        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#9ca3af' }}>
          Уже есть аккаунт? <a href="/login" style={{ color: '#6a5cff', textDecoration: 'none' }}>Войдите</a>
        </div>
      </div>
    </div>
  );
}