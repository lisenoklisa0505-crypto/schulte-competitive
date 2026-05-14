ALTER TABLE "account" ADD COLUMN "account_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "max_players" integer DEFAULT 4;