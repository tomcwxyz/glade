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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

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
    date: timestamp("date", { mode: "date" }).notNull(),
    conditions: text("conditions"),
    reviewDate: timestamp("review_date", { mode: "date" }),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (d) => [
    index("decisions_space_idx").on(d.spaceId),
    index("decisions_status_idx").on(d.status),
    index("decisions_date_idx").on(d.date),
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
  (t) => [index("tags_space_idx").on(t.spaceId)]
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
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id),
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
  (md) => [primaryKey({ columns: [md.meetingId, md.decisionId] })]
);

// --- Actions ---

export const actions = pgTable(
  "actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => decisions.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    ownerId: uuid("owner_id").references(() => users.id),
    ownerName: varchar("owner_name", { length: 255 }),
    dueDate: timestamp("due_date", { mode: "date" }),
    status: actionStatusEnum("status").default("open").notNull(),
    completedAt: timestamp("completed_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (a) => [
    index("actions_space_idx").on(a.spaceId),
    index("actions_decision_idx").on(a.decisionId),
    index("actions_status_idx").on(a.status),
  ]
);

// ============================================================
// Relations
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  spaceMembers: many(spaceMembers),
}));

export const spacesRelations = relations(spaces, ({ many }) => ({
  members: many(spaceMembers),
  decisions: many(decisions),
  meetings: many(meetings),
  actions: many(actions),
  tags: many(tags),
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
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingAttendees.meetingId], references: [meetings.id] }),
  user: one(users, { fields: [meetingAttendees.userId], references: [users.id] }),
}));

export const meetingAgendaItemsRelations = relations(meetingAgendaItems, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingAgendaItems.meetingId], references: [meetings.id] }),
}));

export const meetingDecisionsRelations = relations(meetingDecisions, ({ one }) => ({
  meeting: one(meetings, { fields: [meetingDecisions.meetingId], references: [meetings.id] }),
  decision: one(decisions, { fields: [meetingDecisions.decisionId], references: [decisions.id] }),
}));

export const actionsRelations = relations(actions, ({ one }) => ({
  space: one(spaces, { fields: [actions.spaceId], references: [spaces.id] }),
  decision: one(decisions, { fields: [actions.decisionId], references: [decisions.id] }),
  owner: one(users, { fields: [actions.ownerId], references: [users.id] }),
}));
