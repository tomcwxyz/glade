CREATE TYPE "public"."document_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('constitution', 'terms_of_reference', 'policy', 'role_description', 'standing_orders', 'custom');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'open_for_discussion', 'ready_for_decision', 'decided', 'implemented');--> statement-breakpoint
CREATE TYPE "public"."topic_type" AS ENUM('question', 'tension', 'agenda_suggestion');--> statement-breakpoint
CREATE TABLE "document_section_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"section_id" varchar(255) NOT NULL,
	"decision_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"content" jsonb,
	"change_description" text,
	"decision_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"type" "document_type" NOT NULL,
	"content" jsonb,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposal_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"rationale" text,
	"suggested_method" "decision_method",
	"status" "proposal_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"type" "topic_type" NOT NULL,
	"promoted_to_proposal_id" uuid,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_section_links" ADD CONSTRAINT "document_section_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_section_links" ADD CONSTRAINT "document_section_links_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_promoted_to_proposal_id_proposals_id_fk" FOREIGN KEY ("promoted_to_proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_section_links_document_idx" ON "document_section_links" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "doc_versions_document_idx" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "documents_space_idx" ON "documents" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "documents_type_idx" ON "documents" USING btree ("type");--> statement-breakpoint
CREATE INDEX "proposal_comments_proposal_idx" ON "proposal_comments" USING btree ("proposal_id");--> statement-breakpoint
CREATE INDEX "proposals_space_idx" ON "proposals" USING btree ("space_id");--> statement-breakpoint
CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "topics_space_idx" ON "topics" USING btree ("space_id");