ALTER TABLE "meetings" ADD COLUMN "share_token" varchar(64);--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "session_state" jsonb;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_share_token_unique" UNIQUE("share_token");