import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";

// ========== TRPC INIT С КОНТЕКСТОМ ==========
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// ========== PROTECTED PROCEDURE ==========
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

// ========== GAME ROUTER (ПОЛНЫЙ) ==========
const gameRouter = router({
  // Простой тест
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return { message: `Hello ${input.name}` };
    }),

  // Создание игры
  createGame: protectedProcedure
    .input(z.object({ 
      maxPlayers: z.number().min(2).max(4), 
      withBot: z.boolean().default(false),
      name: z.string().optional(),
      isPrivate: z.boolean().optional(),
      password: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      return { sessionId: 1 };
    }),

  // Игра с ботом
  startBotGame: protectedProcedure
    .mutation(async ({ ctx }) => {
      return { sessionId: 1 };
    }),

  // Получение состояния игры
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

  // Ход игрока
  makeMove: protectedProcedure
    .input(z.object({ sessionId: z.number(), number: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return { valid: true, number: input.number };
    }),

  // Ход бота
  makeBotMove: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  // Выход из игры
  exitGame: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  // Получение активных сессий
  getActiveSessions: protectedProcedure
    .query(async () => {
      return [];
    }),

  // Получение истории матчей
  getMatchHistory: protectedProcedure
    .query(async () => {
      return [];
    }),

  // Получение рейтинга
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