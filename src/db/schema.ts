import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
  primaryKey,
  index,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";
import type { Deliberation } from "@/lib/meeting-state";

// ============================================================
// Enums
// ============================================================

export const decisionStatusEnum = pgEnum("decision_status", [
  "decided",
  "implemented",
  "reviewed",
  "learned",
]);

export const decisionMethodEnum = pgEnum("decision_method", [
  "consent",
  "majority_vote",
  "advice_process",
  "delegation",
  "consensus",
  "lazy_consensus",
]);

export const actionStatusEnum = pgEnum("action_status", [
  "open",
  "in_progress",
  "complete",
  "overdue",
]);

export const spaceRoleEnum = pgEnum("space_role", [
  "admin",
  "member",
  "observer",
]);

export const decisionLinkTypeEnum = pgEnum("decision_link_type", [
  "supersedes",
  "relates_to",
  "amends",
]);

export const agendaItemTypeEnum = pgEnum("agenda_item_type", [
  "for_decision",
  "for_discussion",
  "for_information",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "constitution",
  "terms_of_reference",
  "policy",
  "role_description",
  "standing_orders",
  "custom",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "draft",
  "published",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "draft",
  "open_for_discussion",
  "ready_for_decision",
  "decided",
  "implemented",
]);

export const topicTypeEnum = pgEnum("topic_type", [
  "question",
  "tension",
  "agenda_suggestion",
]);

export const insightTypeEnum = pgEnum("insight_type", [
  "pattern",
  "review",
  "suggestion",
  "briefing",
  "meeting_summary",
]);

export const insightStatusEnum = pgEnum("insight_status", [
  "active",
  "dismissed",
]);

export const meetingStatusEnum = pgEnum("meeting_status", [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
]);

export const agendaItemStatusEnum = pgEnum("agenda_item_status", [
  "pending",
  "active",
  "completed",
  "skipped",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "meeting_started",
]);

export const planTierEnum = pgEnum("plan_tier", [
  "free",
  "pro",
  "enterprise",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "cancelled",
  "incomplete",
  "trialing",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
]);

// ============================================================
// NextAuth tables
// ============================================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("password_reset_tokens_email_idx").on(t.email)]
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: spaceRoleEnum("role").default("member").notNull(),
    token: varchar("token", { length: 64 }).unique().notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    status: invitationStatusEnum("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (i) => [
    index("invitations_email_idx").on(i.email),
    index("invitations_token_idx").on(i.token),
    index("invitations_space_idx").on(i.spaceId),
  ]
);

// ============================================================
// Glade core tables
// ============================================================

// --- Spaces ---

export const spaces = pgTable("spaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const spaceMembers = pgTable(
  "space_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: spaceRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
  },
  (sm) => [
    index("space_members_space_idx").on(sm.spaceId),
    index("space_members_user_idx").on(sm.userId),
  ]
);

// --- Decisions ---

export const decisions = pgTable(
  "decisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: integer("number").notNull(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    rationale: text("rationale"),
    method: decisionMethodEnum("method").notNull(),
    outcome: text("outcome"),
    status: decisionStatusEnum("status").default("decided").notNull(),
    participants: jsonb("participants").default([]).$type<string[]>(),
    // Snapshot of the live deliberation that produced this decision (tallies,
    // objections + resolutions, clarifying questions, speaker notes).
    deliberation: jsonb("deliberation").$type<Deliberation>(),
    date: timestamp("date", { mode: "date" }).notNull(),
    conditions: text("conditions"),
    reviewDate: timestamp("review_date", { mode: "date" }),
    isPublic: boolean("is_public").default(true).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (d) => [
    index("decisions_space_idx").on(d.spaceId),
    index("decisions_status_idx").on(d.status),
    index("decisions_date_idx").on(d.date),
    unique("decisions_space_number_unq").on(d.spaceId, d.number),
  ]
);

export const decisionLinks = pgTable(
  "decision_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromDecisionId: uuid("from_decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    toDecisionId: uuid("to_decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    linkType: decisionLinkTypeEnum("link_type").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (dl) => [
    index("decision_links_from_idx").on(dl.fromDecisionId),
    index("decision_links_to_idx").on(dl.toDecisionId),
  ]
);

// Normalized, durable record of each deliberation response that produced a
// decision (the `decisions.deliberation` jsonb is the denormalized read-model).
export const decisionResponses = pgTable(
  "decision_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    // Live participant ids are user ids, but kept FK-free so deleting a user
    // never erases the historical record of who responded.
    participantId: uuid("participant_id"),
    name: varchar("name", { length: 255 }).notNull(),
    value: varchar("value", { length: 100 }).notNull(),
    comment: text("comment"),
    stage: varchar("stage", { length: 50 }),
    resolution: varchar("resolution", { length: 20 }),
    resolutionNote: text("resolution_note"),
    respondedAt: timestamp("responded_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (dr) => [index("decision_responses_decision_idx").on(dr.decisionId)]
);

// --- Tags ---

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    color: varchar("color", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("tags_space_idx").on(t.spaceId),
    unique("tags_space_name_unq").on(t.spaceId, t.name),
  ]
);

export const decisionTags = pgTable(
  "decision_tags",
  {
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (dt) => [primaryKey({ columns: [dt.decisionId, dt.tagId] })]
);

// --- Meetings ---

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    date: timestamp("date", { mode: "date" }).notNull(),
    type: varchar("type", { length: 100 }),
    status: meetingStatusEnum("status").default("draft").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
    facilitatorId: uuid("facilitator_id").references(() => users.id),
    shareToken: varchar("share_token", { length: 64 }).unique(),
    sessionState: jsonb("session_state"),
    transcript: text("transcript"),
    isPublic: boolean("is_public").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (m) => [index("meetings_space_idx").on(m.spaceId)]
);

export const meetingAttendees = pgTable(
  "meeting_attendees",
  {
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (ma) => [primaryKey({ columns: [ma.meetingId, ma.userId] })]
);

export const meetingAgendaItems = pgTable(
  "meeting_agenda_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    type: agendaItemTypeEnum("type").default("for_discussion").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    durationMinutes: integer("duration_minutes"),
    status: agendaItemStatusEnum("status").default("pending").notNull(),
    proposalId: uuid("proposal_id").references(() => proposals.id, { onDelete: "set null" }),
    topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (ai) => [index("agenda_items_meeting_idx").on(ai.meetingId)]
);

export const meetingDecisions = pgTable(
  "meeting_decisions",
  {
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
  },
  (md) => [
    primaryKey({ columns: [md.meetingId, md.decisionId] }),
    index("meeting_decisions_meeting_idx").on(md.meetingId),
    index("meeting_decisions_decision_idx").on(md.decisionId),
  ]
);

export const meetingActions = pgTable(
  "meeting_actions",
  {
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    actionId: uuid("action_id")
      .notNull()
      .references(() => actions.id, { onDelete: "cascade" }),
  },
  (ma) => [primaryKey({ columns: [ma.meetingId, ma.actionId] })]
);

export const meetingDocuments = pgTable(
  "meeting_documents",
  {
    meetingId: uuid("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
  },
  (md) => [primaryKey({ columns: [md.meetingId, md.documentId] })]
);

// (meeting_proposals removed — proposals link to meetings via agenda items.)

// --- Actions ---

export const actions = pgTable(
  "actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    decisionId: uuid("decision_id")
      .references(() => decisions.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .references(() => topics.id, { onDelete: "cascade" }),
    proposalId: uuid("proposal_id")
      .references(() => proposals.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    ownerId: uuid("owner_id").references(() => users.id),
    ownerName: varchar("owner_name", { length: 255 }),
    dueDate: timestamp("due_date", { mode: "date" }),
    status: actionStatusEnum("status").default("open").notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
    isPublic: boolean("is_public").default(true).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (a) => [
    index("actions_space_idx").on(a.spaceId),
    index("actions_decision_idx").on(a.decisionId),
    index("actions_status_idx").on(a.status),
  ]
);

// --- Documents ---

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    type: documentTypeEnum("type").notNull(),
    content: jsonb("content"),
    // Autosave buffer: edits land here; promoted to `content` on explicit Save.
    // Public/version reads always use `content`, never the draft.
    draftContent: jsonb("draft_content"),
    draftUpdatedAt: timestamp("draft_updated_at", { mode: "date" }),
    status: documentStatusEnum("status").default("draft").notNull(),
    currentVersion: integer("current_version").default(1).notNull(),
    isPublic: boolean("is_public").default(true).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (d) => [
    index("documents_space_idx").on(d.spaceId),
    index("documents_type_idx").on(d.type),
  ]
);

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    content: jsonb("content"),
    changeDescription: text("change_description"),
    decisionId: uuid("decision_id").references(() => decisions.id),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (dv) => [
    index("doc_versions_document_idx").on(dv.documentId),
    index("doc_versions_decision_idx").on(dv.decisionId),
  ]
);

export const documentSectionLinks = pgTable(
  "document_section_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    sectionId: varchar("section_id", { length: 255 }).notNull(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (dsl) => [
    index("doc_section_links_document_idx").on(dsl.documentId),
    index("doc_section_links_decision_idx").on(dsl.decisionId),
  ]
);

// --- Proposals ---

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    rationale: text("rationale"),
    suggestedMethod: decisionMethodEnum("suggested_method"),
    status: proposalStatusEnum("status").default("draft").notNull(),
    decidedAsDecisionId: uuid("decided_as_decision_id").references(() => decisions.id),
    isPublic: boolean("is_public").default(true).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (p) => [
    index("proposals_space_idx").on(p.spaceId),
    index("proposals_status_idx").on(p.status),
    index("proposals_decided_idx").on(p.decidedAsDecisionId),
  ]
);

export const proposalComments = pgTable(
  "proposal_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (pc) => [index("proposal_comments_proposal_idx").on(pc.proposalId)]
);

export const proposalReferences = pgTable(
  "proposal_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    proposalId: uuid("proposal_id")
      .notNull()
      .references(() => proposals.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (pr) => [index("proposal_references_proposal_idx").on(pr.proposalId)]
);

// --- Topics ---

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    type: topicTypeEnum("type").notNull(),
    promotedToProposalId: uuid("promoted_to_proposal_id").references(() => proposals.id),
    isPublic: boolean("is_public").default(true).notNull(),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("topics_space_idx").on(t.spaceId),
    index("topics_promoted_idx").on(t.promotedToProposalId),
  ]
);

// --- Insights (AI) ---

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    type: insightTypeEnum("type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    relatedDecisionId: uuid("related_decision_id").references(() => decisions.id),
    relatedDocumentId: uuid("related_document_id").references(() => documents.id),
    status: insightStatusEnum("status").default("active").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (i) => [
    index("insights_space_idx").on(i.spaceId),
    index("insights_type_idx").on(i.type),
    index("insights_related_decision_idx").on(i.relatedDecisionId),
  ]
);

// --- Subscriptions (Billing) ---

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .unique()
      .references(() => spaces.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    planTier: planTierEnum("plan_tier").default("free").notNull(),
    status: subscriptionStatusEnum("status").default("active").notNull(),
    currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
    currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (s) => [
    index("subscriptions_space_idx").on(s.spaceId),
    index("subscriptions_stripe_customer_idx").on(s.stripeCustomerId),
  ]
);

// --- Webhooks ---

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: varchar("secret", { length: 64 }).notNull(),
    events: jsonb("events").default(["decision.created", "decision.updated", "decision.status_changed"]).notNull(),
    active: boolean("active").default(true).notNull(),
    lastDeliveryAt: timestamp("last_delivery_at", { mode: "date" }),
    lastDeliveryStatus: integer("last_delivery_status"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (w) => [index("webhooks_space_idx").on(w.spaceId)]
);

// --- API Keys ---

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: varchar("key_hash", { length: 64 }).notNull(),
    keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
    permissions: varchar("permissions", { length: 20 }).default("read").notNull(),
    lastUsedAt: timestamp("last_used_at", { mode: "date" }),
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (ak) => [
    index("api_keys_space_idx").on(ak.spaceId),
    index("api_keys_hash_idx").on(ak.keyHash),
  ]
);

// --- Audit Log ---

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityTitle: varchar("entity_title", { length: 500 }).notNull(),
    entityMeta: jsonb("entity_meta").$type<Record<string, unknown>>(),
    deletedBy: uuid("deleted_by").references(() => users.id, { onDelete: "set null" }),
    deletedByName: varchar("deleted_by_name", { length: 255 }),
    deletedAt: timestamp("deleted_at", { mode: "date" }).defaultNow().notNull(),
  },
  (al) => [index("audit_log_space_idx").on(al.spaceId)]
);

// ============================================================
// Relations
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  spaceMembers: many(spaceMembers),
}));

export const spacesRelations = relations(spaces, ({ many, one }) => ({
  members: many(spaceMembers),
  decisions: many(decisions),
  meetings: many(meetings),
  actions: many(actions),
  tags: many(tags),
  documents: many(documents),
  proposals: many(proposals),
  topics: many(topics),
  insights: many(insights),
  subscription: one(subscriptions, { fields: [spaces.id], references: [subscriptions.spaceId] }),
}));

export const spaceMembersRelations = relations(spaceMembers, ({ one }) => ({
  space: one(spaces, { fields: [spaceMembers.spaceId], references: [spaces.id] }),
  user: one(users, { fields: [spaceMembers.userId], references: [users.id] }),
}));

export const decisionsRelations = relations(decisions, ({ one, many }) => ({
  space: one(spaces, { fields: [decisions.spaceId], references: [spaces.id] }),
  createdByUser: one(users, { fields: [decisions.createdBy], references: [users.id] }),
  actions: many(actions),
  tags: many(decisionTags),
  linksFrom: many(decisionLinks, { relationName: "fromDecision" }),
  linksTo: many(decisionLinks, { relationName: "toDecision" }),
  meetingDecisions: many(meetingDecisions),
  documentVersions: many(documentVersions),
  documentSectionLinks: many(documentSectionLinks),
}));

export const decisionLinksRelations = relations(decisionLinks, ({ one }) => ({
  fromDecision: one(decisions, {
    fields: [decisionLinks.fromDecisionId],
    references: [decisions.id],
    relationName: "fromDecision",
  }),
  toDecision: one(decisions, {
    fields: [decisionLinks.toDecisionId],
    references: [decisions.id],
    relationName: "toDecision",
  }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  space: one(spaces, { fields: [tags.spaceId], references: [spaces.id] }),
  decisions: many(decisionTags),
}));

export const decisionTagsRelations = relations(decisionTags, ({ one }) => ({
  decision: one(decisions, { fields: [decisionTags.decisionId], references: [decisions.id] }),
  tag: one(tags, { fields: [decisionTags.tagId], references: [tags.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  space: one(spaces, { fields: [meetings.spaceId], references: [spaces.id] }),
  createdByUser: one(users, { fields: [meetings.createdBy], references: [users.id] }),
  attendees: many(meetingAttendees),
  agendaItems: many(meetingAgendaItems),
  decisions: many(meetingDecisions),
  actions: many(meetingActions),
  documents: many(meetingDocuments),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingAttendees.meetingId], references: [meetings.id] }),
  user: one(users, { fields: [meetingAttendees.userId], references: [users.id] }),
}));

export const meetingAgendaItemsRelations = relations(meetingAgendaItems, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingAgendaItems.meetingId], references: [meetings.id] }),
  proposal: one(proposals, { fields: [meetingAgendaItems.proposalId], references: [proposals.id] }),
  topic: one(topics, { fields: [meetingAgendaItems.topicId], references: [topics.id] }),
}));

export const meetingDecisionsRelations = relations(meetingDecisions, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingDecisions.meetingId], references: [meetings.id] }),
  decision: one(decisions, { fields: [meetingDecisions.decisionId], references: [decisions.id] }),
}));

export const meetingActionsRelations = relations(meetingActions, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingActions.meetingId], references: [meetings.id] }),
  action: one(actions, { fields: [meetingActions.actionId], references: [actions.id] }),
}));

export const meetingDocumentsRelations = relations(meetingDocuments, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingDocuments.meetingId], references: [meetings.id] }),
  document: one(documents, { fields: [meetingDocuments.documentId], references: [documents.id] }),
}));


export const actionsRelations = relations(actions, ({ one }) => ({
  space: one(spaces, { fields: [actions.spaceId], references: [spaces.id] }),
  decision: one(decisions, { fields: [actions.decisionId], references: [decisions.id] }),
  topic: one(topics, { fields: [actions.topicId], references: [topics.id] }),
  proposal: one(proposals, { fields: [actions.proposalId], references: [proposals.id] }),
  owner: one(users, { fields: [actions.ownerId], references: [users.id] }),
}));

// --- Document relations ---

export const documentsRelations = relations(documents, ({ one, many }) => ({
  space: one(spaces, { fields: [documents.spaceId], references: [spaces.id] }),
  createdByUser: one(users, { fields: [documents.createdBy], references: [users.id] }),
  versions: many(documentVersions),
  sectionLinks: many(documentSectionLinks),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, { fields: [documentVersions.documentId], references: [documents.id] }),
  decision: one(decisions, { fields: [documentVersions.decisionId], references: [decisions.id] }),
  createdByUser: one(users, { fields: [documentVersions.createdBy], references: [users.id] }),
}));

export const documentSectionLinksRelations = relations(documentSectionLinks, ({ one }) => ({
  document: one(documents, { fields: [documentSectionLinks.documentId], references: [documents.id] }),
  decision: one(decisions, { fields: [documentSectionLinks.decisionId], references: [decisions.id] }),
}));

// --- Proposal relations ---

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  space: one(spaces, { fields: [proposals.spaceId], references: [spaces.id] }),
  createdByUser: one(users, { fields: [proposals.createdBy], references: [users.id] }),
  decidedAsDecision: one(decisions, { fields: [proposals.decidedAsDecisionId], references: [decisions.id] }),
  comments: many(proposalComments),
  references: many(proposalReferences),
}));

export const proposalReferencesRelations = relations(proposalReferences, ({ one }) => ({
  proposal: one(proposals, { fields: [proposalReferences.proposalId], references: [proposals.id] }),
}));

export const proposalCommentsRelations = relations(proposalComments, ({ one }) => ({
  proposal: one(proposals, { fields: [proposalComments.proposalId], references: [proposals.id] }),
  author: one(users, { fields: [proposalComments.authorId], references: [users.id] }),
}));

// --- Topic relations ---

export const topicsRelations = relations(topics, ({ one }) => ({
  space: one(spaces, { fields: [topics.spaceId], references: [spaces.id] }),
  createdByUser: one(users, { fields: [topics.createdBy], references: [users.id] }),
  promotedToProposal: one(proposals, { fields: [topics.promotedToProposalId], references: [proposals.id] }),
}));

// --- Insight relations ---

export const insightsRelations = relations(insights, ({ one }) => ({
  space: one(spaces, { fields: [insights.spaceId], references: [spaces.id] }),
  relatedDecision: one(decisions, { fields: [insights.relatedDecisionId], references: [decisions.id] }),
  relatedDocument: one(documents, { fields: [insights.relatedDocumentId], references: [documents.id] }),
}));

// --- Subscription relations ---

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  space: one(spaces, { fields: [subscriptions.spaceId], references: [spaces.id] }),
}));

// --- Notifications ---

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body"),
    link: varchar("link", { length: 1000 }),
    referenceId: uuid("reference_id"),
    read: boolean("read").default(false).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (n) => [
    // Drives the unread-count and the recipient's notification list.
    index("notifications_user_read_idx").on(n.userId, n.read),
    index("notifications_user_created_idx").on(n.userId, n.createdAt),
  ]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  space: one(spaces, { fields: [notifications.spaceId], references: [spaces.id] }),
}));
