ALTER TABLE "game_sessions" ADD COLUMN "name" text DEFAULT '';--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "is_private" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "password" text;