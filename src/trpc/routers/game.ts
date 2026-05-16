import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '@/db';
import { gameSessions, gamePlayers, gameMoves, matchHistory, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateSchulteTable } from '@/lib/schulte';

const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

export const gameRouter = router({
  createGame: protectedProcedure
    .input(z.object({ maxPlayers: z.number().min(2).max(4), withBot: z.boolean().default(false), name: z.string().optional(), isPrivate: z.boolean().optional(), password: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      // Проверка на активную игру
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
        maxPlayers: input.maxPlayers 
      }).returning();
      
      if (!newSession) throw new Error('Не удалось создать игровую сессию');
      
      await db.insert(gamePlayers).values({ 
        sessionId: newSession.id, 
        userId: ctx.user.id, 
        color: colors[0], 
        order: 0, 
        isBot: false, 
        progress: 0,
        errors: 0
      });
      
      return { sessionId: newSession.id };
    }),
  
  startBotGame: protectedProcedure.mutation(async ({ ctx }) => {
    // Проверка на активную игру
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
      status: 'active', 
      name: 'Игра с ботом', 
      isPrivate: false, 
      maxPlayers: 2 
    }).returning();
    
    if (!newSession) throw new Error('Не удалось создать игру с ботом');
    
    // Добавляем игрока
    await db.insert(gamePlayers).values({ 
      sessionId: newSession.id, 
      userId: ctx.user.id, 
      color: colors[0], 
      order: 0, 
      isBot: false, 
      progress: 0,
      errors: 0
    });
    
    // Добавляем бота
    await db.insert(gamePlayers).values({ 
      sessionId: newSession.id, 
      userId: 'bot_system', 
      isBot: true, 
      color: colors[1], 
      order: 1, 
      name: 'Бот', 
      progress: 0,
      errors: 0
    });
    
    return { sessionId: newSession.id };
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
      isBot: false, 
      progress: 0,
      errors: 0
    });
    
    const newHumanPlayers = humanPlayers.length + 1;
    if (newHumanPlayers >= 2) await db.update(gameSessions).set({ status: 'active' }).where(eq(gameSessions.id, input.sessionId));
    return { success: true };
  }),
  
  exitGame: protectedProcedure.input(z.object({ sessionId: z.number() })).mutation(async ({ input, ctx }) => {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
    if (!session) throw new Error('Game not found');
    
    if (session.status === 'finished') return { success: true };
    
    const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
    const currentPlayer = players.find(p => p.userId === ctx.user.id && !p.isBot);
    if (!currentPlayer) throw new Error('Not a player');
    
    await db.delete(gamePlayers).where(eq(gamePlayers.id, currentPlayer.id));
    
    if (session.status === 'active') {
      const finishedAt = new Date();
      const duration = Math.floor((finishedAt.getTime() - new Date(session.createdAt!).getTime()) / 1000);
      
      await db.insert(matchHistory).values({
        sessionId: input.sessionId,
        players: [{ 
          id: ctx.user.id, 
          username: ctx.user.name || 'Вы',
          color: currentPlayer.color, 
          errors: currentPlayer.errors || 0,
          completed: false,
          progress: currentPlayer.progress || 0
        }],
        winnerId: 'opponent',
        duration,
      });
    }
    
    const remainingPlayers = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
    
    if (remainingPlayers.length === 0) {
      await db.delete(gameMoves).where(eq(gameMoves.sessionId, input.sessionId));
      await db.delete(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
      await db.delete(gameSessions).where(eq(gameSessions.id, input.sessionId));
      return { success: true, roomDeleted: true };
    }
    
    if (session.status === 'waiting' && remainingPlayers.length > 0) {
      const sortedPlayers = [...remainingPlayers].sort((a, b) => a.order - b.order);
      for (let i = 0; i < sortedPlayers.length; i++) {
        await db.update(gamePlayers).set({ order: i }).where(eq(gamePlayers.id, sortedPlayers[i].id));
      }
    }
    
    return { success: true };
  }),
  
  makeMove: protectedProcedure.input(z.object({ sessionId: z.number(), number: z.number() })).mutation(async ({ input, ctx }) => {
    const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
    if (!session) throw new Error('Game not found');
    if (session.status === 'finished') return { valid: false, message: 'Игра уже закончена' };
    
    const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
    const currentPlayer = players.find(p => p.userId === ctx.user.id && !p.isBot);
    if (!currentPlayer) throw new Error('Not a player');
    
    const allValidMoves = await db.select().from(gameMoves).where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
    const nextNumber = allValidMoves.length + 1;
    if (nextNumber > 25) return { valid: false, message: 'Игра уже закончена' };
    
    if (input.number !== nextNumber) {
      await db.insert(gameMoves).values({ sessionId: input.sessionId, userId: ctx.user.id, number: input.number, isValid: false, timestamp: new Date() });
      await db.update(gamePlayers).set({ errors: (currentPlayer.errors || 0) + 1 }).where(eq(gamePlayers.id, currentPlayer.id));
      return { valid: false, message: `Нужно нажать ${nextNumber}!` };
    }
    
    const existingMove = await db.select().from(gameMoves).where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.number, input.number), eq(gameMoves.isValid, true)));
    if (existingMove.length > 0) {
      await db.insert(gameMoves).values({ sessionId: input.sessionId, userId: ctx.user.id, number: input.number, isValid: false, timestamp: new Date() });
      await db.update(gamePlayers).set({ errors: (currentPlayer.errors || 0) + 1 }).where(eq(gamePlayers.id, currentPlayer.id));
      return { valid: false, message: `Число ${input.number} уже занято!` };
    }
    
    await db.insert(gameMoves).values({ sessionId: input.sessionId, userId: ctx.user.id, number: input.number, isValid: true, timestamp: new Date() });
    
    const playerValidMoves = await db.select().from(gameMoves).where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.userId, ctx.user.id), eq(gameMoves.isValid, true)));
    await db.update(gamePlayers).set({ progress: playerValidMoves.length }).where(eq(gamePlayers.id, currentPlayer.id));
    
    const totalValidMoves = allValidMoves.length + 1;
    
    if (totalValidMoves === 25) {
      const finishedAt = new Date();
      const duration = Math.floor((finishedAt.getTime() - new Date(session.createdAt!).getTime()) / 1000);
      
      const allValidMovesData = await db.select().from(gameMoves).where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
      const playersMovesCount = new Map<string, number>();
      for (const move of allValidMovesData) {
        playersMovesCount.set(move.userId, (playersMovesCount.get(move.userId) || 0) + 1);
      }
      
      let winnerId = 'bot';
      let maxMoves = 0;
      for (const [playerId, movesCount] of playersMovesCount) {
        if (movesCount > maxMoves) {
          maxMoves = movesCount;
          winnerId = playerId;
        }
      }
      
      await db.update(gameSessions).set({ status: 'finished', winnerId, finishedAt }).where(eq(gameSessions.id, input.sessionId));
      
      if (winnerId !== 'bot') {
        const [userStats] = await db.select().from(users).where(eq(users.id, winnerId));
        const currentWins = (userStats?.wins || 0) + 1;
        const currentBestTime = userStats?.bestTime || duration;
        const newBestTime = duration < currentBestTime ? duration : currentBestTime;
        await db.update(users).set({ wins: currentWins, bestTime: newBestTime }).where(eq(users.id, winnerId));
      }
      
      const humanPlayers = players.filter(p => !p.isBot);
      for (const player of humanPlayers) {
        const playerMovesCount = playersMovesCount.get(player.userId!) || 0;
        const isWinner = winnerId === player.userId;
        
        await db.insert(matchHistory).values({
          sessionId: input.sessionId,
          players: [{
            id: player.userId,
            username: player.userId === ctx.user.id ? 'Вы' : `Игрок ${player.userId?.slice(0, 4)}`,
            color: player.color,
            errors: player.errors || 0,
            completed: true,
            progress: playerMovesCount,
          }],
          winnerId: isWinner ? player.userId! : (winnerId === 'bot' ? 'bot' : 'opponent'),
          duration,
        });
      }
    }
    
    return { valid: true, number: input.number, playerColor: currentPlayer.color };
  }),
  
  makeBotMove: protectedProcedure.input(z.object({ sessionId: z.number() })).mutation(async ({ input }) => {
    try {
      console.log('makeBotMove called for session:', input.sessionId);
      
      // Получаем сессию
      const [session] = await db.select().from(gameSessions).where(eq(gameSessions.id, input.sessionId));
      if (!session) {
        console.log('Session not found');
        return { success: false, error: 'Session not found' };
      }
      
      if (session.status !== 'active') {
        console.log('Game is not active, status:', session.status);
        return { success: false, error: 'Game is not active' };
      }
      
      // Получаем бота
      const [botPlayer] = await db
        .select()
        .from(gamePlayers)
        .where(and(eq(gamePlayers.sessionId, input.sessionId), eq(gamePlayers.isBot, true)));
      
      if (!botPlayer) {
        console.log('Bot player not found');
        return { success: false, error: 'Bot not found' };
      }
      
      // Получаем все правильные ходы
      const allValidMoves = await db
        .select()
        .from(gameMoves)
        .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
      
      const nextNumber = allValidMoves.length + 1;
      console.log('Next number:', nextNumber);
      
      if (nextNumber > 25) {
        console.log('Game already finished');
        return { success: false, error: 'Game finished' };
      }
      
      // Проверяем, не занято ли уже число
      const existingMove = await db
        .select()
        .from(gameMoves)
        .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.number, nextNumber), eq(gameMoves.isValid, true)));
      
      if (existingMove.length > 0) {
        console.log('Number already taken');
        return { success: false, error: 'Number already taken' };
      }
      
      // Бот ошибается редко (5%)
      const willMakeError = Math.random() < 0.05;
      let numberToTake = nextNumber;
      let isValid = true;
      
      if (willMakeError && nextNumber < 25) {
        numberToTake = Math.min(nextNumber + 1, 25);
        isValid = false;
        console.log('Bot will make error, taking:', numberToTake);
      }
      
      // Делаем ход
      await db.insert(gameMoves).values({ 
        sessionId: input.sessionId, 
        userId: botPlayer.userId || 'bot_system', 
        number: numberToTake, 
        isValid, 
        timestamp: new Date() 
      });
      
      if (!isValid) {
        await db.update(gamePlayers)
          .set({ errors: (botPlayer.errors || 0) + 1 })
          .where(eq(gamePlayers.id, botPlayer.id));
      } else {
        const botValidMoves = await db
          .select()
          .from(gameMoves)
          .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.userId, botPlayer.userId || 'bot_system'), eq(gameMoves.isValid, true)));
        
        await db.update(gamePlayers)
          .set({ progress: botValidMoves.length })
          .where(eq(gamePlayers.id, botPlayer.id));
      }
      
      const totalValidMoves = allValidMoves.length + (isValid ? 1 : 0);
      console.log('Total valid moves:', totalValidMoves);
      
      // Проверяем окончание игры
      if (totalValidMoves === 25) {
        console.log('Game finished!');
        const finishedAt = new Date();
        const duration = Math.floor((finishedAt.getTime() - new Date(session.createdAt!).getTime()) / 1000);
        const players = await db.select().from(gamePlayers).where(eq(gamePlayers.sessionId, input.sessionId));
        const allMoves = await db
          .select()
          .from(gameMoves)
          .where(and(eq(gameMoves.sessionId, input.sessionId), eq(gameMoves.isValid, true)));
        
        const playersMovesCount = new Map<string, number>();
        for (const move of allMoves) {
          playersMovesCount.set(move.userId, (playersMovesCount.get(move.userId) || 0) + 1);
        }
        
        let winnerId = 'bot_system';
        let maxMoves = 0;
        for (const [playerId, movesCount] of playersMovesCount) {
          if (movesCount > maxMoves) {
            maxMoves = movesCount;
            winnerId = playerId;
          }
        }
        
        await db.update(gameSessions).set({ status: 'finished', winnerId, finishedAt }).where(eq(gameSessions.id, input.sessionId));
        
        if (winnerId !== 'bot_system') {
          const [userStats] = await db.select().from(users).where(eq(users.id, winnerId));
          const currentWins = (userStats?.wins || 0) + 1;
          const currentBestTime = userStats?.bestTime || duration;
          const newBestTime = duration < currentBestTime ? duration : currentBestTime;
          await db.update(users).set({ wins: currentWins, bestTime: newBestTime }).where(eq(users.id, winnerId));
        }
        
        const humanPlayers = players.filter(p => !p.isBot);
        for (const player of humanPlayers) {
          const playerMovesCount = playersMovesCount.get(player.userId!) || 0;
          const isWinner = winnerId === player.userId;
          
          await db.insert(matchHistory).values({
            sessionId: input.sessionId,
            players: [{
              id: player.userId,
              username: player.userId === 'bot_system' ? 'Бот' : `Игрок ${player.userId?.slice(0, 4)}`,
              color: player.color,
              errors: player.errors || 0,
              completed: true,
              progress: playerMovesCount,
            }],
            winnerId: isWinner ? player.userId! : (winnerId === 'bot_system' ? 'bot' : 'opponent'),
            duration,
          });
        }
      }
      
      return { success: true, number: numberToTake, isValid };
    } catch (error) {
      console.error('makeBotMove error:', error);
      return { success: false, error: String(error) };
    }
  }),
  
  getGameState: protectedProcedure.input(z.object({ sessionId: z.number() })).query(async ({ input }) => {
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
        if (!playerMoves.has(move.userId)) playerMoves.set(move.userId, []);
        playerMoves.get(move.userId).push(move.number);
      }
    });
    
    const currentNumber = moves.filter(m => m.isValid).length + 1;
    return {
      table: session.tableData,
      status: session.status,
      winnerId: session.winnerId,
      players: players.map(p => ({
        userId: p.userId || (p.isBot ? 'bot_system' : 'unknown'),
        isBot: p.isBot || false,
        color: p.color,
        errors: p.errors || 0,
        completed: !!p.completedAt,
        progress: p.progress || 0,
        name: p.name,
      })),
      takenNumbers: Object.fromEntries(takenNumbers),
      currentNumber: currentNumber > 25 ? 25 : currentNumber,
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