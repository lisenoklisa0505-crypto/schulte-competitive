import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  doublePrecision,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ──────────────────────────────────────────────────────────────────────────────
// Auth tables (better-auth managed — не меняем структуру)
// ──────────────────────────────────────────────────────────────────────────────

export const users = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  name: text('name'),
  username: text('username').unique(),
  password: text('password'),
  rating: integer('rating').default(1000),
  wins: integer('wins').default(0),
  bestTime: doublePrecision('best_time').default(0),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  providerUserId: text('provider_user_id'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Game tables
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Игровые сессии.
 *
 * ✅ ИЗМЕНЕНИЕ: id теперь text (UUID), генерируется через gen_random_uuid() на стороне БД.
 * Причины:
 *  1. Serial-integer легко перебирается: зная id=42, можно попробовать 41, 43 и т.д.
 *  2. UUID v4 криптографически случаен — 2^122 вариантов, перебор невозможен.
 *  3. UUID стандартен для публичных API и совместим с будущей федерацией/шардингом.
 *
 * Миграция для существующей БД:
 *   ALTER TABLE game_sessions ADD COLUMN new_id uuid DEFAULT gen_random_uuid();
 *   -- обновить FK в game_players, game_moves, match_history
 *   -- переименовать колонки
 */
export const gameSessions = pgTable('game_sessions', {
  // text + default генерирует UUID на уровне БД без зависимости от JS-библиотеки
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tableData: jsonb('table_data').notNull(),
  status: text('status').default('waiting'), // 'waiting' | 'active' | 'finished'
  winnerId: text('winner_id'),
  name: text('name').default(''),
  isPrivate: boolean('is_private').default(false),
  password: text('password'),
  maxPlayers: integer('max_players').default(4),
  createdAt: timestamp('created_at').defaultNow(),
  startedAt: timestamp('started_at'),
  finishedAt: timestamp('finished_at'),
});

export const gamePlayers = pgTable('game_players', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  // ✅ FK обновлён на text
  sessionId: text('session_id')
    .notNull()
    .references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  isBot: boolean('is_bot').default(false),
  name: text('name'),
  color: text('color').notNull(),
  completedAt: timestamp('completed_at'),
  errors: integer('errors').default(0),
  progress: integer('progress').default(0),
  order: integer('order').notNull(),
});

export const gameMoves = pgTable(
  'game_moves',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // ✅ FK обновлён на text
    sessionId: text('session_id')
      .notNull()
      .references(() => gameSessions.id, { onDelete: 'cascade' }),
    userId: text('user_id'),
    number: integer('number').notNull(),
    timestamp: timestamp('timestamp').defaultNow(),
    isValid: boolean('is_valid').notNull(),
  },
  table => ({
    uniqueValidNumber: uniqueIndex('unique_valid_number').on(
      table.sessionId,
      table.number,
    ),
  }),
);

export const matchHistory = pgTable('match_history', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  // ✅ FK обновлён на text
  sessionId: text('session_id')
    .notNull()
    .references(() => gameSessions.id, { onDelete: 'cascade' }),
  players: jsonb('players').notNull(),
  winnerId: text('winner_id').notNull(),
  duration: integer('duration'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Типы (вывод из схемы, используются в роутерах)
// ──────────────────────────────────────────────────────────────────────────────

export type GameSession = typeof gameSessions.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type GameMove = typeof gameMoves.$inferSelect;
export type MatchHistory = typeof matchHistory.$inferSelect;
