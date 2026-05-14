import { pgTable, serial, text, timestamp, integer, jsonb, boolean, doublePrecision } from 'drizzle-orm/pg-core';

// ========== ТАБЛИЦЫ ДЛЯ BETTER-AUTH ==========
export const users = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name"),
  username: text("username").unique(),
  password: text("password"),
  rating: integer("rating").default(1000),
  wins: integer("wins").default(0),
  bestTime: doublePrecision("best_time").default(0),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  providerUserId: text("provider_user_id"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== ИГРОВЫЕ ТАБЛИЦЫ ==========
export const gameSessions = pgTable("game_sessions", {
  id: serial("id").primaryKey(),
  tableData: jsonb("table_data").notNull(),
  status: text("status").default("waiting"),
  winnerId: text("winner_id"),
  name: text("name").default(""),
  isPrivate: boolean("is_private").default(false),
  password: text("password"),
  maxPlayers: integer("max_players").default(4), // ← ДОБАВЛЕНО!
  createdAt: timestamp("created_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const gamePlayers = pgTable("game_players", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  color: text("color").notNull(),
  completedAt: timestamp("completed_at"),
  errors: integer("errors").default(0),
  order: integer("order").notNull(),
});

export const gameMoves = pgTable("game_moves", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  isValid: boolean("is_valid").notNull(),
});

export const matchHistory = pgTable("match_history", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => gameSessions.id, { onDelete: "cascade" }),
  players: jsonb("players").notNull(),
  winnerId: text("winner_id").notNull(),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow(),
});