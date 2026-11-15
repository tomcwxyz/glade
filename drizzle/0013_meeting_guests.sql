-- Additive: named guests who can take part in a live meeting without an account.
CREATE TABLE IF NOT EXISTS "meeting_guests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"label" varchar(100),
	"can_vote" boolean DEFAULT false NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp,
	CONSTRAINT "meeting_guests_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_guests" ADD CONSTRAINT "meeting_guests_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_guests" ADD CONSTRAINT "meeting_guests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meeting_guests_meeting_idx" ON "meeting_guests" USING btree ("meeting_id");
