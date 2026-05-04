CREATE TABLE "game_moves" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"number" integer NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"is_valid" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"color" text NOT NULL,
	"completed_at" timestamp,
	"errors" integer DEFAULT 0,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_data" jsonb NOT NULL,
	"status" text DEFAULT 'waiting',
	"winner_id" integer,
	"created_at" timestamp DEFAULT now(),
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "match_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"players" jsonb NOT NULL,
	"winner_id" integer NOT NULL,
	"duration" integer,
	"ratings_change" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"rating" integer DEFAULT 1000,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
