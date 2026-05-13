import { pgTable, serial, text, timestamp, integer, jsonb, boolean, doublePrecision } from 'drizzle-orm/pg-core';

// ========== ОСНОВНЫЕ ТАБЛИЦЫ ДЛЯ ИГРЫ ==========

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  password: text('password').notNull(),
  rating: integer('rating').default(1000),
  wins: integer('wins').default(0),
  bestTime: doublePrecision('best_time').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const gameSessions = pgTable('game_sessions', {
  id: serial('id').primaryKey(),
  tableData: jsonb('table_data').notNull(),
  status: text('status').default('waiting'),
  winnerId: integer('winner_id'),
  name: text('name').default(''),
  isPrivate: boolean('is_private').default(false),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow(),
  finishedAt: timestamp('finished_at'),
});

export const gamePlayers = pgTable('game_players', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  userId: integer('user_id').notNull(),
  color: text('color').notNull(),
  completedAt: timestamp('completed_at'),
  errors: integer('errors').default(0),
  order: integer('order').notNull(),
});

export const gameMoves = pgTable('game_moves', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  userId: integer('user_id').notNull(),
  number: integer('number').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  isValid: boolean('is_valid').notNull(),
});

export const matchHistory = pgTable('match_history', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  players: jsonb('players').notNull(),
  winnerId: integer('winner_id').notNull(),
  duration: integer('duration'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ========== ТАБЛИЦЫ ДЛЯ BETTER-AUTH ==========

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  providerId: text("provider_id").notNull(),
  providerUserId: text("provider_user_id"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});
