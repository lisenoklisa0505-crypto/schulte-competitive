ALTER TABLE "users" ADD COLUMN "wins" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "best_time" double precision DEFAULT 0;--> statement-breakpoint
ALTER TABLE "match_history" DROP COLUMN "ratings_change";