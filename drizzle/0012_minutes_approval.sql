-- Additive: minutes approval / chair sign-off, and the "Approve minutes"
-- agenda item type.
ALTER TYPE "public"."agenda_item_type" ADD VALUE IF NOT EXISTS 'minutes_approval';
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "minutes_approved_at" timestamp;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "minutes_approved_by" uuid;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "minutes_approved_by_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "minutes_approved_in_meeting_id" uuid;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "minutes_approved_text" text;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_minutes_approved_by_users_id_fk" FOREIGN KEY ("minutes_approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meetings" ADD CONSTRAINT "meetings_minutes_approved_in_meeting_id_meetings_id_fk" FOREIGN KEY ("minutes_approved_in_meeting_id") REFERENCES "public"."meetings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
