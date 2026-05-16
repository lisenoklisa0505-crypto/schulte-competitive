import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { db } from '@/db';
import {
  gameSessions,
  gamePlayers,
  gameMoves,
  matchHistory,
  users,
} from '@/db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { generateSchulteTable } from '@/lib/schulte';
import { sseBus } from '@/lib/sse-bus';
import { checkRateLimit } from '@/lib/rate-limit';

// ─────────────────────────────────────────────────────────────────────────────
// Константы
// ─────────────────────────────────────────────────────────────────────────────

const PLAYER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'] as const;
const TABLE_SIZE = 5;
const MAX_NUMBER = TABLE_SIZE * TABLE_SIZE; // 25

// ─────────────────────────────────────────────────────────────────────────────
// Вспомогательные типы
// ─────────────────────────────────────────────────────────────────────────────

interface MoveResult {
  valid: boolean;
  message?: string;
  number?: number;
  playerColor?: string;
  isFinished?: boolean;
  winnerId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// performMove — атомарная обработка хода внутри транзакции
// ─────────────────────────────────────────────────────────────────────────────

async function performMove(
  sessionId: string,
  userId: string | null,
  number: number,
  isBot: boolean = false,
): Promise<MoveResult> {
  return db.transaction(async tx => {
    // Блокируем строку сессии на время транзакции (защита от гонок)
    const [session] = await tx
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, sessionId))
      .for('update');

    if (!session || session.status !== 'active') {
      return { valid: false, message: 'Игра не активна' };
    }

    const players = await tx
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.sessionId, sessionId));

    const currentPlayer = players.find(p =>
      isBot ? p.isBot : p.userId === userId,
    );

    if (!currentPlayer) {
      return { valid: false, message: 'Игрок не найден' };
    }

    // Считаем только валидные ходы — они определяют следующее нужное число
    const validMoves = await tx
      .select()
      .from(gameMoves)
      .where(and(eq(gameMoves.sessionId, sessionId), eq(gameMoves.isValid, true)));

    const nextNumber = validMoves.length + 1;

    if (nextNumber > MAX_NUMBER) {
      return { valid: false, message: 'Игра уже завершена' };
    }

    // Неверное число
    if (number !== nextNumber) {
      // Невалидные ходы бота не пишем в БД: уникальный индекс (sessionId, number)
      // распространяется на все записи — повторная попытка того же числа упадёт с ошибкой.
      if (!isBot) {
        await tx.insert(gameMoves).values({
          sessionId,
          userId,
          number,
          isValid: false,
          timestamp: new Date(),
        });
      }
      await tx
        .update(gamePlayers)
        .set({ errors: (currentPlayer.errors ?? 0) + 1 })
        .where(eq(gamePlayers.id, currentPlayer.id));

      return { valid: false, message: `Нужно нажать ${nextNumber}` };
    }

    // Проверяем, не занято ли число (явная проверка вместо try/catch на уникальный индекс)
    const alreadyTaken = validMoves.find(m => m.number === number);
    if (alreadyTaken) {
      return { valid: false, message: `Число ${number} уже занято` };
    }

    await tx.insert(gameMoves).values({
      sessionId,
      userId: isBot ? null : userId,
      number,
      isValid: true,
      timestamp: new Date(),
    });

    const newValidCount = validMoves.length + 1;
    await tx
      .update(gamePlayers)
      .set({ progress: newValidCount })
      .where(eq(gamePlayers.id, currentPlayer.id));

    // ── Проверка завершения игры ────────────────────────────────────────────
    let isFinished = false;
    let winnerId: string | null = null;

    if (newValidCount === MAX_NUMBER) {
      isFinished = true;
      // Для бота userId=null — храним строку 'bot', чтобы не путать с NULL в БД
      winnerId = isBot ? 'bot' : userId;

      const finishedAt = new Date();
      const duration = Math.floor(
        (finishedAt.getTime() - new Date(session.startedAt!).getTime()) / 1000,
      );

      await tx
        .update(gameSessions)
        .set({ status: 'finished', winnerId, finishedAt })
        .where(eq(gameSessions.id, sessionId));

      // Обновляем статистику только живых победителей
      if (!isBot && winnerId) {
        const [userStats] = await tx
          .select()
          .from(users)
          .where(eq(users.id, winnerId));

        const newWins = (userStats?.wins ?? 0) + 1;
        const prev = userStats?.bestTime ?? duration;
        const newBest = duration < prev ? duration : prev;

        await tx
          .update(users)
          .set({ wins: newWins, bestTime: newBest })
          .where(eq(users.id, winnerId));
      }

      const humanPlayers = players.filter(p => !p.isBot);
      await tx.insert(matchHistory).values({
        sessionId,
        players: humanPlayers.map(p => ({
          id: p.userId,
          username:
            p.userId === userId ? 'Вы' : `Игрок ${p.userId?.slice(0, 4)}`,
          color: p.color,
          errors: p.errors ?? 0,
          completed: p.userId === userId && !isBot,
          progress:
            p.userId === userId ? (isBot ? p.progress ?? 0 : MAX_NUMBER) : (p.progress ?? 0),
        })),
        winnerId: winnerId ?? 'bot',
        duration,
      });
    }

    return {
      valid: true,
      number,
      playerColor: currentPlayer.color,
      isFinished,
      winnerId,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const gameRouter = router({
  // ── Создание мультиплеерной комнаты ──────────────────────────────────────

  createGame: protectedProcedure
    .input(
      z.object({
        maxPlayers: z.number().min(2).max(4),
        withBot: z.boolean().default(false),
        name: z.string().min(1).max(40),
        isPrivate: z.boolean().optional(),
        password: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Не даём создать вторую активную игру
      const existing = await db
        .select({ id: gameSessions.id })
        .from(gameSessions)
        .innerJoin(gamePlayers, eq(gamePlayers.sessionId, gameSessions.id))
        .where(
          and(
            eq(gamePlayers.userId, ctx.user.id),
            eq(gameSessions.status, 'active'),
          ),
        );

      if (existing.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'У вас уже есть активная игра. Завершите её или выйдите.',
        });
      }

      const tableData = generateSchulteTable(TABLE_SIZE);

      // ① UUID генерируется автоматически через default gen_random_uuid() в схеме
      const [newSession] = await db
        .insert(gameSessions)
        .values({
          tableData,
          status: 'waiting',
          name: input.name,
          isPrivate: input.isPrivate ?? false,
          password: input.isPrivate ? (input.password ?? null) : null,
          maxPlayers: input.maxPlayers,
          startedAt: null,
          finishedAt: null,
        })
        .returning();

      if (!newSession) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось создать сессию',
        });
      }

      await db.insert(gamePlayers).values({
        sessionId: newSession.id,
        userId: ctx.user.id,
        color: PLAYER_COLORS[0],
        order: 0,
        isBot: false,
      });

      return { sessionId: newSession.id };
    }),

  // ── Игра против бота ─────────────────────────────────────────────────────

  startBotGame: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await db
      .select({ id: gameSessions.id })
      .from(gameSessions)
      .innerJoin(gamePlayers, eq(gamePlayers.sessionId, gameSessions.id))
      .where(
        and(
          eq(gamePlayers.userId, ctx.user.id),
          eq(gameSessions.status, 'active'),
        ),
      );

    if (existing.length > 0) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'У вас уже есть активная игра. Завершите её или выйдите.',
      });
    }

    const tableData = generateSchulteTable(TABLE_SIZE);
    const now = new Date();

    const [newSession] = await db
      .insert(gameSessions)
      .values({
        tableData,
        status: 'active',
        name: 'Игра с ботом',
        isPrivate: false,
        maxPlayers: 2,
        startedAt: now,
        finishedAt: null,
      })
      .returning();

    if (!newSession) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Не удалось создать игру с ботом',
      });
    }

    await db.insert(gamePlayers).values([
      {
        sessionId: newSession.id,
        userId: ctx.user.id,
        color: PLAYER_COLORS[0],
        order: 0,
        isBot: false,
      },
      {
        sessionId: newSession.id,
        userId: null,
        isBot: true,
        color: PLAYER_COLORS[1],
        order: 1,
        name: 'Бот',
      },
    ]);

    // ② Уведомляем SSE (хотя подписчиков ещё нет — клиент подключится позже)
    sseBus.publish(newSession.id, {
      type: 'start',
      payload: { sessionId: newSession.id, startedAt: now.getTime() },
    });

    return { sessionId: newSession.id, startedAt: now.getTime() };
  }),

  // ── Присоединение к комнате ───────────────────────────────────────────────

  joinGame: protectedProcedure
    .input(
      z.object({
        // ① sessionId теперь UUID-строка
        sessionId: z.string().uuid(),
        password: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [session] = await db
        .select()
        .from(gameSessions)
        .where(eq(gameSessions.id, input.sessionId));

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Комната не найдена' });
      }
      if (session.status !== 'waiting') {
        throw new TRPCError({ code: 'CONFLICT', message: 'Игра уже началась' });
      }
      if (session.isPrivate && session.password !== input.password) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Неверный пароль' });
      }

      const players = await db
        .select()
        .from(gamePlayers)
        .where(eq(gamePlayers.sessionId, input.sessionId));

      const humanPlayers = players.filter(p => !p.isBot);

      if (humanPlayers.some(p => p.userId === ctx.user.id)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Вы уже в этой игре' });
      }
      if (humanPlayers.length >= (session.maxPlayers ?? 4)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Комната заполнена' });
      }
      if (players.some(p => p.isBot)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Игра уже началась с ботом' });
      }

      await db.insert(gamePlayers).values({
        sessionId: input.sessionId,
        userId: ctx.user.id,
        color: PLAYER_COLORS[humanPlayers.length],
        order: humanPlayers.length,
        isBot: false,
      });

      // ② SSE: уведомляем уже подключённых игроков о новом участнике
      sseBus.publish(input.sessionId, {
        type: 'join',
        payload: { userId: ctx.user.id },
      });

      const newCount = humanPlayers.length + 1;
      if (newCount >= 2) {
        await db
          .update(gameSessions)
          .set({ status: 'active', startedAt: new Date() })
          .where(eq(gameSessions.id, input.sessionId));

        sseBus.publish(input.sessionId, {
          type: 'start',
          payload: { sessionId: input.sessionId },
        });
      }

      return { success: true };
    }),

  // ── Выход из комнаты ─────────────────────────────────────────────────────

  exitGame: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return db.transaction(async tx => {
        const [session] = await tx
          .select()
          .from(gameSessions)
          .where(eq(gameSessions.id, input.sessionId));

        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Сессия не найдена' });
        }
        if (session.status === 'finished') return { success: true };

        const players = await tx
          .select()
          .from(gamePlayers)
          .where(eq(gamePlayers.sessionId, input.sessionId));

        const currentPlayer = players.find(
          p => p.userId === ctx.user.id && !p.isBot,
        );
        if (!currentPlayer) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Вы не участник игры' });
        }

        await tx
          .delete(gamePlayers)
          .where(eq(gamePlayers.id, currentPlayer.id));

        if (session.status === 'active') {
          const finishedAt = new Date();
          const duration = Math.floor(
            (finishedAt.getTime() - new Date(session.startedAt!).getTime()) / 1000,
          );

          await tx.insert(matchHistory).values({
            sessionId: input.sessionId,
            players: [
              {
                id: ctx.user.id,
                username: 'Вы',
                color: currentPlayer.color,
                errors: currentPlayer.errors ?? 0,
                completed: false,
                progress: currentPlayer.progress ?? 0,
              },
            ],
            winnerId: 'opponent',
            duration,
          });
        }

        const remaining = await tx
          .select()
          .from(gamePlayers)
          .where(eq(gamePlayers.sessionId, input.sessionId));

        if (remaining.length === 0) {
          await tx.delete(gameMoves).where(eq(gameMoves.sessionId, input.sessionId));
          await tx.delete(gameSessions).where(eq(gameSessions.id, input.sessionId));
          return { success: true, roomDeleted: true };
        }

        if (session.status === 'waiting') {
          const sorted = [...remaining].sort((a, b) => a.order - b.order);
          for (let i = 0; i < sorted.length; i++) {
            await tx
              .update(gamePlayers)
              .set({ order: i })
              .where(eq(gamePlayers.id, sorted[i].id));
          }
        }

        // ② Уведомляем оставшихся игроков
        sseBus.publish(input.sessionId, {
          type: 'leave',
          payload: { userId: ctx.user.id },
        });

        return { success: true };
      });
    }),

  // ── Ход игрока ────────────────────────────────────────────────────────────

  makeMove: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid(), number: z.number().min(1).max(25) }))
    .mutation(async ({ input, ctx }) => {
      // ④ Rate limiting: 8 ходов за 3 секунды
      const rlKey = `${ctx.user.id}:${input.sessionId}`;
      const rl = checkRateLimit(rlKey, 8, 3_000);

      if (!rl.allowed) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Слишком много запросов. Попробуйте через ${Math.ceil((rl.resetAt - Date.now()) / 1000)} сек.`,
        });
      }

      const result = await performMove(
        input.sessionId,
        ctx.user.id,
        input.number,
        false,
      );

      // ② Публикуем событие хода в SSE (независимо от valid — клиент перезапросит состояние)
      if (result.valid) {
        sseBus.publish(input.sessionId, {
          type: result.isFinished ? 'finish' : 'move',
          payload: {
            number: input.number,
            userId: ctx.user.id,
            color: result.playerColor,
            winnerId: result.winnerId ?? null,
          },
        });
      }

      return result;
    }),

  // ── Ход бота ─────────────────────────────────────────────────────────────

  makeBotMove: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Проверяем, что вызывающий является участником этой сессии
      const [callerPlayer] = await db
        .select({ id: gamePlayers.id })
        .from(gamePlayers)
        .where(
          and(
            eq(gamePlayers.sessionId, input.sessionId),
            eq(gamePlayers.userId, ctx.user.id),
          ),
        );

      if (!callerPlayer) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Вы не участник этой игры' });
      }

      const [botPlayer] = await db
        .select()
        .from(gamePlayers)
        .where(
          and(
            eq(gamePlayers.sessionId, input.sessionId),
            eq(gamePlayers.isBot, true),
          ),
        );

      if (!botPlayer) return { success: false };

      const validMoves = await db
        .select()
        .from(gameMoves)
        .where(
          and(
            eq(gameMoves.sessionId, input.sessionId),
            eq(gameMoves.isValid, true),
          ),
        );

      const nextNumber = validMoves.length + 1;
      if (nextNumber > MAX_NUMBER) return { success: false };

      // Бот ошибается с вероятностью 12%
      const willErr = Math.random() < 0.12;
      let pickedNumber = nextNumber;

      if (willErr) {
        const variants = [-2, -1, 1, 2]
          .map(d => nextNumber + d)
          .filter(n => n >= 1 && n <= MAX_NUMBER && n !== nextNumber);
        if (variants.length > 0) {
          pickedNumber = variants[Math.floor(Math.random() * variants.length)];
        }
      }

      const result = await performMove(input.sessionId, null, pickedNumber, true);

      if (result.valid) {
        sseBus.publish(input.sessionId, {
          type: result.isFinished ? 'finish' : 'move',
          payload: {
            number: pickedNumber,
            userId: null,
            isBot: true,
            color: botPlayer.color,
            winnerId: result.winnerId ?? null,
          },
        });
      }

      return { success: result.valid, number: pickedNumber, isValid: result.valid };
    }),

  // ── Получение состояния игры ──────────────────────────────────────────────

  getGameState: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [session] = await db
        .select()
        .from(gameSessions)
        .where(eq(gameSessions.id, input.sessionId));

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Сессия не найдена' });
      }

      const players = await db
        .select()
        .from(gamePlayers)
        .where(eq(gamePlayers.sessionId, input.sessionId));

      const moves = await db
        .select()
        .from(gameMoves)
        .where(eq(gameMoves.sessionId, input.sessionId));

      const playerMap = new Map(players.map(p => [p.userId, p]));
      const takenNumbers: Record<number, string> = {};
      const playerProgress: Record<string, number> = {};

      for (const move of moves) {
        if (!move.isValid) continue;
        if (!takenNumbers[move.number]) {
          const player =
            move.userId === null
              ? players.find(p => p.isBot)
              : playerMap.get(move.userId ?? '');
          if (player) takenNumbers[move.number] = player.color;
        }
        const key = move.userId ?? 'bot';
        playerProgress[key] = (playerProgress[key] ?? 0) + 1;
      }

      const validCount = moves.filter(m => m.isValid).length;
      const currentNumber = Math.min(validCount + 1, MAX_NUMBER);
      const myPlayer = players.find(p => p.userId === ctx.user.id && !p.isBot);

      return {
        table: session.tableData,
        status: session.status,
        winnerId: session.winnerId,
        startedAt: session.startedAt ? new Date(session.startedAt).getTime() : null,
        finishedAt: session.finishedAt ? new Date(session.finishedAt).getTime() : null,
        players: players.map(p => ({
          userId: p.userId ?? null,
          isBot: p.isBot ?? false,
          color: p.color,
          errors: p.errors ?? 0,
          completed: !!p.completedAt,
          progress: playerProgress[p.userId ?? 'bot'] ?? 0,
          name: p.name,
        })),
        takenNumbers,
        currentNumber,
        maxPlayers: session.maxPlayers,
        myColor: myPlayer?.color ?? PLAYER_COLORS[0],
      };
    }),

  // ── Список открытых комнат (③ JOIN вместо N+1) ───────────────────────────

  getActiveSessions: protectedProcedure.query(async () => {
    /**
     * ③ Один запрос с LEFT JOIN + COUNT вместо N+1.
     *
     * Было:
     *   SELECT sessions (20 строк)
     *   + Promise.all(20 × SELECT gamePlayers WHERE sessionId = ?)  ← N+1
     *
     * Стало:
     *   SELECT sessions
     *   LEFT JOIN gamePlayers ON sessionId = sessions.id AND isBot = false
     *   GROUP BY sessions.id
     *   → один SQL-запрос
     */
    const rows = await db
      .select({
        id: gameSessions.id,
        name: gameSessions.name,
        status: gameSessions.status,
        isPrivate: gameSessions.isPrivate,
        maxPlayers: gameSessions.maxPlayers,
        // COUNT только живых игроков (не ботов)
        playerCount: count(gamePlayers.id),
      })
      .from(gameSessions)
      .leftJoin(
        gamePlayers,
        and(
          eq(gamePlayers.sessionId, gameSessions.id),
          eq(gamePlayers.isBot, false),
        ),
      )
      .where(eq(gameSessions.status, 'waiting'))
      .groupBy(
        gameSessions.id,
        gameSessions.name,
        gameSessions.status,
        gameSessions.isPrivate,
        gameSessions.maxPlayers,
      )
      .orderBy(desc(gameSessions.createdAt))
      .limit(20);

    return rows.map(r => ({
      id: r.id,
      name: r.name ?? `Комната ${r.id.slice(0, 8)}`,
      players: r.playerCount,
      maxPlayers: r.maxPlayers ?? 4,
      status: r.status,
      isPrivate: r.isPrivate ?? false,
    }));
  }),

  // ── История матчей ────────────────────────────────────────────────────────

  getMatchHistory: protectedProcedure.query(async () => {
    return db
      .select()
      .from(matchHistory)
      .orderBy(desc(matchHistory.createdAt))
      .limit(50);
  }),

  // ── Таблица лидеров ───────────────────────────────────────────────────────

  getLeaderboard: protectedProcedure.query(async () => {
    return db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        wins: users.wins,
        bestTime: users.bestTime,
      })
      .from(users)
      .orderBy(desc(users.wins))
      .limit(50);
  }),
});