import { inferAsyncReturnType } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { db } from '@/db';
import { verifyJWT } from '@/lib/auth';

export async function createContext(opts: CreateNextContextOptions) {
  const token = opts.req.cookies?.token;
  const user = token ? await verifyJWT(token) : null;
  
  return {
    db,
    user,
    req: opts.req,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;