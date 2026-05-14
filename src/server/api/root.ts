import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

// ========== AUTH ROUTER ==========
const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    return ctx.session?.user || null;
  }),
});

// ========== GAME ROUTER ==========
const gameRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { message: `Hello ${input.name}` };
    }),

  createGame: protectedProcedure
    .input(z.object({ 
      maxPlayers: z.number().min(2).max(4), 
      withBot: z.boolean().default(false),
      name: z.string().optional(),
      isPrivate: z.boolean().optional(),
      password: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // ВРЕМЕННО: возвращаем фиктивный sessionId
      return { sessionId: Math.floor(Math.random() * 10000) };
    }),

  startBotGame: protectedProcedure
    .mutation(async ({ ctx }) => {
      // ВРЕМЕННО: возвращаем фиктивный sessionId
      return { sessionId: Math.floor(Math.random() * 10000) };
    }),

  getGameState: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      return {
        table: [],
        status: 'waiting',
        winnerId: null,
        players: [],
        takenNumbers: {},
        currentNumber: 1,
      };
    }),

  makeMove: protectedProcedure
    .input(z.object({ sessionId: z.number(), number: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return { valid: true, number: input.number };
    }),

  makeBotMove: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  exitGame: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  getActiveSessions: protectedProcedure
    .query(async () => {
      return [];
    }),

  getMatchHistory: protectedProcedure
    .query(async () => {
      return [];
    }),

  getLeaderboard: protectedProcedure
    .query(async () => {
      return [];
    }),
});

// ========== USER ROUTER ==========
const userRouter = router({
  getUser: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return { id: input.id, name: "User" };
    }),
});

// ========== MAIN APP ROUTER ==========
export const appRouter = router({
  auth: authRouter,
  game: gameRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;