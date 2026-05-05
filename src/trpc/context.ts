import { inferAsyncReturnType } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@/db';
import { verifyJWT } from '@/lib/auth';

export async function createContext({ req }: FetchCreateContextFnOptions) {
  // Получаем токен из cookies
  const cookieHeader = req.headers.get('cookie');
  let token = '';
  
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      acc[name] = value;
      return acc;
    }, {} as Record<string, string>);
    token = cookies['token'] || '';
  }
  
  const user = token ? await verifyJWT(token) : null;
  
  return {
    db,
    user,
    req,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;