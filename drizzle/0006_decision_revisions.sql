-- Additive: append-only correction history for decisions.
CREATE TABLE IF NOT EXISTS "decision_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"changes" jsonb NOT NULL,
	"reason" text NOT NULL,
	"revised_by" uuid,
	"revised_by_name" varchar(255),
	"revised_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decision_revisions" ADD CONSTRAINT "decision_revisions_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decision_revisions" ADD CONSTRAINT "decision_revisions_revised_by_users_id_fk" FOREIGN KEY ("revised_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decision_revisions_decision_idx" ON "decision_revisions" USING btree ("decision_id");
