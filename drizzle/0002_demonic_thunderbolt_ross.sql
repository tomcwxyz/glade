CREATE TYPE "public"."agenda_item_status" AS ENUM('pending', 'active', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."insight_status" AS ENUM('active', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."insight_type" AS ENUM('pattern', 'review', 'suggestion', 'briefing');--> statement-breakpoint
CREATE TYPE "public"."meeting_status" AS ENUM('draft', 'scheduled', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"type" "insight_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"related_decision_id" uuid,
	"related_document_id" uuid,
	"status" "insight_status" DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN "status" "agenda_item_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN "proposal_id" uuid;--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN "topic_id" uuid;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "status" "meeting_status" DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "decided_as_decision_id" uuid;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_related_decision_id_decisions_id_fk" FOREIGN KEY ("related_decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_related_document_id_documents_id_fk" FOREIGN KEY ("related_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_references" ADD CONSTRAINT "proposal_references_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "insights_space_idx" ON "insights" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "insights_type_idx" ON "insights" USING btree ("type");--> statement-breakpoint
CREATE INDEX "proposal_references_proposal_idx" ON "proposal_references" USING btree ("proposal_id");--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_decided_as_decision_id_decisions_id_fk" FOREIGN KEY ("decided_as_decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;