import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '@/db';
import { gameSessions, gamePlayers, gameMoves, matchHistory, users } from '@/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { generateSchulteTable } from '@/lib/schulte';

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

// Общая функция для ходов (вне роутера)
async function performMove(sessionId: number, userId: string | null, number: number, isBot: boolean = false) {
  return await db.transaction(async (tx) => {
    const [session] = await tx.select().from(gameSessions).where(eq(gameSessions.id, sessionId)).for('update');
    if (!session || session.status !== 'active') {
      return { valid: false, message: 'Игра не активна' };
    }
    
    const players = await tx.select().from(gamePlayers).where(eq(gamePlayers.sessionId, sessionId));
    const currentPlayer = players.find(p => (isBot ? p.isBot : p.userId === userId));
    if (!currentPlayer) {
      return { valid: false, message: 'Игрок не найден' };
    }
    
    const allValidMoves = await tx.select().from(gameMoves).where(and(eq(gameMoves.sessionId, sessionId), eq(gameMoves.isValid, true)));
    const nextNumber = allValidMoves.length + 1;
    
    if (nextNumber > 25) {
      return { valid: false, message: 'Игра уже закончена' };
    }
    
    if (number !== nextNumber) {
      await tx.insert(gameMoves).values({ sessionId, userId, number, isValid: false, timestamp: new Date() });
      await tx.update(gamePlayers).set({ errors: (currentPlayer.errors || 0) + 1 }).where(eq(gamePlayers.id, currentPlayer.id));
      return { valid: false, message: `Нужно нажать ${nextNumber}` };
    }
    
    try {
      await tx.insert(gameMoves).values({ sessionId, userId, number, isValid: true, timestamp: new Date() });
    } catch (error) {
      await tx.update(gamePlayers).set({ errors: (currentPlayer.errors || 0) + 1 }).where(eq(gamePlayers.id, currentPlayer.id));
      return { valid: false, message: `Число ${number} уже занято` };
    }
    
    const newValidMovesCount = allValidMoves.length + 1;
    await tx.update(gamePlayers).set({ progress: newValidMovesCount }).where(eq(gamePlayers.id, currentPlayer.id));
    
    let isFinished = false;
    let winnerId: string | null = null;
    
    if (newValidMovesCount === 25) {
      isFinished = true;
      winnerId = userId;
      const finishedAt = new Date();
      const duration = Math.floor((finishedAt.getTime() - new Date(session.startedAt!).getTime()) / 1000);
      
      await tx.update(gameSessions).set({ status: 'finished', winnerId, finishedAt }).where(eq(gameSessions.id, sessionId));
      
      if (winnerId && winnerId !== 'null') {
        const [userStats] = await tx.select().from(users).where(eq(users.id, winnerId));
        const currentWins = (userStats?.wins || 0) + 1;
        const currentBestTime = userStats?.bestTime || duration;
        const newBestTime = duration < currentBestTime ? duration : currentBestTime;
        await tx.update(users).set({ wins: currentWins, bestTime: newBestTime }).where(eq(users.id, winnerId));
      }
      
      const humanPlayers = players.filter(p => !p.isBot);
      await tx.insert(matchHistory).values({
        sessionId,
        players: humanPlayers.map(p => ({
          id: p.userId,
          username: p.userId === userId ? 'Вы' : (p.isBot ? 'Бот' : `Игрок ${p.userId?.slice(0, 4)}`),
          color: p.color,
          errors: p.errors || 0,
          completed: true,
          progress: p.userId === userId ? 25 : (p.progress || 0),
        })),
        winnerId: winnerId || 'bot',
        duration,
      });
    }
    
    return { valid: true, number, playerColor: currentPlayer.color, isFinished, winnerId };
  });
}

export const gameRouter = router({
  createGame: protectedProcedure
    .input(z.object({ maxPlayers: z.number().min(2).max(4), withBot: z.boolean().default(false), name: z.string().optional(), isPrivate: z.boolean().optional(), password: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const activeSession = await db
        .select()
        .from(gameSessions)
        .innerJoin(gamePlayers, eq(gamePlayers.sessionId, gameSessions.id))
        .where(and(eq(gamePlayers.userId, ctx.user.id), eq(gameSessions.status, 'active')));
      
      if (activeSession.length > 0) {
        throw new Error('У вас уже есть активная игра. Завершите её или выйдите.');
      }
      
      const tableData = generateSchulteTable(5);
      const [newSession] = await db.insert(gameSessions).values({ 
        tableData, 
        status: 'waiting', 
        name: input.name || `Комната ${Date.now()}`, 
        isPrivate: input.isPrivate || false, 
        password: input.isPrivate ? input.password : null, 
        maxPlayers: input.maxPlayers,
        startedAt: null,
        finishedAt: null,
      }).returning();
      
      if (!newSession) throw new Error('Не удалось создать игровую сессию');
      
      await db.insert(gamePlayers).values({ 
        sessionId: newSession.id, 
        userId: ctx.user.id, 
        color: colors[0], 
        order: 0, 
        isBot: false
      });
      
      return { sessionId: newSession.id };
    }),
  
  startBotGame: protectedProcedure.mutation(async ({ ctx }) => {
    const activeSession = await db
      .select()
      .from(gameSessions)
      .innerJoin(gamePlayers, eq(gamePlayers.sessionId, gameSessions.id))
      .where(and(eq(gamePlayers.userId, ctx.user.id), eq(gameSessions.status, 'active')));
    
    if (activeSession.length > 0) {
      throw new Error('У вас уже есть активная игра. Завершите её или выйдите.');
    }
    
    const tableData = generateSchulteTable(5);
    const now = new Date();
    const [newSession] = await db.insert(gameSessions).values({ 
      tableData, 
      status: 'active', 
      name: 'Игра с ботом', 
      isPrivate: false, 
      maxPlayers: 2,
      startedAt: now,
      finishedAt: null,
    }).returning();
    
    if (!newSession) throw new Error('Не удалось создать игру с ботом');
    
    await db.insert(gamePlayers).values({ 
      sessionId: newSession.id, 
      userId: ctx.user.id, 
      color: colors[0], 
      order: 0, 
      isBot: false
    });
    
    await db.insert(gamePlayers).values({ 
      sessionId: newSession.id, 
      userId: null,
      isBot: true, 
      color: colors[1], 
      order: 1, 
      name: 'Бот'
    });
    
    return { sessionId: newSession.id, startedAt: now.getTime() };
  }),
  
  joinGame: protectedProcedure.input(z.object({ sessionId: z.number(), password: z.string().optional() })).mutation(async ({ input, ctx }) => {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
    if (!session) throw new Error('Game not found');
    if (session.status !== 'waiting') throw new Error('Game already started');
    if (session.isPrivate && session.password !== input.password) throw new Error('Неверный пароль');
    
    const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
    const humanPlayers = players.filter(p => !p.isBot);
    if (humanPlayers.some(p => p.userId === ctx.user.id)) throw new Error('Вы уже в этой игре');
    if (humanPlayers.length >= session.maxPlayers!) throw new Error('Game is full');
    if (players.some(p => p.isBot)) throw new Error('Игра уже началась с ботом');
    
    await db.insert(gamePlayers).values({ 
      sessionId: input.sessionId, 
      userId: ctx.user.id, 
      color: colors[humanPlayers.length], 
      order: humanPlayers.length, 
      isBot: false
    });
    
    const newHumanPlayers = humanPlayers.length + 1;
    if (newHumanPlayers >= 2) {
      await db.update(gameSessions).set({ status: 'active', startedAt: new Date() }).where(eq(gameSessions.id, input.sessionId));
    }
    return { success: true };
  }),
  
  exitGame: protectedProcedure.input(z.object({ sessionId: z.number() })).mutation(async ({ input, ctx }) => {
    return await db.transaction(async (tx) => {
      const [session] = await tx.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session) throw new Error('Game not found');
      
      if (session.status === 'finished') return { success: true };
      
      const players = await tx.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      const currentPlayer = players.find(p => p.userId === ctx.user.id && !p.isBot);
      if (!currentPlayer) throw new Error('Not a player');
      
      await tx.delete(gamePlayers).where(eq(gamePlayers.id, currentPlayer.id));
      
      if (session.status === 'active') {
        const finishedAt = new Date();
        const duration = Math.floor((finishedAt.getTime() - new Date(session.startedAt!).getTime()) / 1000);
        
        await tx.insert(matchHistory).values({
          sessionId: input.sessionId,
          players: [{ 
            id: ctx.user.id, 
            username: 'Вы',
            color: currentPlayer.color, 
            errors: currentPlayer.errors || 0,
            completed: false,
            progress: currentPlayer.progress || 0
          }],
          winnerId: 'opponent',
          duration,
        });
      }
      
      const remainingPlayers = await tx.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      
      if (remainingPlayers.length === 0) {
        await tx.delete(gameMoves).where(eq(gameMoves.sessionId, input.sessionId));
        await tx.delete(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
        await tx.delete(gameSessions).where(eq(gameSessions.id, input.sessionId));
        return { success: true, roomDeleted: true };
      }
      
      if (session.status === 'waiting' && remainingPlayers.length > 0) {
        const sortedPlayers = [...remainingPlayers].sort((a, b) => a.order - b.order);
        for (let i = 0; i < sortedPlayers.length; i++) {
          await tx.update(gamePlayers).set({ order: i }).where(eq(gamePlayers.id, sortedPlayers[i].id));
        }
      }
      
      return { success: true };
    });
  }),
  
  makeMove: protectedProcedure
    .input(z.object({ sessionId: z.number(), number: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await performMove(input.sessionId, ctx.user.id, input.number, false);
    }),
  
  makeBotMove: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      const [botPlayer] = await db.select().from(gamePlayers).where(and(eq(gamePlayers.sessionId, input.sessionId), eq(gamePlayers.isBot, true)));
      if (!botPlayer) {
        return { success: false };
      }
      
      const validMoves = await db.select().from(gameMoves).where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
      const nextNumber = validMoves.length + 1;
      
      if (nextNumber > 25) {
        return { success: false };
      }
      
      const willMakeError = Math.random() < 0.12;
      let pickedNumber = nextNumber;
      
      if (willMakeError) {
        const variants = [nextNumber - 2, nextNumber - 1, nextNumber + 1, nextNumber + 2].filter(n => n >= 1 && n <= 25 && n !== nextNumber);
        if (variants.length > 0) {
          pickedNumber = variants[Math.floor(Math.random() * variants.length)];
        }
      }
      
      const result = await performMove(input.sessionId, null, pickedNumber, true);
      return { success: result.valid, number: pickedNumber, isValid: result.valid };
    }),
  
  getGameState: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ input }) => {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
    if (!session) throw new Error('Game not found');
    const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
    const moves = await db.select().from(gameMoves).where(eq(gameMoves.sessionId, input.sessionId));
    
    const playerMap = new Map(players.map(p => [p.userId, p]));
    const takenNumbers: Record<number, string> = {};
    const playerProgress: Record<string, number> = {};
    
    moves.forEach(move => {
      if (move.isValid) {
        if (!takenNumbers[move.number]) {
          const player = move.userId === null ? players.find(p => p.isBot) : playerMap.get(move.userId);
          if (player) {
            takenNumbers[move.number] = player.color;
          }
        }
        playerProgress[move.userId || 'bot'] = (playerProgress[move.userId || 'bot'] || 0) + 1;
      }
    });
    
    const currentNumber = moves.filter(m => m.isValid).length + 1;
    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : null;
    
    return {
      table: session.tableData,
      status: session.status,
      winnerId: session.winnerId,
      startedAt,
      finishedAt: session.finishedAt ? new Date(session.finishedAt).getTime() : null,
      players: players.map(p => ({
        userId: p.userId || (p.isBot ? null : 'unknown'),
        isBot: p.isBot || false,
        color: p.color,
        errors: p.errors || 0,
        completed: !!p.completedAt,
        progress: playerProgress[p.userId || 'bot'] || 0,
        name: p.name,
      })),
      takenNumbers,
      currentNumber: Math.min(currentNumber, 25),
      maxPlayers: session.maxPlayers,
    };
  }),
  
  getActiveSessions: protectedProcedure.query(async () => {
    const sessions = await db.select({ id: gameSessions.id, name: gameSessions.name, status: gameSessions.status, isPrivate: gameSessions.isPrivate, maxPlayers: gameSessions.maxPlayers }).from(gameSessions).where(eq(gameSessions.status, 'waiting')).orderBy(desc(gameSessions.createdAt)).limit(20);
    const sessionsWithPlayers = await Promise.all(sessions.map(async (session) => {
      const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, session.id));
      return {
        id: session.id,
        name: session.name || `Комната ${session.id}`,
        players: players.filter(p => !p.isBot).length,
        maxPlayers: session.maxPlayers || 4,
        status: session.status,
        isPrivate: session.isPrivate || false,
      };
    }));
    return sessionsWithPlayers;
  }),
  
  getMatchHistory: protectedProcedure.query(async () => {
    return await db.select().from(matchHistory).orderBy(desc(matchHistory.createdAt)).limit(50);
  }),
  
  getLeaderboard: protectedProcedure.query(async () => {
    return await db.select({ 
      id: users.id, 
      name: users.name,
      username: users.username, 
      wins: users.wins, 
      bestTime: users.bestTime 
    }).from(users).orderBy(desc(users.wins)).limit(50);
  }),
});