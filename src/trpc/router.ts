import { router } from './trpc';
import { authRouter } from './routers/auth';
import { gameRouter } from './routers/game';

export const appRouter = router({
  auth: authRouter,
  game: gameRouter,
});

export type AppRouter = typeof appRouter;