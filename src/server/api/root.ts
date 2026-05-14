import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";
import { db } from "@/db";
import { gameSessions, gamePlayers, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateSchulteTable } from "@/lib/schulte";

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
      const tableData = generateSchulteTable(5);
      
      const [newSession] = await db.insert(gameSessions).values({
        tableData: tableData,
        status: 'waiting',
        name: input.name || `Комната ${Date.now()}`,
        isPrivate: input.isPrivate || false,
        password: input.isPrivate ? input.password : null,
      }).returning();
      
      if (!newSession) {
        throw new Error('Не удалось создать игровую сессию');
      }
      
      await db.insert(gamePlayers).values({
        sessionId: newSession.id,
        userId: ctx.session.user.id,
        color: '#FF6B6B',
        order: 0,
      });
      
      return { sessionId: newSession.id };
    }),

  startBotGame: protectedProcedure
    .mutation(async ({ ctx }) => {
      const tableData = generateSchulteTable(5);
      
      const [newSession] = await db.insert(gameSessions).values({
        tableData: tableData,
        status: 'active',
        name: 'Игра с ботом',
        isPrivate: false,
      }).returning();
      
      if (!newSession) {
        throw new Error('Не удалось создать игру с ботом');
      }
      
      await db.insert(gamePlayers).values({
        sessionId: newSession.id,
        userId: ctx.session.user.id,
        color: '#FF6B6B',
        order: 0,
      });
      
      await db.insert(gamePlayers).values({
        sessionId: newSession.id,
        userId: 'bot',
        color: '#4ECDC4',
        order: 1,
      });
      
      return { sessionId: newSession.id };
    }),

  getGameState: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session) {
        return {
          table: [],
          status: 'waiting',
          winnerId: null,
          players: [],
          takenNumbers: {},
          currentNumber: 1,
        };
      }
      
      const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      
      return {
        table: session.tableData,
        status: session.status,
        winnerId: session.winnerId,
        players: players.map(p => ({
          userId: p.userId,
          isBot: p.userId === 'bot',
          color: p.color,
          errors: p.errors || 0,
          completed: !!p.completedAt,
          progress: 0,
        })),
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
      try {
        const sessions = await db
          .select({
            id: gameSessions.id,
            name: gameSessions.name,
            status: gameSessions.status,
            isPrivate: gameSessions.isPrivate,
          })
          .from(gameSessions)
          .where(eq(gameSessions.status, 'waiting'))
          .orderBy(desc(gameSessions.createdAt));
        
        return sessions.map(s => ({
          id: s.id,
          name: s.name || `Комната ${s.id}`,
          players: 1,
          maxPlayers: 4,
          status: s.status,
          isPrivate: s.isPrivate || false,
        }));
      } catch (error) {
        console.error('getActiveSessions error:', error);
        return [];
      }
    }),

  getMatchHistory: protectedProcedure
    .query(async () => {
      return [];
    }),

  getLeaderboard: protectedProcedure
    .query(async () => {
      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          wins: users.wins,
          bestTime: users.bestTime,
        })
        .from(users)
        .orderBy(desc(users.wins));
      
      return allUsers;
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