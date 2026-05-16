ALTER TABLE "game_moves" DROP CONSTRAINT "game_moves_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "game_players" DROP CONSTRAINT "game_players_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "game_moves" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_moves" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "game_moves" ALTER COLUMN "session_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_moves" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_players" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_players" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "game_players" ALTER COLUMN "session_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_players" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "match_history" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "match_history" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "match_history" ALTER COLUMN "session_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "is_bot" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "game_players" ADD COLUMN "progress" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "started_at" timestamp;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_valid_number" ON "game_moves" USING btree ("session_id","number");