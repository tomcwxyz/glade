-- Additive: structured decision participants (members or guests), with
-- abstentions / leaving the room and declared interests. The existing
-- decisions.participants name list stays as a display mirror.
DO $$ BEGIN
 CREATE TYPE "public"."participation" AS ENUM('participated', 'abstained', 'left_room');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"user_id" uuid,
	"name" varchar(255) NOT NULL,
	"participation" "participation" DEFAULT 'participated' NOT NULL,
	"interest" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decision_participants" ADD CONSTRAINT "decision_participants_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decision_participants" ADD CONSTRAINT "decision_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decision_participants_decision_idx" ON "decision_participants" USING btree ("decision_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "decision_participants_user_idx" ON "decision_participants" USING btree ("user_id");
--> statement-breakpoint
-- Backfill from the typed names. A name is linked to a member only when it
-- matches exactly one member of that decision's space (case-insensitive);
-- otherwise it is kept as a guest. Skips decisions that already have rows,
-- so re-running is safe.
INSERT INTO "decision_participants" ("decision_id", "user_id", "name", "position")
SELECT d.id, m.user_id, coalesce(m.member_name, trim(p.name)), p.ord
FROM "decisions" d
CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(d.participants, '[]'::jsonb)) WITH ORDINALITY AS p(name, ord)
LEFT JOIN LATERAL (
	SELECT min(sm.user_id::text)::uuid AS user_id, min(coalesce(u.name, u.email)) AS member_name
	FROM "space_members" sm
	JOIN "users" u ON u.id = sm.user_id
	WHERE sm.space_id = d.space_id
	  AND lower(trim(coalesce(u.name, u.email))) = lower(trim(p.name))
	HAVING count(*) = 1
) m ON true
WHERE trim(p.name) <> ''
  AND NOT EXISTS (SELECT 1 FROM "decision_participants" x WHERE x.decision_id = d.id);
