-- Reconcile the migration files with src/db/schema.ts.
--
-- Until now many tables, columns and enum types were applied to the database
-- by hand-written SQL, so replaying 0000-0008 on an empty database did not
-- produce the current schema. This migration creates everything that was
-- missing. Every statement is idempotent: on a database that already has
-- these objects (production) it changes nothing.
--
-- Foreign keys and indexes are skipped if one already exists on the same
-- columns, whatever it is called, so objects created by hand under another
-- name are not duplicated.
--
-- Generated from `drizzle-kit export`; after this, `npm run db:generate`
-- diffs against an up-to-date snapshot again.
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."action_status" AS ENUM('open', 'in_progress', 'complete', 'overdue', 'superseded');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."action_status" ADD VALUE IF NOT EXISTS 'open';
--> statement-breakpoint
ALTER TYPE "public"."action_status" ADD VALUE IF NOT EXISTS 'in_progress';
--> statement-breakpoint
ALTER TYPE "public"."action_status" ADD VALUE IF NOT EXISTS 'complete';
--> statement-breakpoint
ALTER TYPE "public"."action_status" ADD VALUE IF NOT EXISTS 'overdue';
--> statement-breakpoint
ALTER TYPE "public"."action_status" ADD VALUE IF NOT EXISTS 'superseded';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."agenda_item_status" AS ENUM('pending', 'active', 'completed', 'skipped');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."agenda_item_status" ADD VALUE IF NOT EXISTS 'pending';
--> statement-breakpoint
ALTER TYPE "public"."agenda_item_status" ADD VALUE IF NOT EXISTS 'active';
--> statement-breakpoint
ALTER TYPE "public"."agenda_item_status" ADD VALUE IF NOT EXISTS 'completed';
--> statement-breakpoint
ALTER TYPE "public"."agenda_item_status" ADD VALUE IF NOT EXISTS 'skipped';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."agenda_item_type" AS ENUM('for_decision', 'for_discussion', 'for_information');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."agenda_item_type" ADD VALUE IF NOT EXISTS 'for_decision';
--> statement-breakpoint
ALTER TYPE "public"."agenda_item_type" ADD VALUE IF NOT EXISTS 'for_discussion';
--> statement-breakpoint
ALTER TYPE "public"."agenda_item_type" ADD VALUE IF NOT EXISTS 'for_information';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."decision_link_type" AS ENUM('supersedes', 'relates_to', 'amends');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."decision_link_type" ADD VALUE IF NOT EXISTS 'supersedes';
--> statement-breakpoint
ALTER TYPE "public"."decision_link_type" ADD VALUE IF NOT EXISTS 'relates_to';
--> statement-breakpoint
ALTER TYPE "public"."decision_link_type" ADD VALUE IF NOT EXISTS 'amends';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."decision_method" AS ENUM('consent', 'majority_vote', 'advice_process', 'delegation', 'consensus', 'lazy_consensus');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."decision_method" ADD VALUE IF NOT EXISTS 'consent';
--> statement-breakpoint
ALTER TYPE "public"."decision_method" ADD VALUE IF NOT EXISTS 'majority_vote';
--> statement-breakpoint
ALTER TYPE "public"."decision_method" ADD VALUE IF NOT EXISTS 'advice_process';
--> statement-breakpoint
ALTER TYPE "public"."decision_method" ADD VALUE IF NOT EXISTS 'delegation';
--> statement-breakpoint
ALTER TYPE "public"."decision_method" ADD VALUE IF NOT EXISTS 'consensus';
--> statement-breakpoint
ALTER TYPE "public"."decision_method" ADD VALUE IF NOT EXISTS 'lazy_consensus';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."decision_status" AS ENUM('decided', 'implemented', 'reviewed', 'learned');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."decision_status" ADD VALUE IF NOT EXISTS 'decided';
--> statement-breakpoint
ALTER TYPE "public"."decision_status" ADD VALUE IF NOT EXISTS 'implemented';
--> statement-breakpoint
ALTER TYPE "public"."decision_status" ADD VALUE IF NOT EXISTS 'reviewed';
--> statement-breakpoint
ALTER TYPE "public"."decision_status" ADD VALUE IF NOT EXISTS 'learned';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."document_status" AS ENUM('draft', 'published');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE IF NOT EXISTS 'draft';
--> statement-breakpoint
ALTER TYPE "public"."document_status" ADD VALUE IF NOT EXISTS 'published';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."document_type" AS ENUM('constitution', 'terms_of_reference', 'policy', 'role_description', 'standing_orders', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE IF NOT EXISTS 'constitution';
--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE IF NOT EXISTS 'terms_of_reference';
--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE IF NOT EXISTS 'policy';
--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE IF NOT EXISTS 'role_description';
--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE IF NOT EXISTS 'standing_orders';
--> statement-breakpoint
ALTER TYPE "public"."document_type" ADD VALUE IF NOT EXISTS 'custom';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."insight_status" AS ENUM('active', 'dismissed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."insight_status" ADD VALUE IF NOT EXISTS 'active';
--> statement-breakpoint
ALTER TYPE "public"."insight_status" ADD VALUE IF NOT EXISTS 'dismissed';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."insight_type" AS ENUM('pattern', 'review', 'suggestion', 'briefing', 'meeting_summary');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."insight_type" ADD VALUE IF NOT EXISTS 'pattern';
--> statement-breakpoint
ALTER TYPE "public"."insight_type" ADD VALUE IF NOT EXISTS 'review';
--> statement-breakpoint
ALTER TYPE "public"."insight_type" ADD VALUE IF NOT EXISTS 'suggestion';
--> statement-breakpoint
ALTER TYPE "public"."insight_type" ADD VALUE IF NOT EXISTS 'briefing';
--> statement-breakpoint
ALTER TYPE "public"."insight_type" ADD VALUE IF NOT EXISTS 'meeting_summary';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."invitation_status" ADD VALUE IF NOT EXISTS 'pending';
--> statement-breakpoint
ALTER TYPE "public"."invitation_status" ADD VALUE IF NOT EXISTS 'accepted';
--> statement-breakpoint
ALTER TYPE "public"."invitation_status" ADD VALUE IF NOT EXISTS 'expired';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."meeting_status" AS ENUM('draft', 'scheduled', 'in_progress', 'completed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."meeting_status" ADD VALUE IF NOT EXISTS 'draft';
--> statement-breakpoint
ALTER TYPE "public"."meeting_status" ADD VALUE IF NOT EXISTS 'scheduled';
--> statement-breakpoint
ALTER TYPE "public"."meeting_status" ADD VALUE IF NOT EXISTS 'in_progress';
--> statement-breakpoint
ALTER TYPE "public"."meeting_status" ADD VALUE IF NOT EXISTS 'completed';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."notification_type" AS ENUM('meeting_started', 'review_due');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'meeting_started';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'review_due';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."participation" AS ENUM('participated', 'abstained', 'left_room');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."participation" ADD VALUE IF NOT EXISTS 'participated';
--> statement-breakpoint
ALTER TYPE "public"."participation" ADD VALUE IF NOT EXISTS 'abstained';
--> statement-breakpoint
ALTER TYPE "public"."participation" ADD VALUE IF NOT EXISTS 'left_room';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."plan_tier" AS ENUM('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."plan_tier" ADD VALUE IF NOT EXISTS 'free';
--> statement-breakpoint
ALTER TYPE "public"."plan_tier" ADD VALUE IF NOT EXISTS 'pro';
--> statement-breakpoint
ALTER TYPE "public"."plan_tier" ADD VALUE IF NOT EXISTS 'enterprise';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'open_for_discussion', 'ready_for_decision', 'decided', 'implemented');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."proposal_status" ADD VALUE IF NOT EXISTS 'draft';
--> statement-breakpoint
ALTER TYPE "public"."proposal_status" ADD VALUE IF NOT EXISTS 'open_for_discussion';
--> statement-breakpoint
ALTER TYPE "public"."proposal_status" ADD VALUE IF NOT EXISTS 'ready_for_decision';
--> statement-breakpoint
ALTER TYPE "public"."proposal_status" ADD VALUE IF NOT EXISTS 'decided';
--> statement-breakpoint
ALTER TYPE "public"."proposal_status" ADD VALUE IF NOT EXISTS 'implemented';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."review_outcome" AS ENUM('keep', 'amend', 'supersede', 'retire');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."review_outcome" ADD VALUE IF NOT EXISTS 'keep';
--> statement-breakpoint
ALTER TYPE "public"."review_outcome" ADD VALUE IF NOT EXISTS 'amend';
--> statement-breakpoint
ALTER TYPE "public"."review_outcome" ADD VALUE IF NOT EXISTS 'supersede';
--> statement-breakpoint
ALTER TYPE "public"."review_outcome" ADD VALUE IF NOT EXISTS 'retire';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."space_role" AS ENUM('admin', 'member', 'observer');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."space_role" ADD VALUE IF NOT EXISTS 'admin';
--> statement-breakpoint
ALTER TYPE "public"."space_role" ADD VALUE IF NOT EXISTS 'member';
--> statement-breakpoint
ALTER TYPE "public"."space_role" ADD VALUE IF NOT EXISTS 'observer';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'cancelled', 'incomplete', 'trialing');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'active';
--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'past_due';
--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'cancelled';
--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'incomplete';
--> statement-breakpoint
ALTER TYPE "public"."subscription_status" ADD VALUE IF NOT EXISTS 'trialing';
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."topic_type" AS ENUM('question', 'tension', 'agenda_suggestion');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."topic_type" ADD VALUE IF NOT EXISTS 'question';
--> statement-breakpoint
ALTER TYPE "public"."topic_type" ADD VALUE IF NOT EXISTS 'tension';
--> statement-breakpoint
ALTER TYPE "public"."topic_type" ADD VALUE IF NOT EXISTS 'agenda_suggestion';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "type" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "provider" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "provider_account_id" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "refresh_token" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "access_token" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "expires_at" integer;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "token_type" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "scope" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "id_token" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "session_state" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "action_owners" (
	"action_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "action_owners_action_id_user_id_pk" PRIMARY KEY("action_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "action_owners" ADD COLUMN IF NOT EXISTS "action_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "action_owners" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "action_tags" (
	"action_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "action_tags_action_id_tag_id_pk" PRIMARY KEY("action_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "action_tags" ADD COLUMN IF NOT EXISTS "action_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "action_tags" ADD COLUMN IF NOT EXISTS "tag_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"decision_id" uuid,
	"topic_id" uuid,
	"proposal_id" uuid,
	"description" text NOT NULL,
	"owner_id" uuid,
	"owner_name" varchar(255),
	"due_date" timestamp,
	"status" "action_status" DEFAULT 'open' NOT NULL,
	"completed_at" timestamp,
	"is_public" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "decision_id" uuid;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "topic_id" uuid;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "proposal_id" uuid;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "description" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "owner_id" uuid;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "owner_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "due_date" timestamp;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "status" "action_status" DEFAULT 'open' NOT NULL;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "completed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "actions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"permissions" varchar(20) DEFAULT 'read' NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "name" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_hash" varchar(64) NOT NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_prefix" varchar(12) NOT NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "permissions" varchar(20) DEFAULT 'read' NOT NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_title" varchar(500) NOT NULL,
	"entity_meta" jsonb,
	"deleted_by" uuid,
	"deleted_by_name" varchar(255),
	"deleted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "entity_type" varchar(50) NOT NULL;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "entity_title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "entity_meta" jsonb;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "deleted_by" uuid;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "deleted_by_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_decision_id" uuid NOT NULL,
	"to_decision_id" uuid NOT NULL,
	"link_type" "decision_link_type" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "decision_links_unq" UNIQUE("from_decision_id","to_decision_id","link_type")
);
--> statement-breakpoint
ALTER TABLE "decision_links" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_links" ADD COLUMN IF NOT EXISTS "from_decision_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_links" ADD COLUMN IF NOT EXISTS "to_decision_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_links" ADD COLUMN IF NOT EXISTS "link_type" "decision_link_type" NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_links" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
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
ALTER TABLE "decision_participants" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_participants" ADD COLUMN IF NOT EXISTS "decision_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_participants" ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "decision_participants" ADD COLUMN IF NOT EXISTS "name" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_participants" ADD COLUMN IF NOT EXISTS "participation" "participation" DEFAULT 'participated' NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_participants" ADD COLUMN IF NOT EXISTS "interest" text;
--> statement-breakpoint
ALTER TABLE "decision_participants" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_participants" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"participant_id" uuid,
	"name" varchar(255) NOT NULL,
	"value" varchar(100) NOT NULL,
	"comment" text,
	"stage" varchar(50),
	"resolution" varchar(20),
	"resolution_note" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "decision_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "participant_id" uuid;
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "name" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "value" varchar(100) NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "comment" text;
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "stage" varchar(50);
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "resolution" varchar(20);
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "resolution_note" text;
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "responded_at" timestamp;
--> statement-breakpoint
ALTER TABLE "decision_responses" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"outcome" "review_outcome" NOT NULL,
	"note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_reviews" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_reviews" ADD COLUMN IF NOT EXISTS "decision_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_reviews" ADD COLUMN IF NOT EXISTS "outcome" "review_outcome" NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_reviews" ADD COLUMN IF NOT EXISTS "note" text;
--> statement-breakpoint
ALTER TABLE "decision_reviews" ADD COLUMN IF NOT EXISTS "reviewed_by" uuid;
--> statement-breakpoint
ALTER TABLE "decision_reviews" ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
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
ALTER TABLE "decision_revisions" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_revisions" ADD COLUMN IF NOT EXISTS "decision_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_revisions" ADD COLUMN IF NOT EXISTS "changes" jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_revisions" ADD COLUMN IF NOT EXISTS "reason" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_revisions" ADD COLUMN IF NOT EXISTS "revised_by" uuid;
--> statement-breakpoint
ALTER TABLE "decision_revisions" ADD COLUMN IF NOT EXISTS "revised_by_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "decision_revisions" ADD COLUMN IF NOT EXISTS "revised_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_tags" (
	"decision_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "decision_tags_decision_id_tag_id_pk" PRIMARY KEY("decision_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "decision_tags" ADD COLUMN IF NOT EXISTS "decision_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "decision_tags" ADD COLUMN IF NOT EXISTS "tag_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"space_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"rationale" text,
	"method" "decision_method" NOT NULL,
	"outcome" text,
	"status" "decision_status" DEFAULT 'decided' NOT NULL,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"deliberation" jsonb,
	"date" timestamp NOT NULL,
	"conditions" text,
	"review_date" timestamp,
	"learnings" text,
	"retired_at" timestamp,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"deleted_by" uuid,
	"deleted_by_name" varchar(255),
	"deletion_reason" text,
	CONSTRAINT "decisions_space_number_unq" UNIQUE("space_id","number")
);
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "number" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "rationale" text;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "method" "decision_method" NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "outcome" text;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "status" "decision_status" DEFAULT 'decided' NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "participants" jsonb DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "deliberation" jsonb;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "date" timestamp NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "conditions" text;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "review_date" timestamp;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "learnings" text;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "retired_at" timestamp;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "deleted_by" uuid;
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "deleted_by_name" varchar(255);
--> statement-breakpoint
ALTER TABLE "decisions" ADD COLUMN IF NOT EXISTS "deletion_reason" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_section_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"section_id" varchar(255) NOT NULL,
	"decision_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_section_links" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_section_links" ADD COLUMN IF NOT EXISTS "document_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_section_links" ADD COLUMN IF NOT EXISTS "section_id" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_section_links" ADD COLUMN IF NOT EXISTS "decision_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_section_links" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_tags" (
	"document_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "document_tags_document_id_tag_id_pk" PRIMARY KEY("document_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "document_tags" ADD COLUMN IF NOT EXISTS "document_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_tags" ADD COLUMN IF NOT EXISTS "tag_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_versions" (
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
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "document_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "version_number" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "content" jsonb;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "change_description" text;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "decision_id" uuid;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"type" "document_type" NOT NULL,
	"content" jsonb,
	"draft_content" jsonb,
	"draft_updated_at" timestamp,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "type" "document_type" NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "content" jsonb;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "draft_content" jsonb;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "draft_updated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "status" "document_status" DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "current_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "insights" (
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
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "type" "insight_type" NOT NULL;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "content" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "related_decision_id" uuid;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "related_document_id" uuid;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "status" "insight_status" DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "space_role" DEFAULT 'member' NOT NULL,
	"token" varchar(64) NOT NULL,
	"invited_by" uuid NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "email" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "role" "space_role" DEFAULT 'member' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "token" varchar(64) NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "invited_by" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "status" "invitation_status" DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "expires_at" timestamp NOT NULL;
--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_actions" (
	"meeting_id" uuid NOT NULL,
	"action_id" uuid NOT NULL,
	CONSTRAINT "meeting_actions_meeting_id_action_id_pk" PRIMARY KEY("meeting_id","action_id")
);
--> statement-breakpoint
ALTER TABLE "meeting_actions" ADD COLUMN IF NOT EXISTS "meeting_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_actions" ADD COLUMN IF NOT EXISTS "action_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_agenda_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"type" "agenda_item_type" DEFAULT 'for_discussion' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"duration_minutes" integer,
	"status" "agenda_item_status" DEFAULT 'pending' NOT NULL,
	"proposal_id" uuid,
	"topic_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "meeting_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "type" "agenda_item_type" DEFAULT 'for_discussion' NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "duration_minutes" integer;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "status" "agenda_item_status" DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "proposal_id" uuid;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "topic_id" uuid;
--> statement-breakpoint
ALTER TABLE "meeting_agenda_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_attendees" (
	"meeting_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "meeting_attendees_meeting_id_user_id_pk" PRIMARY KEY("meeting_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD COLUMN IF NOT EXISTS "meeting_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_decisions" (
	"meeting_id" uuid NOT NULL,
	"decision_id" uuid NOT NULL,
	CONSTRAINT "meeting_decisions_meeting_id_decision_id_pk" PRIMARY KEY("meeting_id","decision_id")
);
--> statement-breakpoint
ALTER TABLE "meeting_decisions" ADD COLUMN IF NOT EXISTS "meeting_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_decisions" ADD COLUMN IF NOT EXISTS "decision_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_documents" (
	"meeting_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	CONSTRAINT "meeting_documents_meeting_id_document_id_pk" PRIMARY KEY("meeting_id","document_id")
);
--> statement-breakpoint
ALTER TABLE "meeting_documents" ADD COLUMN IF NOT EXISTS "meeting_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_documents" ADD COLUMN IF NOT EXISTS "document_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meeting_tags" (
	"meeting_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "meeting_tags_meeting_id_tag_id_pk" PRIMARY KEY("meeting_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "meeting_tags" ADD COLUMN IF NOT EXISTS "meeting_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "meeting_tags" ADD COLUMN IF NOT EXISTS "tag_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"date" timestamp NOT NULL,
	"type" varchar(100),
	"status" "meeting_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"facilitator_id" uuid,
	"share_token" varchar(64),
	"session_state" jsonb,
	"transcript" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "meetings_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "date" timestamp NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "type" varchar(100);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "status" "meeting_status" DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "facilitator_id" uuid;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "share_token" varchar(64);
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "session_state" jsonb;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "transcript" text;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"space_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"body" text,
	"link" varchar(1000),
	"reference_id" uuid,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" "notification_type" NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "body" text;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "link" varchar(1000);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "reference_id" uuid;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "email" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "token_hash" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "expires_at" timestamp NOT NULL;
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposal_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD COLUMN IF NOT EXISTS "proposal_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD COLUMN IF NOT EXISTS "author_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD COLUMN IF NOT EXISTS "content" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD COLUMN IF NOT EXISTS "parent_id" uuid;
--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_comments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposal_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal_references" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_references" ADD COLUMN IF NOT EXISTS "proposal_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_references" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_references" ADD COLUMN IF NOT EXISTS "url" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_references" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposal_tags" (
	"proposal_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "proposal_tags_proposal_id_tag_id_pk" PRIMARY KEY("proposal_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "proposal_tags" ADD COLUMN IF NOT EXISTS "proposal_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposal_tags" ADD COLUMN IF NOT EXISTS "tag_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"rationale" text,
	"suggested_method" "decision_method",
	"status" "proposal_status" DEFAULT 'draft' NOT NULL,
	"decided_as_decision_id" uuid,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "rationale" text;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "suggested_method" "decision_method";
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "status" "proposal_status" DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "decided_as_decision_id" uuid;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "session_token" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "expires" timestamp NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "space_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "space_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "space_members" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "space_members" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "space_members" ADD COLUMN IF NOT EXISTS "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "space_members" ADD COLUMN IF NOT EXISTS "role" "space_role" DEFAULT 'member' NOT NULL;
--> statement-breakpoint
ALTER TABLE "space_members" ADD COLUMN IF NOT EXISTS "joined_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "spaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "name" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "slug" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "settings" jsonb DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "spaces" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_price_id" varchar(255),
	"plan_tier" "plan_tier" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_space_id_unique" UNIQUE("space_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_customer_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "stripe_price_id" varchar(255);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_tier" "plan_tier" DEFAULT 'free' NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "status" "subscription_status" DEFAULT 'active' NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_start" timestamp;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "current_period_end" timestamp;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tags_space_name_unq" UNIQUE("space_id","name")
);
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "name" varchar(100) NOT NULL;
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "color" varchar(50);
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topic_tags" (
	"topic_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "topic_tags_topic_id_tag_id_pk" PRIMARY KEY("topic_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "topic_tags" ADD COLUMN IF NOT EXISTS "topic_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "topic_tags" ADD COLUMN IF NOT EXISTS "tag_id" uuid NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"type" "topic_type" NOT NULL,
	"promoted_to_proposal_id" uuid,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "title" varchar(500) NOT NULL;
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "type" "topic_type" NOT NULL;
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "promoted_to_proposal_id" uuid;
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "created_by" uuid;
--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp,
	"image" text,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" timestamp;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN IF NOT EXISTS "identifier" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN IF NOT EXISTS "token" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD COLUMN IF NOT EXISTS "expires" timestamp NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"space_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" varchar(64) NOT NULL,
	"events" jsonb DEFAULT '["decision.created","decision.updated","decision.status_changed"]'::jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_delivery_at" timestamp,
	"last_delivery_status" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid() NOT NULL;
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "space_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "url" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "secret" varchar(64) NOT NULL;
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "events" jsonb DEFAULT '["decision.created","decision.updated","decision.status_changed"]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "last_delivery_at" timestamp;
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "last_delivery_status" integer;
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accounts_user_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.accounts'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['user_id']) x)
  ) THEN
  ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'action_owners_action_id_actions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.action_owners'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['action_id']) x)
  ) THEN
  ALTER TABLE "action_owners" ADD CONSTRAINT "action_owners_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'action_owners_user_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.action_owners'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['user_id']) x)
  ) THEN
  ALTER TABLE "action_owners" ADD CONSTRAINT "action_owners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'action_tags_action_id_actions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.action_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['action_id']) x)
  ) THEN
  ALTER TABLE "action_tags" ADD CONSTRAINT "action_tags_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'action_tags_tag_id_tags_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.action_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['tag_id']) x)
  ) THEN
  ALTER TABLE "action_tags" ADD CONSTRAINT "action_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actions_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "actions" ADD CONSTRAINT "actions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actions_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "actions" ADD CONSTRAINT "actions_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actions_topic_id_topics_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['topic_id']) x)
  ) THEN
  ALTER TABLE "actions" ADD CONSTRAINT "actions_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actions_proposal_id_proposals_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['proposal_id']) x)
  ) THEN
  ALTER TABLE "actions" ADD CONSTRAINT "actions_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'actions_owner_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['owner_id']) x)
  ) THEN
  ALTER TABLE "actions" ADD CONSTRAINT "actions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.api_keys'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.audit_log'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_log_deleted_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.audit_log'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['deleted_by']) x)
  ) THEN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_links_from_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_links'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['from_decision_id']) x)
  ) THEN
  ALTER TABLE "decision_links" ADD CONSTRAINT "decision_links_from_decision_id_decisions_id_fk" FOREIGN KEY ("from_decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_links_to_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_links'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['to_decision_id']) x)
  ) THEN
  ALTER TABLE "decision_links" ADD CONSTRAINT "decision_links_to_decision_id_decisions_id_fk" FOREIGN KEY ("to_decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_participants_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_participants'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "decision_participants" ADD CONSTRAINT "decision_participants_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_participants_user_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_participants'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['user_id']) x)
  ) THEN
  ALTER TABLE "decision_participants" ADD CONSTRAINT "decision_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_responses_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_responses'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "decision_responses" ADD CONSTRAINT "decision_responses_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_reviews_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_reviews'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "decision_reviews" ADD CONSTRAINT "decision_reviews_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_reviews_reviewed_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_reviews'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['reviewed_by']) x)
  ) THEN
  ALTER TABLE "decision_reviews" ADD CONSTRAINT "decision_reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_revisions_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_revisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "decision_revisions" ADD CONSTRAINT "decision_revisions_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_revisions_revised_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_revisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['revised_by']) x)
  ) THEN
  ALTER TABLE "decision_revisions" ADD CONSTRAINT "decision_revisions_revised_by_users_id_fk" FOREIGN KEY ("revised_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_tags_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "decision_tags" ADD CONSTRAINT "decision_tags_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decision_tags_tag_id_tags_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decision_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['tag_id']) x)
  ) THEN
  ALTER TABLE "decision_tags" ADD CONSTRAINT "decision_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decisions_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "decisions" ADD CONSTRAINT "decisions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decisions_created_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['created_by']) x)
  ) THEN
  ALTER TABLE "decisions" ADD CONSTRAINT "decisions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'decisions_deleted_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['deleted_by']) x)
  ) THEN
  ALTER TABLE "decisions" ADD CONSTRAINT "decisions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_section_links_document_id_documents_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.document_section_links'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['document_id']) x)
  ) THEN
  ALTER TABLE "document_section_links" ADD CONSTRAINT "document_section_links_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_section_links_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.document_section_links'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "document_section_links" ADD CONSTRAINT "document_section_links_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_tags_document_id_documents_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.document_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['document_id']) x)
  ) THEN
  ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_tags_tag_id_tags_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.document_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['tag_id']) x)
  ) THEN
  ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_versions_document_id_documents_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.document_versions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['document_id']) x)
  ) THEN
  ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_versions_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.document_versions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_versions_created_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.document_versions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['created_by']) x)
  ) THEN
  ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.documents'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_created_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.documents'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['created_by']) x)
  ) THEN
  ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insights_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.insights'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "insights" ADD CONSTRAINT "insights_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insights_related_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.insights'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['related_decision_id']) x)
  ) THEN
  ALTER TABLE "insights" ADD CONSTRAINT "insights_related_decision_id_decisions_id_fk" FOREIGN KEY ("related_decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'insights_related_document_id_documents_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.insights'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['related_document_id']) x)
  ) THEN
  ALTER TABLE "insights" ADD CONSTRAINT "insights_related_document_id_documents_id_fk" FOREIGN KEY ("related_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.invitations'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_invited_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.invitations'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['invited_by']) x)
  ) THEN
  ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_actions_meeting_id_meetings_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['meeting_id']) x)
  ) THEN
  ALTER TABLE "meeting_actions" ADD CONSTRAINT "meeting_actions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_actions_action_id_actions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['action_id']) x)
  ) THEN
  ALTER TABLE "meeting_actions" ADD CONSTRAINT "meeting_actions_action_id_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."actions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_agenda_items_meeting_id_meetings_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_agenda_items'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['meeting_id']) x)
  ) THEN
  ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_agenda_items_proposal_id_proposals_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_agenda_items'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['proposal_id']) x)
  ) THEN
  ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_agenda_items_topic_id_topics_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_agenda_items'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['topic_id']) x)
  ) THEN
  ALTER TABLE "meeting_agenda_items" ADD CONSTRAINT "meeting_agenda_items_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE set null ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_attendees_meeting_id_meetings_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_attendees'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['meeting_id']) x)
  ) THEN
  ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_attendees_user_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_attendees'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['user_id']) x)
  ) THEN
  ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_decisions_meeting_id_meetings_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['meeting_id']) x)
  ) THEN
  ALTER TABLE "meeting_decisions" ADD CONSTRAINT "meeting_decisions_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_decisions_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decision_id']) x)
  ) THEN
  ALTER TABLE "meeting_decisions" ADD CONSTRAINT "meeting_decisions_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_documents_meeting_id_meetings_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_documents'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['meeting_id']) x)
  ) THEN
  ALTER TABLE "meeting_documents" ADD CONSTRAINT "meeting_documents_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_documents_document_id_documents_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_documents'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['document_id']) x)
  ) THEN
  ALTER TABLE "meeting_documents" ADD CONSTRAINT "meeting_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_tags_meeting_id_meetings_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['meeting_id']) x)
  ) THEN
  ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meeting_tags_tag_id_tags_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meeting_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['tag_id']) x)
  ) THEN
  ALTER TABLE "meeting_tags" ADD CONSTRAINT "meeting_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meetings'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_created_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meetings'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['created_by']) x)
  ) THEN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meetings_facilitator_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.meetings'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['facilitator_id']) x)
  ) THEN
  ALTER TABLE "meetings" ADD CONSTRAINT "meetings_facilitator_id_users_id_fk" FOREIGN KEY ("facilitator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.notifications'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['user_id']) x)
  ) THEN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.notifications'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposal_comments_proposal_id_proposals_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.proposal_comments'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['proposal_id']) x)
  ) THEN
  ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposal_comments_author_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.proposal_comments'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['author_id']) x)
  ) THEN
  ALTER TABLE "proposal_comments" ADD CONSTRAINT "proposal_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposal_references_proposal_id_proposals_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.proposal_references'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['proposal_id']) x)
  ) THEN
  ALTER TABLE "proposal_references" ADD CONSTRAINT "proposal_references_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposal_tags_proposal_id_proposals_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.proposal_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['proposal_id']) x)
  ) THEN
  ALTER TABLE "proposal_tags" ADD CONSTRAINT "proposal_tags_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposal_tags_tag_id_tags_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.proposal_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['tag_id']) x)
  ) THEN
  ALTER TABLE "proposal_tags" ADD CONSTRAINT "proposal_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.proposals'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_decided_as_decision_id_decisions_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.proposals'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['decided_as_decision_id']) x)
  ) THEN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_decided_as_decision_id_decisions_id_fk" FOREIGN KEY ("decided_as_decision_id") REFERENCES "public"."decisions"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_created_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.proposals'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['created_by']) x)
  ) THEN
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.sessions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['user_id']) x)
  ) THEN
  ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'space_members_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.space_members'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'space_members_user_id_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.space_members'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['user_id']) x)
  ) THEN
  ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.subscriptions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tags_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "tags" ADD CONSTRAINT "tags_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topic_tags_topic_id_topics_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.topic_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['topic_id']) x)
  ) THEN
  ALTER TABLE "topic_tags" ADD CONSTRAINT "topic_tags_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topic_tags_tag_id_tags_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.topic_tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['tag_id']) x)
  ) THEN
  ALTER TABLE "topic_tags" ADD CONSTRAINT "topic_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.topics'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "topics" ADD CONSTRAINT "topics_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_promoted_to_proposal_id_proposals_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.topics'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['promoted_to_proposal_id']) x)
  ) THEN
  ALTER TABLE "topics" ADD CONSTRAINT "topics_promoted_to_proposal_id_proposals_id_fk" FOREIGN KEY ("promoted_to_proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'topics_created_by_users_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.topics'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['created_by']) x)
  ) THEN
  ALTER TABLE "topics" ADD CONSTRAINT "topics_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'webhooks_space_id_spaces_id_fk')
  AND NOT EXISTS (
   SELECT 1 FROM pg_constraint c
   WHERE c.contype = 'f' AND c.conrelid = 'public.webhooks'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY a.attname) FROM pg_attribute a
          WHERE a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey))
       = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['space_id']) x)
  ) THEN
  ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'actions_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "actions_space_idx" ON "actions" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'actions_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decision_id']::text[]
  ) THEN
  CREATE INDEX "actions_decision_idx" ON "actions" USING btree ("decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'actions_status_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['status']::text[]
  ) THEN
  CREATE INDEX "actions_status_idx" ON "actions" USING btree ("status");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'actions_topic_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['topic_id']::text[]
  ) THEN
  CREATE INDEX "actions_topic_idx" ON "actions" USING btree ("topic_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'actions_proposal_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['proposal_id']::text[]
  ) THEN
  CREATE INDEX "actions_proposal_idx" ON "actions" USING btree ("proposal_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'actions_owner_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.actions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['owner_id']::text[]
  ) THEN
  CREATE INDEX "actions_owner_idx" ON "actions" USING btree ("owner_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'api_keys_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.api_keys'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "api_keys_space_idx" ON "api_keys" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'api_keys_hash_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.api_keys'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['key_hash']::text[]
  ) THEN
  CREATE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_log_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.audit_log'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "audit_log_space_idx" ON "audit_log" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decision_links_from_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decision_links'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['from_decision_id']::text[]
  ) THEN
  CREATE INDEX "decision_links_from_idx" ON "decision_links" USING btree ("from_decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decision_links_to_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decision_links'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['to_decision_id']::text[]
  ) THEN
  CREATE INDEX "decision_links_to_idx" ON "decision_links" USING btree ("to_decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decision_participants_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decision_participants'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decision_id']::text[]
  ) THEN
  CREATE INDEX "decision_participants_decision_idx" ON "decision_participants" USING btree ("decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decision_participants_user_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decision_participants'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['user_id']::text[]
  ) THEN
  CREATE INDEX "decision_participants_user_idx" ON "decision_participants" USING btree ("user_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decision_responses_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decision_responses'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decision_id']::text[]
  ) THEN
  CREATE INDEX "decision_responses_decision_idx" ON "decision_responses" USING btree ("decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decision_reviews_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decision_reviews'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decision_id']::text[]
  ) THEN
  CREATE INDEX "decision_reviews_decision_idx" ON "decision_reviews" USING btree ("decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decision_revisions_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decision_revisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decision_id']::text[]
  ) THEN
  CREATE INDEX "decision_revisions_decision_idx" ON "decision_revisions" USING btree ("decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decisions_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "decisions_space_idx" ON "decisions" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decisions_status_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['status']::text[]
  ) THEN
  CREATE INDEX "decisions_status_idx" ON "decisions" USING btree ("status");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'decisions_date_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['date']::text[]
  ) THEN
  CREATE INDEX "decisions_date_idx" ON "decisions" USING btree ("date");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'doc_section_links_document_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.document_section_links'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['document_id']::text[]
  ) THEN
  CREATE INDEX "doc_section_links_document_idx" ON "document_section_links" USING btree ("document_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'doc_section_links_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.document_section_links'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decision_id']::text[]
  ) THEN
  CREATE INDEX "doc_section_links_decision_idx" ON "document_section_links" USING btree ("decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'doc_versions_document_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.document_versions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['document_id']::text[]
  ) THEN
  CREATE INDEX "doc_versions_document_idx" ON "document_versions" USING btree ("document_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'doc_versions_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.document_versions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decision_id']::text[]
  ) THEN
  CREATE INDEX "doc_versions_decision_idx" ON "document_versions" USING btree ("decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'documents_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.documents'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "documents_space_idx" ON "documents" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'documents_type_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.documents'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['type']::text[]
  ) THEN
  CREATE INDEX "documents_type_idx" ON "documents" USING btree ("type");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'insights_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.insights'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "insights_space_idx" ON "insights" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'insights_type_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.insights'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['type']::text[]
  ) THEN
  CREATE INDEX "insights_type_idx" ON "insights" USING btree ("type");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'insights_related_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.insights'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['related_decision_id']::text[]
  ) THEN
  CREATE INDEX "insights_related_decision_idx" ON "insights" USING btree ("related_decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invitations_email_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.invitations'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['email']::text[]
  ) THEN
  CREATE INDEX "invitations_email_idx" ON "invitations" USING btree ("email");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invitations_token_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.invitations'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['token']::text[]
  ) THEN
  CREATE INDEX "invitations_token_idx" ON "invitations" USING btree ("token");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'invitations_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.invitations'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "invitations_space_idx" ON "invitations" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agenda_items_meeting_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.meeting_agenda_items'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['meeting_id']::text[]
  ) THEN
  CREATE INDEX "agenda_items_meeting_idx" ON "meeting_agenda_items" USING btree ("meeting_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agenda_items_proposal_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.meeting_agenda_items'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['proposal_id']::text[]
  ) THEN
  CREATE INDEX "agenda_items_proposal_idx" ON "meeting_agenda_items" USING btree ("proposal_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agenda_items_topic_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.meeting_agenda_items'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['topic_id']::text[]
  ) THEN
  CREATE INDEX "agenda_items_topic_idx" ON "meeting_agenda_items" USING btree ("topic_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'meeting_decisions_meeting_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.meeting_decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['meeting_id']::text[]
  ) THEN
  CREATE INDEX "meeting_decisions_meeting_idx" ON "meeting_decisions" USING btree ("meeting_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'meeting_decisions_decision_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.meeting_decisions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decision_id']::text[]
  ) THEN
  CREATE INDEX "meeting_decisions_decision_idx" ON "meeting_decisions" USING btree ("decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'meetings_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.meetings'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "meetings_space_idx" ON "meetings" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications_user_read_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.notifications'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['user_id', 'read']::text[]
  ) THEN
  CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'notifications_user_created_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.notifications'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['user_id', 'created_at']::text[]
  ) THEN
  CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'password_reset_tokens_email_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.password_reset_tokens'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['email']::text[]
  ) THEN
  CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens" USING btree ("email");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'proposal_comments_proposal_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.proposal_comments'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['proposal_id']::text[]
  ) THEN
  CREATE INDEX "proposal_comments_proposal_idx" ON "proposal_comments" USING btree ("proposal_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'proposal_references_proposal_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.proposal_references'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['proposal_id']::text[]
  ) THEN
  CREATE INDEX "proposal_references_proposal_idx" ON "proposal_references" USING btree ("proposal_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'proposals_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.proposals'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "proposals_space_idx" ON "proposals" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'proposals_status_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.proposals'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['status']::text[]
  ) THEN
  CREATE INDEX "proposals_status_idx" ON "proposals" USING btree ("status");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'proposals_decided_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.proposals'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['decided_as_decision_id']::text[]
  ) THEN
  CREATE INDEX "proposals_decided_idx" ON "proposals" USING btree ("decided_as_decision_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'space_members_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.space_members'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "space_members_space_idx" ON "space_members" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'space_members_user_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.space_members'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['user_id']::text[]
  ) THEN
  CREATE INDEX "space_members_user_idx" ON "space_members" USING btree ("user_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'subscriptions_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.subscriptions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "subscriptions_space_idx" ON "subscriptions" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'subscriptions_stripe_customer_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.subscriptions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['stripe_customer_id']::text[]
  ) THEN
  CREATE INDEX "subscriptions_stripe_customer_idx" ON "subscriptions" USING btree ("stripe_customer_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'subscriptions_stripe_subscription_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.subscriptions'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['stripe_subscription_id']::text[]
  ) THEN
  CREATE INDEX "subscriptions_stripe_subscription_idx" ON "subscriptions" USING btree ("stripe_subscription_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'tags_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.tags'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "tags_space_idx" ON "tags" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'topics_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.topics'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "topics_space_idx" ON "topics" USING btree ("space_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'topics_promoted_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.topics'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['promoted_to_proposal_id']::text[]
  ) THEN
  CREATE INDEX "topics_promoted_idx" ON "topics" USING btree ("promoted_to_proposal_id");
 END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'webhooks_space_idx' AND relkind = 'i')
  AND NOT EXISTS (
   SELECT 1 FROM pg_index i
   WHERE i.indrelid = 'public.webhooks'::regclass
     AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey::int2[]) WITH ORDINALITY k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = k.attnum)
       = ARRAY['space_id']::text[]
  ) THEN
  CREATE INDEX "webhooks_space_idx" ON "webhooks" USING btree ("space_id");
 END IF;
END $$;
