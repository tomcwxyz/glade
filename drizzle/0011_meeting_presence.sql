-- Additive: live meeting presence (who is in the room), for quorum and counts.
CREATE TABLE IF NOT EXISTS "meeting_presence" (
	"meeting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meeting_presence_meeting_id_user_id_pk" PRIMARY KEY("meeting_id","user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_presence" ADD CONSTRAINT "meeting_presence_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meeting_presence" ADD CONSTRAINT "meeting_presence_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
