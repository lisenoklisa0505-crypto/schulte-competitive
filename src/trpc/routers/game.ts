import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '@/db';
import { gameSessions, gamePlayers, gameMoves, matchHistory, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateSchulteTable } from '@/lib/schulte';

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

export const gameRouter = router({
  // Создание игры (мультиплеер)
  createGame: protectedProcedure
    .input(z.object({ 
      maxPlayers: z.number().min(2).max(4), 
      withBot: z.boolean().default(false),
      name: z.string().optional(),
      isPrivate: z.boolean().optional(),
      password: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      // Проверка на активную игру
      const activeSession = await db
        .select()
        .from(gameSessions)
        .innerJoin(gamePlayers, eq(gamePlayers.sessionId, gameSessions.id))
        .where(and(eq(gameSessions.status, 'active'), eq(gamePlayers.userId, ctx.user.id)));
      
      if (activeSession.length > 0) {
        throw new Error('У вас уже есть активная игра. Завершите её или выйдите.');
      }
      
      // Генерация таблицы
      const tableData = generateSchulteTable(5);
      
      // Создание сессии
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
      
      // Добавление игрока (хост)
      await db.insert(gamePlayers).values({
        sessionId: newSession.id,
        userId: ctx.user.id,
        color: colors[0],
        order: 0,
      });
      
      return { sessionId: newSession.id };
    }),
  
  // Игра с ботом
  startBotGame: protectedProcedure
    .mutation(async ({ ctx }) => {
      // Проверка на активную игру
      const activeSession = await db
        .select()
        .from(gameSessions)
        .innerJoin(gamePlayers, eq(gamePlayers.sessionId, gameSessions.id))
        .where(and(eq(gameSessions.status, 'active'), eq(gamePlayers.userId, ctx.user.id)));
      
      if (activeSession.length > 0) {
        throw new Error('У вас уже есть активная игра. Завершите её или выйдите.');
      }
      
      // Генерация таблицы
      const tableData = generateSchulteTable(5);
      
      // Создание сессии
      const [newSession] = await db.insert(gameSessions).values({
        tableData: tableData,
        status: 'active',
        name: 'Игра с ботом',
        isPrivate: false,
      }).returning();
      
      if (!newSession) {
        throw new Error('Не удалось создать игру с ботом');
      }
      
      // Добавление игрока
      await db.insert(gamePlayers).values({
        sessionId: newSession.id,
        userId: ctx.user.id,
        color: colors[0],
        order: 0,
      });
      
      // Добавление бота
      await db.insert(gamePlayers).values({
        sessionId: newSession.id,
        userId: 'bot',
        color: colors[1],
        order: 1,
      });
      
      return { sessionId: newSession.id };
    }),
  
  // Присоединение к игре
  joinGame: protectedProcedure
    .input(z.object({ sessionId: z.number(), password: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session) throw new Error('Game not found');
      if (session.status !== 'waiting') throw new Error('Game already started');
      
      if (session.isPrivate && session.password !== input.password) {
        throw new Error('Неверный пароль');
      }
      
      const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      
      const alreadyInGame = players.some(p => p.userId === ctx.user.id);
      if (alreadyInGame) {
        throw new Error('Вы уже в этой игре');
      }
      
      const humanPlayers = players.filter(p => p.userId !== 'bot');
      
      if (humanPlayers.length >= 4) throw new Error('Game is full');
      
      const hasBot = players.some(p => p.userId === 'bot');
      if (hasBot) {
        throw new Error('Игра уже началась с ботом, нельзя присоединиться');
      }
      
      await db.insert(gamePlayers).values({
        sessionId: input.sessionId,
        userId: ctx.user.id,
        color: colors[players.length],
        order: players.length,
      });
      
      const totalHumanPlayers = humanPlayers.length + 1;
      if (totalHumanPlayers >= 2) {
        await db.update(gameSessions).set({ status: 'active' }).where(eq(gameSessions.id, input.sessionId));
      }
      
      return { success: true };
    }),
  
  // Выход из игры
  exitGame: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session) throw new Error('Game not found');
      
      if (session.status === 'finished') {
        return { success: true };
      }
      
      const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      const currentPlayer = players.find(p => p.userId === ctx.user.id);
      if (!currentPlayer) throw new Error('Not a player');
      
      if (session.status === 'waiting') {
        const isHost = currentPlayer.order === 0;
        
        await db.delete(gamePlayers).where(eq(gamePlayers.id, currentPlayer.id));
        
        const remainingPlayers = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
        
        if (remainingPlayers.length === 0) {
          await db.delete(gameMoves).where(eq(gameMoves.sessionId, input.sessionId));
          await db.delete(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
          await db.delete(gameSessions).where(eq(gameSessions.id, input.sessionId));
          return { success: true, roomDeleted: true };
        }
        
        if (isHost && remainingPlayers.length > 0) {
          const sortedPlayers = [...remainingPlayers].sort((a, b) => a.order - b.order);
          const newHost = sortedPlayers[0];
          await db.update(gamePlayers).set({ order: 0 }).where(eq(gamePlayers.id, newHost.id));
          
          for (let i = 1; i < sortedPlayers.length; i++) {
            await db.update(gamePlayers).set({ order: i }).where(eq(gamePlayers.id, sortedPlayers[i].id));
          }
        }
        
        return { success: true, roomDeleted: false };
      }
      
      if (session.status === 'active') {
        const finishedAt = new Date();
        const startTime = session.createdAt;
        const duration = Math.floor((finishedAt.getTime() - new Date(startTime!).getTime()) / 1000);
        
        const otherPlayers = players.filter(p => p.userId !== ctx.user.id && p.userId !== 'bot');
        let winnerId: string;
        
        if (otherPlayers.length > 0) {
          winnerId = otherPlayers[0].userId;
          const [winnerStats] = await db.select().from(users).where(eq(users.id, winnerId));
          const currentWins = (winnerStats?.wins || 0) + 1;
          await db.update(users).set({ wins: currentWins }).where(eq(users.id, winnerId));
        } else {
          winnerId = 'bot';
        }
        
        await db.update(gameSessions).set({ 
          status: 'finished', 
          winnerId: winnerId, 
          finishedAt: finishedAt 
        }).where(eq(gameSessions.id, input.sessionId));
        
        const humanPlayers = players.filter(p => p.userId !== 'bot');
        
        await db.insert(matchHistory).values({
          sessionId: input.sessionId,
          players: humanPlayers.map(p => ({ 
            id: p.userId, 
            username: p.userId === ctx.user.id ? 'Вы' : `Игрок ${p.userId}`,
            color: p.color, 
            errors: p.errors ?? 0,
            completed: false,
            progress: 0
          })),
          winnerId: winnerId,
          duration,
        });
      }
      
      return { success: true };
    }),
  
  // Удаление комнаты
  deleteRoom: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session) throw new Error('Game not found');
      
      if (session.status !== 'waiting') {
        throw new Error('Игра уже началась, нельзя удалить комнату');
      }
      
      const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      const hostPlayer = players.find(p => p.order === 0);
      
      if (hostPlayer?.userId !== ctx.user.id) {
        throw new Error('Только создатель комнаты может удалить её');
      }
      
      await db.delete(gameMoves).where(eq(gameMoves.sessionId, input.sessionId));
      await db.delete(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      await db.delete(gameSessions).where(eq(gameSessions.id, input.sessionId));
      
      return { success: true };
    }),
  
  // Очистка осиротевших комнат
  cleanupOrphanedRooms: protectedProcedure
    .mutation(async () => {
      const waitingRooms = await db.select().from(gameSessions).where(eq(gameSessions.status, 'waiting'));
      
      let deleted = 0;
      for (const room of waitingRooms) {
        const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, room.id));
        if (players.length === 0) {
          await db.delete(gameMoves).where(eq(gameMoves.sessionId, room.id));
          await db.delete(gamePlayers).where(eq(gamePlayers.sessionId, room.id));
          await db.delete(gameSessions).where(eq(gameSessions.id, room.id));
          deleted++;
        }
      }
      
      return { deleted };
    }),
  
  // Ход игрока
  makeMove: protectedProcedure
    .input(z.object({ sessionId: z.number(), number: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session) throw new Error('Game not found');
      
      if (session.status === 'finished') {
        return { valid: false, message: 'Игра уже закончена' };
      }
      
      const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      const currentPlayer = players.find(p => p.userId === ctx.user.id);
      if (!currentPlayer) throw new Error('Not a player');
      
      const allValidMoves = await db.select().from(gameMoves)
        .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
      
      const nextNumber = allValidMoves.length + 1;
      if (nextNumber > 25) {
        return { valid: false, message: 'Игра уже закончена' };
      }
      
      if (input.number !== nextNumber) {
        await db.insert(gameMoves).values({
          sessionId: input.sessionId,
          userId: ctx.user.id,
          number: input.number,
          isValid: false,
          timestamp: new Date(),
        });
        
        const currentErrors = currentPlayer.errors ?? 0;
        await db.update(gamePlayers).set({ errors: currentErrors + 1 })
          .where(eq(gamePlayers.id, currentPlayer.id));
        
        return { valid: false, message: `Нужно нажать ${nextNumber}!` };
      }
      
      const existingMove = await db.select().from(gameMoves)
        .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.number, input.number), eq(gameMoves.isValid, true)));
      
      const isValid = existingMove.length === 0;
      
      if (!isValid) {
        await db.insert(gameMoves).values({
          sessionId: input.sessionId,
          userId: ctx.user.id,
          number: input.number,
          isValid: false,
          timestamp: new Date(),
        });
        
        const currentErrors = currentPlayer.errors ?? 0;
        await db.update(gamePlayers).set({ errors: currentErrors + 1 })
          .where(eq(gamePlayers.id, currentPlayer.id));
        
        const whoTook = existingMove[0].userId === 'bot' ? 'Бот' : `Игрок ${existingMove[0].userId}`;
        return { valid: false, message: `Число ${input.number} уже занял ${whoTook}!` };
      }
      
      await db.insert(gameMoves).values({
        sessionId: input.sessionId,
        userId: ctx.user.id,
        number: input.number,
        isValid: true,
        timestamp: new Date(),
      });
      
      const totalValidMoves = await db.select().from(gameMoves)
        .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
      
      if (totalValidMoves.length === 25) {
        const finishedAt = new Date();
        const startTime = session.createdAt;
        const duration = Math.floor((finishedAt.getTime() - new Date(startTime!).getTime()) / 1000);
        
        const playersMovesCount = new Map<string, number>();
        for (const move of totalValidMoves) {
          const count = playersMovesCount.get(move.userId) || 0;
          playersMovesCount.set(move.userId, count + 1);
        }
        
        let winnerId = ctx.user.id;
        let maxMoves = playersMovesCount.get(ctx.user.id) || 0;
        
        for (const [playerId, movesCount] of playersMovesCount) {
          if (movesCount > maxMoves) {
            maxMoves = movesCount;
            winnerId = playerId;
          }
        }
        
        await db.update(gameSessions).set({ 
          status: 'finished', 
          winnerId: winnerId, 
          finishedAt: finishedAt 
        }).where(eq(gameSessions.id, input.sessionId));
        
        if (winnerId !== 'bot') {
          const [userStats] = await db.select().from(users).where(eq(users.id, winnerId));
          const currentWins = (userStats?.wins || 0) + 1;
          const currentBestTime = userStats?.bestTime || duration;
          const newBestTime = duration < currentBestTime ? duration : currentBestTime;
          
          await db.update(users).set({ 
            wins: currentWins,
            bestTime: newBestTime
          }).where(eq(users.id, winnerId));
        }
        
        const humanPlayers = players.filter(p => p.userId !== 'bot');
        
        await db.insert(matchHistory).values({
          sessionId: input.sessionId,
          players: humanPlayers.map(p => ({ 
            id: p.userId, 
            username: p.userId === ctx.user.id ? 'Вы' : `Игрок ${p.userId}`,
            color: p.color, 
            errors: p.errors ?? 0,
            completed: true,
            progress: playersMovesCount.get(p.userId) || 0
          })),
          winnerId: winnerId,
          duration,
        });
      }
      
      return { valid: true, number: input.number, playerColor: currentPlayer.color };
    }),
  
  // Ход бота
  makeBotMove: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session || session.status !== 'active') return { success: false };
      
      const allValidMoves = await db.select().from(gameMoves)
        .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
      
      const nextNumber = allValidMoves.length + 1;
      if (nextNumber > 25) return { success: false };
      
      const existingMove = await db.select().from(gameMoves)
        .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.number, nextNumber), eq(gameMoves.isValid, true)));
      
      if (existingMove.length > 0) return { success: false };
      
      const willMakeError = Math.random() < 0.15;
      let numberToTake = nextNumber;
      let isValid = true;
      
      if (willMakeError && nextNumber < 25) {
        numberToTake = Math.min(nextNumber + 1, 25);
        isValid = false;
      }
      
      await db.insert(gameMoves).values({
        sessionId: input.sessionId,
        userId: 'bot',
        number: numberToTake,
        isValid,
        timestamp: new Date(),
      });
      
      if (!isValid) {
        const [botPlayer] = await db.select().from(gamePlayers)
          .where(and(eq(gamePlayers.sessionId, input.sessionId), eq(gamePlayers.userId, 'bot')));
        
        if (botPlayer) {
          await db.update(gamePlayers).set({ errors: (botPlayer.errors || 0) + 1 })
            .where(eq(gamePlayers.id, botPlayer.id));
        }
      }
      
      const totalValidMoves = await db.select().from(gameMoves)
        .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
      
      if (totalValidMoves.length === 25) {
        const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
        const finishedAt = new Date();
        const startTime = session.createdAt;
        const duration = Math.floor((finishedAt.getTime() - new Date(startTime!).getTime()) / 1000);
        
        const playersMovesCount = new Map<string, number>();
        for (const move of totalValidMoves) {
          const count = playersMovesCount.get(move.userId) || 0;
          playersMovesCount.set(move.userId, count + 1);
        }
        
        let winnerId = 'bot';
        let maxMoves = 0;
        for (const [playerId, movesCount] of playersMovesCount) {
          if (movesCount > maxMoves) {
            maxMoves = movesCount;
            winnerId = playerId;
          }
        }
        
        await db.update(gameSessions).set({ 
          status: 'finished', 
          winnerId: winnerId, 
          finishedAt: finishedAt 
        }).where(eq(gameSessions.id, input.sessionId));
        
        if (winnerId !== 'bot') {
          const [userStats] = await db.select().from(users).where(eq(users.id, winnerId));
          const currentWins = (userStats?.wins || 0) + 1;
          const currentBestTime = userStats?.bestTime || duration;
          const newBestTime = duration < currentBestTime ? duration : currentBestTime;
          
          await db.update(users).set({ 
            wins: currentWins,
            bestTime: newBestTime
          }).where(eq(users.id, winnerId));
        }
        
        const humanPlayers = players.filter(p => p.userId !== 'bot');
        
        await db.insert(matchHistory).values({
          sessionId: input.sessionId,
          players: humanPlayers.map(p => ({ 
            id: p.userId, 
            username: p.userId === 'bot' ? 'Бот' : `Игрок ${p.userId}`,
            color: p.color, 
            errors: p.errors ?? 0,
            completed: true,
            progress: playersMovesCount.get(p.userId) || 0
          })),
          winnerId: winnerId,
          duration,
        });
      }
      
      return { success: true, number: numberToTake, isValid };
    }),
  
  // Получение состояния игры
  getGameState: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session) throw new Error('Game not found');
      
      const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      const moves = await db.select().from(gameMoves).where(eq(gameMoves.sessionId, input.sessionId));
      
      const takenNumbers = new Map();
      const playerMoves = new Map();
      
      moves.forEach(move => {
        if (move.isValid && !takenNumbers.has(move.number)) {
          const player = players.find(p => p.userId === move.userId);
          takenNumbers.set(move.number, player?.color);
          
          if (!playerMoves.has(move.userId)) {
            playerMoves.set(move.userId, []);
          }
          playerMoves.get(move.userId).push(move.number);
        }
      });
      
      const currentNumber = moves.filter(m => m.isValid).length + 1;
      
      return {
        table: session.tableData,
        status: session.status,
        winnerId: session.winnerId,
        players: players.map(p => ({
          userId: p.userId,
          isBot: p.userId === 'bot',
          color: p.color,
          errors: p.errors ?? 0,
          completed: !!p.completedAt,
          progress: playerMoves.get(p.userId)?.length || 0,
        })),
        takenNumbers: Object.fromEntries(takenNumbers),
        currentNumber: currentNumber > 25 ? 25 : currentNumber,
      };
    }),
  
  // Получение активных игровых сессий
  getActiveSessions: protectedProcedure
    .query(async () => {
      const sessions = await db
        .select({
          id: gameSessions.id,
          name: gameSessions.name,
          status: gameSessions.status,
          isPrivate: gameSessions.isPrivate,
        })
        .from(gameSessions)
        .where(eq(gameSessions.status, 'waiting'))
        .orderBy(desc(gameSessions.createdAt))
        .limit(20);
      
      const sessionsWithPlayers = await Promise.all(
        sessions.map(async (session) => {
          const players = await db
            .select()
            .from(gamePlayers)
            .where(eq(gamePlayers.sessionId, session.id));
          
          return {
            id: session.id,
            name: session.name || `Комната ${session.id}`,
            players: players.length,
            maxPlayers: 4,
            status: session.status,
            isPrivate: session.isPrivate || false,
          };
        })
      );
      
      return sessionsWithPlayers;
    }),
  
  // Получение истории матчей
  getMatchHistory: protectedProcedure
    .query(async () => {
      const history = await db.select().from(matchHistory)
        .orderBy(desc(matchHistory.createdAt))
        .limit(50);
      return history;
    }),
  
  // Получение рейтинга игроков
  getLeaderboard: protectedProcedure
    .query(async () => {
      const leaderboard = await db
        .select({
          id: users.id,
          username: users.username,
          wins: users.wins,
          bestTime: users.bestTime,
        })
        .from(users)
        .orderBy(desc(users.wins))
        .limit(50);
      
      return leaderboard;
    }),
});