import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/trpc/router';
import { createContext } from '@/trpc/context';
import { NextRequest } from 'next/server';

const handler = (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req, resHeaders: new Headers(), info: {} as any }),
  });
};

export { handler as GET, handler as POST };