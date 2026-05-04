import { inferAsyncReturnType } from '@trpc/server';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@/db';
import { verifyJWT } from '@/lib/auth';

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader || '';
  const user = token ? await verifyJWT(token) : null;
  
  return {
    db,
    user,
    req,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;