import { db } from "@/db";
import {
  decisions,
  decisionLinks,
  decisionResponses,
  decisionReviews,
  decisionTags,
  tags,
  actions,
  meetings,
  meetingAgendaItems,
  meetingAttendees,
  meetingDecisions,
  meetingActions,
  meetingDocuments,
  spaceMembers,
  users,
  documents,
  documentVersions,
  documentSectionLinks,
  proposals,
  proposalComments,
  proposalReferences,
  topics,
  insights,
  spaces,
  subscriptions,
  apiKeys,
  webhooks,
  auditLog,
  invitations,
  notifications,
} from "@/db/schema";
import { eq, and, or, desc, asc, count, sql, inArray, lt, isNull, notInArray, ilike } from "drizzle-orm";
import { deriveActionStatus } from "@/lib/utils";

// ============================================================
// Decisions
// ============================================================

export async function getDecisions(
  spaceId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  let dq = db
    .select()
    .from(decisions)
    .where(eq(decisions.spaceId, spaceId))
    .orderBy(desc(decisions.date), desc(decisions.number))
    .$dynamic();
  if (opts.limit != null) dq = dq.limit(opts.limit);
  if (opts.offset != null) dq = dq.offset(opts.offset);
  const rows = await dq;

  const ids = rows.map((d) => d.id);
  if (ids.length === 0) return [];

  const [allTags, allActions, forwardLinks, reverseLinks] = await Promise.all([
    db
      .select({ decisionId: decisionTags.decisionId, name: tags.name })
      .from(decisionTags)
      .innerJoin(tags, eq(tags.id, decisionTags.tagId))
      .where(inArray(decisionTags.decisionId, ids)),
    db
      .select({ decisionId: actions.decisionId, status: actions.status })
      .from(actions)
      .where(inArray(actions.decisionId, ids)),
    db
      .select({
        fromId: decisionLinks.fromDecisionId,
        id: decisions.id,
        number: decisions.number,
        title: decisions.title,
        relation: decisionLinks.linkType,
      })
      .from(decisionLinks)
      .innerJoin(decisions, eq(decisions.id, decisionLinks.toDecisionId))
      .where(inArray(decisionLinks.fromDecisionId, ids)),
    db
      .select({
        toId: decisionLinks.toDecisionId,
        id: decisions.id,
        number: decisions.number,
        title: decisions.title,
        relation: decisionLinks.linkType,
      })
      .from(decisionLinks)
      .innerJoin(decisions, eq(decisions.id, decisionLinks.fromDecisionId))
      .where(inArray(decisionLinks.toDecisionId, ids)),
  ]);

  const tagMap = new Map<string, string[]>();
  for (const t of allTags) {
    const arr = tagMap.get(t.decisionId) || [];
    arr.push(t.name);
    tagMap.set(t.decisionId, arr);
  }

  const actionMap = new Map<string, { total: number; complete: number }>();
  for (const a of allActions) {
    if (!a.decisionId) continue;
    const entry = actionMap.get(a.decisionId) || { total: 0, complete: 0 };
    entry.total++;
    if (a.status === "complete") entry.complete++;
    actionMap.set(a.decisionId, entry);
  }

  type LinkedDecision = { id: string; number: number; title: string; relation: string; direction: string };
  const linkMap = new Map<string, LinkedDecision[]>();
  for (const l of forwardLinks) {
    const arr = linkMap.get(l.fromId) || [];
    arr.push({ id: l.id, number: l.number, title: l.title, relation: l.relation, direction: "forward" });
    linkMap.set(l.fromId, arr);
  }
  for (const l of reverseLinks) {
    const arr = linkMap.get(l.toId) || [];
    arr.push({ id: l.id, number: l.number, title: l.title, relation: l.relation, direction: "reverse" });
    linkMap.set(l.toId, arr);
  }

  return rows.map((d) => ({
    ...d,
    tags: tagMap.get(d.id) || [],
    actionsCount: actionMap.get(d.id)?.total || 0,
    actionsComplete: actionMap.get(d.id)?.complete || 0,
    linkedDecisions: linkMap.get(d.id) || [],
  }));
}

export async function getDecisionByNumber(spaceId: string, number: number) {
  const [d] = await db
    .select()
    .from(decisions)
    .where(and(eq(decisions.spaceId, spaceId), eq(decisions.number, number)))
    .limit(1);

  if (!d) return null;

  // Tags
  const tagRows = await db
    .select({ name: tags.name })
    .from(decisionTags)
    .innerJoin(tags, eq(tags.id, decisionTags.tagId))
    .where(eq(decisionTags.decisionId, d.id));

  // Actions
  const actionRows = await db
    .select()
    .from(actions)
    .where(eq(actions.decisionId, d.id));

  // Links (both directions)
  const linkedRows = await db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      relation: decisionLinks.linkType,
    })
    .from(decisionLinks)
    .innerJoin(decisions, eq(decisions.id, decisionLinks.toDecisionId))
    .where(eq(decisionLinks.fromDecisionId, d.id));

  const reverseLinkedRows = await db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      relation: decisionLinks.linkType,
    })
    .from(decisionLinks)
    .innerJoin(decisions, eq(decisions.id, decisionLinks.fromDecisionId))
    .where(eq(decisionLinks.toDecisionId, d.id));

  // Meeting
  const meetingRow = await db
    .select({ title: meetings.title })
    .from(meetingDecisions)
    .innerJoin(meetings, eq(meetings.id, meetingDecisions.meetingId))
    .where(eq(meetingDecisions.decisionId, d.id))
    .limit(1);

  return {
    ...d,
    tags: tagRows.map((t) => t.name),
    actions: actionRows,
    linkedDecisions: [...linkedRows, ...reverseLinkedRows],
    meetingTitle: meetingRow[0]?.title || null,
  };
}

// ============================================================
// Actions
// ============================================================

export async function getActions(
  spaceId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  let q = db
    .select({
      id: actions.id,
      description: actions.description,
      ownerName: actions.ownerName,
      dueDate: actions.dueDate,
      status: actions.status,
      isPublic: actions.isPublic,
      decisionNumber: decisions.number,
      decisionTitle: decisions.title,
      decisionId: actions.decisionId,
      topicId: actions.topicId,
      proposalId: actions.proposalId,
      topicTitle: topics.title,
      proposalTitle: proposals.title,
    })
    .from(actions)
    .leftJoin(decisions, eq(decisions.id, actions.decisionId))
    .leftJoin(topics, eq(topics.id, actions.topicId))
    .leftJoin(proposals, eq(proposals.id, actions.proposalId))
    .where(eq(actions.spaceId, spaceId))
    .orderBy(desc(actions.createdAt))
    .$dynamic();
  if (opts.limit != null) q = q.limit(opts.limit);
  if (opts.offset != null) q = q.offset(opts.offset);
  const rows = await q;

  return rows.map((r) => {
    let parentType: "decision" | "topic" | "proposal" = "decision";
    let parentTitle = "";
    let parentHref = "";

    if (r.decisionId && r.decisionNumber != null) {
      parentType = "decision";
      parentTitle = `#${r.decisionNumber} ${r.decisionTitle}`;
      parentHref = `/decisions/${r.decisionNumber}`;
    } else if (r.topicId) {
      parentType = "topic";
      parentTitle = `Topic: ${r.topicTitle}`;
      parentHref = `/topics/${r.topicId}`;
    } else if (r.proposalId) {
      parentType = "proposal";
      parentTitle = `Proposal: ${r.proposalTitle}`;
      parentHref = `/proposals/${r.proposalId}`;
    }

    return {
      id: r.id,
      description: r.description,
      ownerName: r.ownerName,
      dueDate: r.dueDate,
      status: deriveActionStatus(r.status, r.dueDate),
      isPublic: r.isPublic,
      decisionNumber: r.decisionNumber,
      decisionTitle: r.decisionTitle,
      parentType,
      parentTitle,
      parentHref,
    };
  });
}

export async function getActionsByTopic(topicId: string) {
  const rows = await db
    .select()
    .from(actions)
    .where(eq(actions.topicId, topicId))
    .orderBy(desc(actions.createdAt));
  return rows.map((r) => ({ ...r, status: deriveActionStatus(r.status, r.dueDate) }));
}

export async function getActionsByProposal(proposalId: string) {
  const rows = await db
    .select()
    .from(actions)
    .where(eq(actions.proposalId, proposalId))
    .orderBy(desc(actions.createdAt));
  return rows.map((r) => ({ ...r, status: deriveActionStatus(r.status, r.dueDate) }));
}

// ============================================================
// Meetings
// ============================================================

export async function getMeetings(
  spaceId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  let mq = db
    .select()
    .from(meetings)
    .where(eq(meetings.spaceId, spaceId))
    .orderBy(desc(meetings.date))
    .$dynamic();
  if (opts.limit != null) mq = mq.limit(opts.limit);
  if (opts.offset != null) mq = mq.offset(opts.offset);
  const rows = await mq;

  const ids = rows.map((m) => m.id);
  if (ids.length === 0) return [];

  const [allAttendees, allDecisionCounts] = await Promise.all([
    db
      .select({ meetingId: meetingAttendees.meetingId, name: users.name })
      .from(meetingAttendees)
      .innerJoin(users, eq(users.id, meetingAttendees.userId))
      .where(inArray(meetingAttendees.meetingId, ids)),
    db
      .select({ meetingId: meetingDecisions.meetingId, count: count() })
      .from(meetingDecisions)
      .where(inArray(meetingDecisions.meetingId, ids))
      .groupBy(meetingDecisions.meetingId),
  ]);

  const attendeeMap = new Map<string, string[]>();
  for (const a of allAttendees) {
    const arr = attendeeMap.get(a.meetingId) || [];
    arr.push(a.name || "Unknown");
    attendeeMap.set(a.meetingId, arr);
  }

  const decisionCountMap = new Map<string, number>();
  for (const d of allDecisionCounts) {
    decisionCountMap.set(d.meetingId, d.count);
  }

  return rows.map((m) => ({
    ...m,
    attendees: attendeeMap.get(m.id) || [],
    decisionsCount: decisionCountMap.get(m.id) || 0,
  }));
}

export async function getMeetingById(spaceId: string, meetingId: string) {
  const [m] = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.spaceId, spaceId), eq(meetings.id, meetingId)))
    .limit(1);

  if (!m) return null;

  const attendeeRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(meetingAttendees)
    .innerJoin(users, eq(users.id, meetingAttendees.userId))
    .where(eq(meetingAttendees.meetingId, m.id));

  const agendaRows = await db
    .select()
    .from(meetingAgendaItems)
    .where(eq(meetingAgendaItems.meetingId, m.id))
    .orderBy(meetingAgendaItems.sortOrder);

  const [decisionRows, actionRows, documentRows, proposalRows] = await Promise.all([
    db
      .select({
        id: decisions.id,
        number: decisions.number,
        title: decisions.title,
        status: decisions.status,
        method: decisions.method,
        outcome: decisions.outcome,
      })
      .from(meetingDecisions)
      .innerJoin(decisions, eq(decisions.id, meetingDecisions.decisionId))
      .where(eq(meetingDecisions.meetingId, m.id)),
    db
      .select({
        id: actions.id,
        description: actions.description,
        status: actions.status,
        ownerName: actions.ownerName,
        dueDate: actions.dueDate,
      })
      .from(meetingActions)
      .innerJoin(actions, eq(actions.id, meetingActions.actionId))
      .where(eq(meetingActions.meetingId, m.id)),
    db
      .select({
        id: documents.id,
        title: documents.title,
        type: documents.type,
        status: documents.status,
      })
      .from(meetingDocuments)
      .innerJoin(documents, eq(documents.id, meetingDocuments.documentId))
      .where(eq(meetingDocuments.meetingId, m.id)),
    db
      .selectDistinct({
        id: proposals.id,
        title: proposals.title,
        status: proposals.status,
      })
      .from(meetingAgendaItems)
      .innerJoin(proposals, eq(proposals.id, meetingAgendaItems.proposalId))
      .where(eq(meetingAgendaItems.meetingId, m.id)),
  ]);

  return {
    ...m,
    attendees: attendeeRows,
    agendaItems: agendaRows,
    decisions: decisionRows,
    actions: actionRows,
    documents: documentRows,
    proposals: proposalRows,
  };
}

/**
 * Public live-observer state, scoped by share token (the revocable access
 * grant). Returns null when the token doesn't match — callers treat as 404.
 */
export async function getMeetingSessionStateByShareToken(token: string) {
  if (!token) return null;
  const [m] = await db
    .select({ sessionState: meetings.sessionState, status: meetings.status })
    .from(meetings)
    .where(eq(meetings.shareToken, token))
    .limit(1);
  return m || null;
}

export async function getMeetingByShareToken(token: string) {
  const [m] = await db
    .select()
    .from(meetings)
    .where(eq(meetings.shareToken, token))
    .limit(1);

  if (!m) return null;

  const attendeeRows = await db
    .select({ id: users.id, name: users.name })
    .from(meetingAttendees)
    .innerJoin(users, eq(users.id, meetingAttendees.userId))
    .where(eq(meetingAttendees.meetingId, m.id));

  const agendaRows = await db
    .select()
    .from(meetingAgendaItems)
    .where(eq(meetingAgendaItems.meetingId, m.id))
    .orderBy(meetingAgendaItems.sortOrder);

  return {
    ...m,
    attendees: attendeeRows,
    agendaItems: agendaRows,
  };
}

export async function updateMeetingSessionState(
  meetingId: string,
  sessionState: unknown,
  expectedVersion: number
) {
  // Optimistic locking: only update if version matches
  const result = await db
    .update(meetings)
    .set({ sessionState, updatedAt: new Date() })
    .where(
      and(
        eq(meetings.id, meetingId),
        sql`(${meetings.sessionState}->>'version')::int = ${expectedVersion}
          OR ${meetings.sessionState} IS NULL`
      )
    )
    .returning({ id: meetings.id });

  return result.length > 0;
}

/**
 * Fetch live session state only if the user is a member of the meeting's space.
 * Returns null when the meeting doesn't exist OR the user isn't a member —
 * callers should treat null as 404 (don't leak existence cross-tenant).
 */
export async function getMeetingSessionStateForUser(
  meetingId: string,
  userId: string
) {
  const [m] = await db
    .select({ sessionState: meetings.sessionState, status: meetings.status })
    .from(meetings)
    .innerJoin(spaceMembers, eq(spaceMembers.spaceId, meetings.spaceId))
    .where(and(eq(meetings.id, meetingId), eq(spaceMembers.userId, userId)))
    .limit(1);

  return m || null;
}

/**
 * Confirm the user is a member of the meeting's space. Used to gate the
 * version-locked state update at the API route.
 */
export async function isMeetingSpaceMember(meetingId: string, userId: string) {
  const [row] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .innerJoin(spaceMembers, eq(spaceMembers.spaceId, meetings.spaceId))
    .where(and(eq(meetings.id, meetingId), eq(spaceMembers.userId, userId)))
    .limit(1);

  return !!row;
}

// ============================================================
// Stats
// ============================================================

export async function getSpaceStats(spaceId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Conditional aggregates in two queries instead of fetching every row to
  // count in JS.
  const [[dStats], [aStats]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        reviewed: sql<number>`count(*) filter (where ${decisions.reviewDate} is not null)::int`,
        upcoming: sql<number>`count(*) filter (where ${decisions.reviewDate} > ${now})::int`,
        thisMonth: sql<number>`count(*) filter (where ${decisions.date} >= ${monthStart})::int`,
      })
      .from(decisions)
      .where(eq(decisions.spaceId, spaceId)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where ${actions.status} = 'complete')::int`,
      })
      .from(actions)
      .where(eq(actions.spaceId, spaceId)),
  ]);

  const totalDecisions = Number(dStats?.total ?? 0);
  const reviewedDecisions = Number(dStats?.reviewed ?? 0);
  const totalActions = Number(aStats?.total ?? 0);
  const completedActions = Number(aStats?.completed ?? 0);

  return {
    totalDecisions,
    reviewRate: totalDecisions > 0 ? reviewedDecisions / totalDecisions : 0,
    actionCompletionRate: totalActions > 0 ? completedActions / totalActions : 0,
    activeActions: totalActions - completedActions,
    decisionsThisMonth: Number(dStats?.thisMonth ?? 0),
    upcomingReviews: Number(dStats?.upcoming ?? 0),
  };
}

// ============================================================
// Lightweight lists (for pickers)
// ============================================================

export async function getDecisionsList(spaceId: string) {
  return db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      status: decisions.status,
    })
    .from(decisions)
    .where(eq(decisions.spaceId, spaceId))
    .orderBy(desc(decisions.number));
}

export async function getMeetingsList(spaceId: string) {
  return db
    .select({
      id: meetings.id,
      title: meetings.title,
      date: meetings.date,
      status: meetings.status,
    })
    .from(meetings)
    .where(eq(meetings.spaceId, spaceId))
    .orderBy(desc(meetings.date));
}

export async function getActionsList(spaceId: string) {
  return db
    .select({ id: actions.id, description: actions.description })
    .from(actions)
    .where(eq(actions.spaceId, spaceId))
    .orderBy(desc(actions.createdAt));
}

export async function getDocumentsList(spaceId: string) {
  return db
    .select({ id: documents.id, title: documents.title })
    .from(documents)
    .where(eq(documents.spaceId, spaceId))
    .orderBy(documents.title);
}

export async function getProposalsList(spaceId: string) {
  return db
    .select({ id: proposals.id, title: proposals.title })
    .from(proposals)
    .where(eq(proposals.spaceId, spaceId))
    .orderBy(desc(proposals.createdAt));
}

// ============================================================
// Decision links (with IDs for deletion)
// ============================================================

export async function getDecisionLinksWithIds(decisionId: string) {
  const forwardLinks = await db
    .select({
      linkId: decisionLinks.id,
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      relation: decisionLinks.linkType,
      direction: sql<string>`'forward'`,
    })
    .from(decisionLinks)
    .innerJoin(decisions, eq(decisions.id, decisionLinks.toDecisionId))
    .where(eq(decisionLinks.fromDecisionId, decisionId));

  const reverseLinks = await db
    .select({
      linkId: decisionLinks.id,
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      relation: decisionLinks.linkType,
      direction: sql<string>`'reverse'`,
    })
    .from(decisionLinks)
    .innerJoin(decisions, eq(decisions.id, decisionLinks.fromDecisionId))
    .where(eq(decisionLinks.toDecisionId, decisionId));

  return [...forwardLinks, ...reverseLinks];
}

export async function getDecisionMeetings(decisionId: string) {
  return db
    .select({
      meetingId: meetings.id,
      title: meetings.title,
      date: meetings.date,
    })
    .from(meetingDecisions)
    .innerJoin(meetings, eq(meetings.id, meetingDecisions.meetingId))
    .where(eq(meetingDecisions.decisionId, decisionId));
}

export async function getActionMeetings(actionId: string) {
  return db
    .select({
      meetingId: meetings.id,
      title: meetings.title,
      date: meetings.date,
    })
    .from(meetingActions)
    .innerJoin(meetings, eq(meetings.id, meetingActions.meetingId))
    .where(eq(meetingActions.actionId, actionId));
}

export async function getDocumentMeetings(documentId: string) {
  return db
    .select({
      meetingId: meetings.id,
      title: meetings.title,
      date: meetings.date,
    })
    .from(meetingDocuments)
    .innerJoin(meetings, eq(meetings.id, meetingDocuments.meetingId))
    .where(eq(meetingDocuments.documentId, documentId));
}

export async function getProposalMeetings(proposalId: string) {
  // Single source of truth: a proposal is "on" a meeting when it's an agenda item.
  return db
    .selectDistinct({
      meetingId: meetings.id,
      title: meetings.title,
      date: meetings.date,
    })
    .from(meetingAgendaItems)
    .innerJoin(meetings, eq(meetings.id, meetingAgendaItems.meetingId))
    .where(eq(meetingAgendaItems.proposalId, proposalId));
}

// ============================================================
// Tags
// ============================================================

export async function getSpaceTags(spaceId: string) {
  return db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags)
    .where(eq(tags.spaceId, spaceId));
}

// ============================================================
// Next decision number
// ============================================================

export async function getNextDecisionNumber(spaceId: string) {
  const [result] = await db
    .select({ maxNumber: sql<number>`coalesce(max(${decisions.number}), 0)` })
    .from(decisions)
    .where(eq(decisions.spaceId, spaceId));
  return (result?.maxNumber ?? 0) + 1;
}

/** True when an error is the unique-violation on (space_id, number). */
function isDecisionNumberConflict(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "23505") return true;
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("decisions_space_number_unq") || msg.includes("duplicate key");
}

/** Either the top-level db or a transaction handle from db.transaction(). */
export type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Insert a decision with the next per-space number, retrying on the unique
 * (space_id, number) violation so concurrent creates can't fail or duplicate.
 * The unique index is the real guarantee; this just avoids a user-facing error.
 *
 * Pass a transaction handle as `executor` to enlist the insert in a wider atomic
 * write. Each attempt runs in its own (possibly nested = SAVEPOINT) transaction so
 * a conflict rolls back just that attempt without poisoning the enclosing tx.
 */
export async function insertDecisionWithUniqueNumber(
  spaceId: string,
  values: Omit<typeof decisions.$inferInsert, "number" | "spaceId">,
  executor: DbOrTx = db
): Promise<{ id: string; number: number }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const row = await executor.transaction(async (sp) => {
        const [{ maxNumber }] = await sp
          .select({ maxNumber: sql<number>`coalesce(max(${decisions.number}), 0)` })
          .from(decisions)
          .where(eq(decisions.spaceId, spaceId));
        const number = (maxNumber ?? 0) + 1;
        const [inserted] = await sp
          .insert(decisions)
          .values({ ...values, spaceId, number })
          .returning({ id: decisions.id, number: decisions.number });
        return inserted;
      });
      return row;
    } catch (err) {
      if (attempt < 2 && isDecisionNumberConflict(err)) continue;
      throw err;
    }
  }
  throw new Error("Could not assign a unique decision number");
}

// ============================================================
// Members
// ============================================================

export async function getSpaceMembers(spaceId: string) {
  return db
    .select({
      id: spaceMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: spaceMembers.role,
      joinedAt: spaceMembers.joinedAt,
    })
    .from(spaceMembers)
    .innerJoin(users, eq(users.id, spaceMembers.userId))
    .where(eq(spaceMembers.spaceId, spaceId));
}

// ============================================================
// Documents
// ============================================================

export async function getDocuments(
  spaceId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  let q = db
    .select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      status: documents.status,
      currentVersion: documents.currentVersion,
      updatedAt: documents.updatedAt,
      createdByName: users.name,
    })
    .from(documents)
    .leftJoin(users, eq(users.id, documents.createdBy))
    .where(eq(documents.spaceId, spaceId))
    .orderBy(desc(documents.updatedAt))
    .$dynamic();
  if (opts.limit != null) q = q.limit(opts.limit);
  if (opts.offset != null) q = q.offset(opts.offset);
  return q;
}

export async function getDocumentById(spaceId: string, documentId: string) {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.spaceId, spaceId), eq(documents.id, documentId)))
    .limit(1);

  if (!doc) return null;

  const versions = await db
    .select({
      id: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      changeDescription: documentVersions.changeDescription,
      decisionId: documentVersions.decisionId,
      createdByName: users.name,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .leftJoin(users, eq(users.id, documentVersions.createdBy))
    .where(eq(documentVersions.documentId, doc.id))
    .orderBy(desc(documentVersions.versionNumber));

  const sectionLinks = await db
    .select({
      id: documentSectionLinks.id,
      sectionId: documentSectionLinks.sectionId,
      decisionId: decisions.id,
      decisionNumber: decisions.number,
      decisionTitle: decisions.title,
    })
    .from(documentSectionLinks)
    .innerJoin(decisions, eq(decisions.id, documentSectionLinks.decisionId))
    .where(eq(documentSectionLinks.documentId, doc.id));

  const createdByUser = doc.createdBy
    ? await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, doc.createdBy))
        .limit(1)
    : [];

  return {
    ...doc,
    versions,
    sectionLinks,
    createdByName: createdByUser[0]?.name || null,
  };
}

export async function getDocumentVersions(documentId: string) {
  return db
    .select({
      id: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      content: documentVersions.content,
      changeDescription: documentVersions.changeDescription,
      decisionId: documentVersions.decisionId,
      decisionNumber: decisions.number,
      decisionTitle: decisions.title,
      createdByName: users.name,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .leftJoin(users, eq(users.id, documentVersions.createdBy))
    .leftJoin(decisions, eq(decisions.id, documentVersions.decisionId))
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNumber));
}

export async function getDocumentVersionAtDate(documentId: string, targetDate: Date) {
  const [version] = await db
    .select({
      id: documentVersions.id,
      versionNumber: documentVersions.versionNumber,
      content: documentVersions.content,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        sql`${documentVersions.createdAt} <= ${targetDate}`
      )
    )
    .orderBy(desc(documentVersions.versionNumber))
    .limit(1);

  return version || null;
}

// ============================================================
// Proposals
// ============================================================

export async function getProposals(
  spaceId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  let pq = db
    .select({
      id: proposals.id,
      title: proposals.title,
      description: proposals.description,
      status: proposals.status,
      createdByName: users.name,
      createdAt: proposals.createdAt,
      updatedAt: proposals.updatedAt,
    })
    .from(proposals)
    .leftJoin(users, eq(users.id, proposals.createdBy))
    .where(eq(proposals.spaceId, spaceId))
    .orderBy(desc(proposals.updatedAt))
    .$dynamic();
  if (opts.limit != null) pq = pq.limit(opts.limit);
  if (opts.offset != null) pq = pq.offset(opts.offset);
  const rows = await pq;

  const ids = rows.map((p) => p.id);
  if (ids.length === 0) return [];

  const commentCounts = await db
    .select({ proposalId: proposalComments.proposalId, count: count() })
    .from(proposalComments)
    .where(inArray(proposalComments.proposalId, ids))
    .groupBy(proposalComments.proposalId);

  const commentMap = new Map<string, number>();
  for (const c of commentCounts) {
    commentMap.set(c.proposalId, c.count);
  }

  return rows.map((p) => ({
    ...p,
    commentCount: commentMap.get(p.id) || 0,
  }));
}

export async function getProposalById(spaceId: string, proposalId: string) {
  const [p] = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.spaceId, spaceId), eq(proposals.id, proposalId)))
    .limit(1);

  if (!p) return null;

  const createdByUser = p.createdBy
    ? await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, p.createdBy))
        .limit(1)
    : [];

  const commentRows = await db
    .select({
      id: proposalComments.id,
      content: proposalComments.content,
      parentId: proposalComments.parentId,
      authorId: proposalComments.authorId,
      authorName: users.name,
      createdAt: proposalComments.createdAt,
    })
    .from(proposalComments)
    .leftJoin(users, eq(users.id, proposalComments.authorId))
    .where(eq(proposalComments.proposalId, p.id))
    .orderBy(asc(proposalComments.createdAt));

  const referenceRows = await db
    .select({
      id: proposalReferences.id,
      title: proposalReferences.title,
      url: proposalReferences.url,
    })
    .from(proposalReferences)
    .where(eq(proposalReferences.proposalId, p.id));

  // Fetch linked decision number if decidedAsDecisionId is set
  let linkedDecisionNumber: number | null = null;
  if (p.decidedAsDecisionId) {
    const [dec] = await db
      .select({ number: decisions.number })
      .from(decisions)
      .where(eq(decisions.id, p.decidedAsDecisionId))
      .limit(1);
    linkedDecisionNumber = dec?.number ?? null;
  }

  return {
    ...p,
    createdByName: createdByUser[0]?.name || null,
    comments: commentRows,
    references: referenceRows,
    linkedDecisionNumber,
  };
}

// ============================================================
// Topics
// ============================================================

export async function getTopics(
  spaceId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  let q = db
    .select({
      id: topics.id,
      title: topics.title,
      description: topics.description,
      type: topics.type,
      promotedToProposalId: topics.promotedToProposalId,
      createdByName: users.name,
      createdAt: topics.createdAt,
    })
    .from(topics)
    .leftJoin(users, eq(users.id, topics.createdBy))
    .where(eq(topics.spaceId, spaceId))
    .orderBy(desc(topics.createdAt))
    .$dynamic();
  if (opts.limit != null) q = q.limit(opts.limit);
  if (opts.offset != null) q = q.offset(opts.offset);
  return q;
}

// ============================================================
// Insights
// ============================================================

export async function getActiveInsights(spaceId: string) {
  return db
    .select({
      id: insights.id,
      type: insights.type,
      title: insights.title,
      content: insights.content,
      relatedDecisionId: insights.relatedDecisionId,
      relatedDocumentId: insights.relatedDocumentId,
      metadata: insights.metadata,
      createdAt: insights.createdAt,
    })
    .from(insights)
    .where(and(eq(insights.spaceId, spaceId), eq(insights.status, "active")))
    .orderBy(desc(insights.createdAt));
}

export async function getDecisionReviewInsight(decisionId: string) {
  const [insight] = await db
    .select({ id: insights.id, content: insights.content })
    .from(insights)
    .where(
      and(
        eq(insights.type, "review"),
        eq(insights.relatedDecisionId, decisionId),
        eq(insights.status, "active")
      )
    )
    .limit(1);

  return insight || null;
}

export async function getAvailableTopics(spaceId: string) {
  return db
    .select({
      id: topics.id,
      title: topics.title,
      description: topics.description,
      type: topics.type,
    })
    .from(topics)
    .where(
      and(
        eq(topics.spaceId, spaceId),
        sql`${topics.promotedToProposalId} is null`
      )
    )
    .orderBy(desc(topics.createdAt));
}

export async function getTopicById(spaceId: string, topicId: string) {
  const [t] = await db
    .select()
    .from(topics)
    .where(and(eq(topics.spaceId, spaceId), eq(topics.id, topicId)))
    .limit(1);

  if (!t) return null;

  const createdByUser = t.createdBy
    ? await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, t.createdBy))
        .limit(1)
    : [];

  return {
    ...t,
    createdByName: createdByUser[0]?.name || null,
  };
}

// ============================================================
// Subscriptions
// ============================================================

export async function getSpaceSubscription(spaceId: string) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.spaceId, spaceId))
    .limit(1);
  return row || null;
}

export async function getDecisionCount(spaceId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(decisions)
    .where(eq(decisions.spaceId, spaceId));
  return result?.count ?? 0;
}

export async function getMemberCount(spaceId: string) {
  const [result] = await db
    .select({ count: count() })
    .from(spaceMembers)
    .where(eq(spaceMembers.spaceId, spaceId));
  return result?.count ?? 0;
}

// ============================================================
// Governance Health
// ============================================================

export async function getPublicSpace(slug: string) {
  const [space] = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      slug: spaces.slug,
      description: spaces.description,
      settings: spaces.settings,
    })
    .from(spaces)
    .where(eq(spaces.slug, slug))
    .limit(1);

  return space || null;
}

export async function getPublicDecisions(spaceId: string) {
  const rows = await db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      date: decisions.date,
      status: decisions.status,
      method: decisions.method,
      outcome: decisions.outcome,
      description: decisions.description,
    })
    .from(decisions)
    .where(and(eq(decisions.spaceId, spaceId), eq(decisions.isPublic, true)))
    .orderBy(desc(decisions.date), desc(decisions.number));

  const ids = rows.map((d) => d.id);
  if (ids.length === 0) return [];

  const allTags = await db
    .select({ decisionId: decisionTags.decisionId, name: tags.name })
    .from(decisionTags)
    .innerJoin(tags, eq(tags.id, decisionTags.tagId))
    .where(inArray(decisionTags.decisionId, ids));

  return rows.map((d) => ({
    ...d,
    tags: allTags.filter((t) => t.decisionId === d.id).map((t) => t.name),
  }));
}

export async function getPublicDocuments(spaceId: string) {
  return db
    .select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      currentVersion: documents.currentVersion,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(and(eq(documents.spaceId, spaceId), eq(documents.status, "published"), eq(documents.isPublic, true)))
    .orderBy(desc(documents.updatedAt));
}

export async function getPublicActions(spaceId: string) {
  const rows = await db
    .select({
      id: actions.id,
      description: actions.description,
      ownerName: actions.ownerName,
      status: actions.status,
      dueDate: actions.dueDate,
      decisionTitle: decisions.title,
      decisionNumber: decisions.number,
      topicTitle: topics.title,
      proposalTitle: proposals.title,
      decisionId: actions.decisionId,
      topicId: actions.topicId,
      proposalId: actions.proposalId,
    })
    .from(actions)
    .leftJoin(decisions, eq(decisions.id, actions.decisionId))
    .leftJoin(topics, eq(topics.id, actions.topicId))
    .leftJoin(proposals, eq(proposals.id, actions.proposalId))
    .where(and(eq(actions.spaceId, spaceId), eq(actions.isPublic, true)))
    .orderBy(desc(actions.createdAt));

  return rows.map((r) => {
    const parentType = r.decisionId ? "decision" : r.topicId ? "topic" : "proposal";
    const parentTitle = r.decisionId
      ? `#${r.decisionNumber} ${r.decisionTitle}`
      : r.topicId
        ? `Topic: ${r.topicTitle}`
        : `Proposal: ${r.proposalTitle}`;

    return {
      id: r.id,
      description: r.description,
      ownerName: r.ownerName,
      status: r.status,
      dueDate: r.dueDate,
      decisionTitle: r.decisionTitle,
      decisionNumber: r.decisionNumber,
      parentType,
      parentTitle,
    };
  });
}

export async function getPublicMeetings(spaceId: string) {
  const rows = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      date: meetings.date,
      type: meetings.type,
      status: meetings.status,
    })
    .from(meetings)
    .where(and(eq(meetings.spaceId, spaceId), eq(meetings.isPublic, true)))
    .orderBy(desc(meetings.date));

  const ids = rows.map((m) => m.id);
  if (ids.length === 0) return [];

  const attendeeCounts = await db
    .select({ meetingId: meetingAttendees.meetingId, count: count() })
    .from(meetingAttendees)
    .where(inArray(meetingAttendees.meetingId, ids))
    .groupBy(meetingAttendees.meetingId);

  const decisionCounts = await db
    .select({ meetingId: meetingDecisions.meetingId, count: count() })
    .from(meetingDecisions)
    .where(inArray(meetingDecisions.meetingId, ids))
    .groupBy(meetingDecisions.meetingId);

  return rows.map((m) => ({
    ...m,
    attendeeCount: attendeeCounts.find((a) => a.meetingId === m.id)?.count ?? 0,
    decisionCount: decisionCounts.find((d) => d.meetingId === m.id)?.count ?? 0,
  }));
}

export async function getPublicProposals(spaceId: string) {
  const rows = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      status: proposals.status,
      suggestedMethod: proposals.suggestedMethod,
      createdBy: proposals.createdBy,
      createdAt: proposals.createdAt,
    })
    .from(proposals)
    .where(and(eq(proposals.spaceId, spaceId), eq(proposals.isPublic, true)))
    .orderBy(desc(proposals.createdAt));

  const creatorIds = rows.map((p) => p.createdBy).filter(Boolean) as string[];
  if (creatorIds.length === 0) return rows.map((p) => ({ ...p, authorName: null }));

  const creators = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, creatorIds));

  return rows.map((p) => ({
    ...p,
    authorName: creators.find((c) => c.id === p.createdBy)?.name ?? null,
  }));
}

export async function getPublicTopics(spaceId: string) {
  const rows = await db
    .select({
      id: topics.id,
      title: topics.title,
      type: topics.type,
      createdBy: topics.createdBy,
      createdAt: topics.createdAt,
    })
    .from(topics)
    .where(and(eq(topics.spaceId, spaceId), eq(topics.isPublic, true)))
    .orderBy(desc(topics.createdAt));

  const creatorIds = rows.map((t) => t.createdBy).filter(Boolean) as string[];
  if (creatorIds.length === 0) return rows.map((t) => ({ ...t, creatorName: null }));

  const creators = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, creatorIds));

  return rows.map((t) => ({
    ...t,
    creatorName: creators.find((c) => c.id === t.createdBy)?.name ?? null,
  }));
}

export async function getPublicGladeDecisions(spaceId: string) {
  const rows = await db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      description: decisions.description,
      rationale: decisions.rationale,
      method: decisions.method,
      outcome: decisions.outcome,
      status: decisions.status,
      participants: decisions.participants,
      date: decisions.date,
      reviewDate: decisions.reviewDate,
    })
    .from(decisions)
    .where(and(eq(decisions.spaceId, spaceId), eq(decisions.isPublic, true)))
    .orderBy(desc(decisions.date), desc(decisions.number));

  const ids = rows.map((d) => d.id);
  if (ids.length === 0) return [];

  const [allTags, allActions, allLinks] = await Promise.all([
    db
      .select({ decisionId: decisionTags.decisionId, name: tags.name })
      .from(decisionTags)
      .innerJoin(tags, eq(tags.id, decisionTags.tagId))
      .where(inArray(decisionTags.decisionId, ids)),
    db
      .select({
        decisionId: actions.decisionId,
        status: actions.status,
      })
      .from(actions)
      .where(inArray(actions.decisionId, ids)),
    db
      .select({
        fromDecisionId: decisionLinks.fromDecisionId,
        toDecisionId: decisionLinks.toDecisionId,
        linkType: decisionLinks.linkType,
      })
      .from(decisionLinks)
      .where(
        or(inArray(decisionLinks.fromDecisionId, ids), inArray(decisionLinks.toDecisionId, ids))
      ),
  ]);

  return rows.map((d) => {
    const dActions = allActions.filter((a) => a.decisionId === d.id);
    const linkedDecisions = allLinks
      .filter((l) => l.fromDecisionId === d.id || l.toDecisionId === d.id)
      .map((l) => {
        const isForward = l.fromDecisionId === d.id;
        const otherId = isForward ? l.toDecisionId : l.fromDecisionId;
        const other = rows.find((r) => r.id === otherId);
        return other
          ? { id: otherId, number: other.number, title: other.title, relation: l.linkType, direction: isForward ? "forward" as const : "reverse" as const }
          : null;
      })
      .filter(Boolean) as { id: string; number: number; title: string; relation: string; direction: "forward" | "reverse" }[];

    return {
      id: d.id,
      number: d.number,
      title: d.title,
      description: d.description || "",
      rationale: d.rationale || "",
      method: d.method,
      outcome: d.outcome || "",
      status: d.status,
      participants: (d.participants as string[]) || [],
      date: d.date.toISOString(),
      tags: allTags.filter((t) => t.decisionId === d.id).map((t) => t.name),
      reviewDate: d.reviewDate?.toISOString() || null,
      actionsCount: dActions.length,
      actionsComplete: dActions.filter((a) => a.status === "complete").length,
      linkedDecisions,
    };
  });
}

export async function getGovernanceHealthStats(spaceId: string) {
  // Stale if a document hasn't been updated in 6+ months.
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [participantRows, methodRows, revisionRows, docStats, proposalRows, memberCount] =
    await Promise.all([
      // Participation: all participant arrays
      db
        .select({ participants: decisions.participants })
        .from(decisions)
        .where(eq(decisions.spaceId, spaceId)),
      // Methods: distinct methods used
      db
        .select({ method: decisions.method })
        .from(decisions)
        .where(eq(decisions.spaceId, spaceId))
        .groupBy(decisions.method),
      // Revisions: decisions targeted by amends/supersedes links
      db
        .select({ id: sql<string>`distinct ${decisionLinks.toDecisionId}` })
        .from(decisionLinks)
        .innerJoin(decisions, eq(decisions.id, decisionLinks.toDecisionId))
        .where(
          and(
            eq(decisions.spaceId, spaceId),
            sql`${decisionLinks.linkType} in ('amends', 'supersedes')`
          )
        ),
      // Document currency (aggregate, not all rows)
      db
        .select({
          total: sql<number>`count(*)::int`,
          stale: sql<number>`count(*) filter (where ${documents.updatedAt} < ${sixMonthsAgo})::int`,
        })
        .from(documents)
        .where(eq(documents.spaceId, spaceId)),
      // Time-to-decision: proposals with decidedAsDecisionId
      db
        .select({
          proposalCreatedAt: proposals.createdAt,
          decisionDate: decisions.date,
        })
        .from(proposals)
        .innerJoin(decisions, eq(decisions.id, proposals.decidedAsDecisionId))
        .where(eq(proposals.spaceId, spaceId)),
      // Member count
      getMemberCount(spaceId),
    ]);

  // Unique participants across all decisions
  const uniqueNames = new Set<string>();
  for (const row of participantRows) {
    const arr = row.participants as string[] | null;
    if (arr) for (const name of arr) uniqueNames.add(name.trim().toLowerCase());
  }

  // Revision rate
  const totalDecisions = participantRows.length;
  const revisedCount = revisionRows.length;
  const revisionRate = totalDecisions > 0 ? revisedCount / totalDecisions : 0;

  const docTotal = Number(docStats[0]?.total ?? 0);
  const staleDocCount = Number(docStats[0]?.stale ?? 0);

  // Median days from proposal to decision
  let medianDaysToDecision: number | null = null;
  if (proposalRows.length > 0) {
    const dayDiffs = proposalRows
      .map((r) => {
        const ms = r.decisionDate.getTime() - r.proposalCreatedAt.getTime();
        return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
      })
      .sort((a, b) => a - b);
    const mid = Math.floor(dayDiffs.length / 2);
    medianDaysToDecision =
      dayDiffs.length % 2 === 0
        ? Math.round((dayDiffs[mid - 1] + dayDiffs[mid]) / 2)
        : dayDiffs[mid];
  }

  return {
    uniqueParticipants: uniqueNames.size,
    totalMembers: memberCount,
    methodsUsed: methodRows.length,
    revisionRate,
    documentCurrency: { total: docTotal, stale: staleDocCount },
    medianDaysToDecision,
  };
}

// ============================================================
// Admin
// ============================================================

export async function getAllSpacesWithPlans() {
  const rows = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      slug: spaces.slug,
      createdAt: spaces.createdAt,
      planTier: subscriptions.planTier,
      subscriptionStatus: subscriptions.status,
      subscriptionId: subscriptions.id,
      stripeCustomerId: subscriptions.stripeCustomerId,
    })
    .from(spaces)
    .leftJoin(subscriptions, eq(subscriptions.spaceId, spaces.id))
    .orderBy(spaces.name);
  return rows;
}

export async function getAllUsers() {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.name);
  return rows;
}

export async function getSpaceMemberCounts() {
  const rows = await db
    .select({
      spaceId: spaceMembers.spaceId,
      count: sql<number>`count(*)::int`,
    })
    .from(spaceMembers)
    .groupBy(spaceMembers.spaceId);
  return Object.fromEntries(rows.map((r) => [r.spaceId, r.count]));
}

// ============================================================
// API Keys
// ============================================================

export async function getApiKeys(spaceId: string) {
  return db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      permissions: apiKeys.permissions,
      lastUsedAt: apiKeys.lastUsedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.spaceId, spaceId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function getWebhooks(spaceId: string) {
  return db
    .select({
      id: webhooks.id,
      url: webhooks.url,
      events: webhooks.events,
      active: webhooks.active,
      lastDeliveryAt: webhooks.lastDeliveryAt,
      lastDeliveryStatus: webhooks.lastDeliveryStatus,
      createdAt: webhooks.createdAt,
    })
    .from(webhooks)
    .where(eq(webhooks.spaceId, spaceId))
    .orderBy(desc(webhooks.createdAt));
}

// ============================================================
// Audit Log
// ============================================================

export async function getAuditLog(spaceId: string) {
  return db
    .select({
      id: auditLog.id,
      entityType: auditLog.entityType,
      entityTitle: auditLog.entityTitle,
      entityMeta: auditLog.entityMeta,
      deletedByName: auditLog.deletedByName,
      deletedAt: auditLog.deletedAt,
    })
    .from(auditLog)
    .where(eq(auditLog.spaceId, spaceId))
    .orderBy(desc(auditLog.deletedAt))
    .limit(50);
}

// ============================================================
// Invitations
// ============================================================

export async function getInvitationByToken(token: string) {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  return invitation ?? null;
}

export async function getPendingInvitationsForEmail(email: string) {
  return db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email.toLowerCase().trim()),
        eq(invitations.status, "pending")
      )
    );
}

export async function getPendingInvitationsForSpace(spaceId: string) {
  return db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.spaceId, spaceId),
        eq(invitations.status, "pending")
      )
    );
}

// ============================================================
// Notifications
// ============================================================

export type NewNotification = {
  userId: string;
  spaceId: string;
  type: "meeting_started" | "review_due";
  title: string;
  body?: string | null;
  link?: string | null;
  referenceId?: string | null;
};

export async function createNotifications(rows: NewNotification[]) {
  if (rows.length === 0) return;
  await db.insert(notifications).values(rows);
}

/** User ids in a space who already have a notification of `type` since `since` (dedupe). */
export async function getRecentNotificationUserIds(
  spaceId: string,
  type: "meeting_started" | "review_due",
  since: Date
): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: notifications.userId })
    .from(notifications)
    .where(
      and(
        eq(notifications.spaceId, spaceId),
        eq(notifications.type, type),
        sql`${notifications.createdAt} > ${since}`
      )
    );
  return rows.map((r) => r.userId);
}

export async function getNotifications(
  userId: string,
  spaceId: string,
  limit = 20
) {
  return db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.spaceId, spaceId)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: string, spaceId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.spaceId, spaceId),
        eq(notifications.read, false)
      )
    );
  return row?.value ?? 0;
}

export async function markNotificationRead(id: string, userId: string) {
  // Scope to the recipient so a user can only mark their own notifications.
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: string, spaceId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.spaceId, spaceId),
        eq(notifications.read, false)
      )
    );
}

/**
 * Recipients for a "meeting started" notification: the meeting's invited
 * attendees, or — if none were set — all space members. The starter is excluded.
 * Returns the meeting title alongside the recipient user ids.
 */
export async function getMeetingStartRecipients(
  meetingId: string,
  spaceId: string,
  excludeUserId: string
): Promise<{ title: string; userIds: string[] } | null> {
  const [meeting] = await db
    .select({ title: meetings.title })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, spaceId)))
    .limit(1);
  if (!meeting) return null;

  const attendeeRows = await db
    .select({ userId: meetingAttendees.userId })
    .from(meetingAttendees)
    .where(eq(meetingAttendees.meetingId, meetingId));

  let userIds = attendeeRows.map((r) => r.userId);

  // Fall back to all space members when no explicit attendees were invited.
  if (userIds.length === 0) {
    const memberRows = await db
      .select({ userId: spaceMembers.userId })
      .from(spaceMembers)
      .where(eq(spaceMembers.spaceId, spaceId));
    userIds = memberRows.map((r) => r.userId);
  }

  userIds = userIds.filter((id) => id !== excludeUserId);
  return { title: meeting.title, userIds };
}

// ============================================================
// Provenance (reverse lookups for the decision detail page)
// ============================================================

/** The proposal that was decided as this decision (with its comment count). */
export async function getProposalByDecision(decisionId: string) {
  const [p] = await db
    .select({ id: proposals.id, title: proposals.title, status: proposals.status })
    .from(proposals)
    .where(eq(proposals.decidedAsDecisionId, decisionId))
    .limit(1);
  if (!p) return null;
  const [c] = await db
    .select({ value: count() })
    .from(proposalComments)
    .where(eq(proposalComments.proposalId, p.id));
  return { ...p, commentCount: c?.value ?? 0 };
}

/** The topic a proposal was promoted from (completes topic→proposal→decision). */
export async function getTopicByProposal(proposalId: string) {
  const [t] = await db
    .select({ id: topics.id, title: topics.title, type: topics.type })
    .from(topics)
    .where(eq(topics.promotedToProposalId, proposalId))
    .limit(1);
  return t || null;
}

/** Documents (and the sections within them) this decision changed. */
export async function getDocumentsByDecision(decisionId: string) {
  const rows = await db
    .select({
      documentId: documents.id,
      title: documents.title,
      sectionId: documentSectionLinks.sectionId,
    })
    .from(documentSectionLinks)
    .innerJoin(documents, eq(documents.id, documentSectionLinks.documentId))
    .where(eq(documentSectionLinks.decisionId, decisionId));

  const byDoc = new Map<string, { documentId: string; title: string; sections: string[] }>();
  for (const r of rows) {
    const entry = byDoc.get(r.documentId) ?? {
      documentId: r.documentId,
      title: r.title,
      sections: [],
    };
    entry.sections.push(r.sectionId);
    byDoc.set(r.documentId, entry);
  }
  return [...byDoc.values()];
}

/** Active AI insights related to this decision (excludes review prompts, shown separately). */
export async function getInsightsByDecision(decisionId: string) {
  return db
    .select({
      id: insights.id,
      type: insights.type,
      title: insights.title,
      content: insights.content,
    })
    .from(insights)
    .where(
      and(
        eq(insights.relatedDecisionId, decisionId),
        eq(insights.status, "active"),
        inArray(insights.type, ["pattern", "suggestion", "briefing"])
      )
    )
    .orderBy(desc(insights.createdAt));
}

/** The persisted per-response deliberation record for a decision (audit trail). */
export async function getDecisionResponses(decisionId: string) {
  return db
    .select()
    .from(decisionResponses)
    .where(eq(decisionResponses.decisionId, decisionId))
    .orderBy(asc(decisionResponses.respondedAt));
}

/**
 * Decisions whose review date has passed and that haven't been reviewed,
 * learned from, or retired — the overdue-review queue.
 */
export async function getReviewsDue(spaceId: string) {
  const now = new Date();
  return db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      reviewDate: decisions.reviewDate,
      status: decisions.status,
    })
    .from(decisions)
    .where(
      and(
        eq(decisions.spaceId, spaceId),
        lt(decisions.reviewDate, now),
        isNull(decisions.retiredAt),
        notInArray(decisions.status, ["reviewed", "learned"])
      )
    )
    .orderBy(asc(decisions.reviewDate));
}

/** Review history for a decision (most recent first). */
export async function getDecisionReviews(decisionId: string) {
  return db
    .select({
      id: decisionReviews.id,
      outcome: decisionReviews.outcome,
      note: decisionReviews.note,
      reviewedAt: decisionReviews.reviewedAt,
      reviewerName: users.name,
    })
    .from(decisionReviews)
    .leftJoin(users, eq(users.id, decisionReviews.reviewedBy))
    .where(eq(decisionReviews.decisionId, decisionId))
    .orderBy(desc(decisionReviews.reviewedAt));
}

// ============================================================
// Global search (command palette)
// ============================================================

export type SearchResult = {
  type: "decision" | "meeting" | "proposal" | "topic" | "document" | "action";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/**
 * Cross-entity, space-scoped search for the command palette. Case-insensitive
 * substring match on the primary text of each entity; capped per type.
 */
export async function searchSpace(spaceId: string, query: string): Promise<SearchResult[]> {
  const term = `%${query.trim()}%`;
  const LIMIT = 5;

  const [decisionRows, meetingRows, proposalRows, topicRows, documentRows, actionRows] =
    await Promise.all([
      db
        .select({ id: decisions.id, number: decisions.number, title: decisions.title })
        .from(decisions)
        .where(and(eq(decisions.spaceId, spaceId), or(ilike(decisions.title, term), ilike(decisions.outcome, term))))
        .orderBy(desc(decisions.date))
        .limit(LIMIT),
      db
        .select({ id: meetings.id, title: meetings.title })
        .from(meetings)
        .where(and(eq(meetings.spaceId, spaceId), ilike(meetings.title, term)))
        .orderBy(desc(meetings.date))
        .limit(LIMIT),
      db
        .select({ id: proposals.id, title: proposals.title })
        .from(proposals)
        .where(and(eq(proposals.spaceId, spaceId), ilike(proposals.title, term)))
        .orderBy(desc(proposals.updatedAt))
        .limit(LIMIT),
      db
        .select({ id: topics.id, title: topics.title, promotedToProposalId: topics.promotedToProposalId })
        .from(topics)
        .where(and(eq(topics.spaceId, spaceId), ilike(topics.title, term)))
        .orderBy(desc(topics.createdAt))
        .limit(LIMIT),
      db
        .select({ id: documents.id, title: documents.title })
        .from(documents)
        .where(and(eq(documents.spaceId, spaceId), ilike(documents.title, term)))
        .orderBy(desc(documents.updatedAt))
        .limit(LIMIT),
      db
        .select({
          id: actions.id,
          description: actions.description,
          decisionNumber: decisions.number,
        })
        .from(actions)
        .leftJoin(decisions, eq(decisions.id, actions.decisionId))
        .where(and(eq(actions.spaceId, spaceId), ilike(actions.description, term)))
        .orderBy(desc(actions.createdAt))
        .limit(LIMIT),
    ]);

  return [
    ...decisionRows.map((d) => ({
      type: "decision" as const,
      id: d.id,
      title: d.title,
      subtitle: `Decision #${d.number}`,
      href: `/decisions/${d.number}`,
    })),
    ...proposalRows.map((p) => ({
      type: "proposal" as const,
      id: p.id,
      title: p.title,
      subtitle: "Proposal",
      href: `/proposals/${p.id}`,
    })),
    ...meetingRows.map((m) => ({
      type: "meeting" as const,
      id: m.id,
      title: m.title,
      subtitle: "Meeting",
      href: `/meetings/${m.id}`,
    })),
    ...topicRows.map((t) => ({
      type: "topic" as const,
      id: t.id,
      title: t.title,
      subtitle: t.promotedToProposalId ? "Topic · promoted" : "Topic",
      href: t.promotedToProposalId ? `/proposals/${t.promotedToProposalId}` : `/topics/${t.id}`,
    })),
    ...documentRows.map((doc) => ({
      type: "document" as const,
      id: doc.id,
      title: doc.title,
      subtitle: "Document",
      href: `/documents/${doc.id}`,
    })),
    ...actionRows.map((a) => ({
      type: "action" as const,
      id: a.id,
      title: a.description,
      subtitle: "Action",
      href: a.decisionNumber != null ? `/decisions/${a.decisionNumber}` : "/actions",
    })),
  ];
}

// ============================================================
// Public detail (permalinks) — Tranche 4b
// ============================================================

/**
 * A single public decision by its number. Enforces the per-item isPublic flag
 * (caller enforces the space's publicDecisionLog toggle). Linked decisions are
 * re-filtered to public so a hidden decision can't leak via a relationship.
 */
export async function getPublicDecisionByNumber(spaceId: string, number: number) {
  const [d] = await db
    .select()
    .from(decisions)
    .where(
      and(
        eq(decisions.spaceId, spaceId),
        eq(decisions.number, number),
        eq(decisions.isPublic, true)
      )
    )
    .limit(1);
  if (!d) return null;

  const [tagRows, forward, reverse, meetingRow] = await Promise.all([
    db
      .select({ name: tags.name })
      .from(decisionTags)
      .innerJoin(tags, eq(tags.id, decisionTags.tagId))
      .where(eq(decisionTags.decisionId, d.id)),
    db
      .select({ id: decisions.id, number: decisions.number, title: decisions.title, isPublic: decisions.isPublic, relation: decisionLinks.linkType })
      .from(decisionLinks)
      .innerJoin(decisions, eq(decisions.id, decisionLinks.toDecisionId))
      .where(eq(decisionLinks.fromDecisionId, d.id)),
    db
      .select({ id: decisions.id, number: decisions.number, title: decisions.title, isPublic: decisions.isPublic, relation: decisionLinks.linkType })
      .from(decisionLinks)
      .innerJoin(decisions, eq(decisions.id, decisionLinks.fromDecisionId))
      .where(eq(decisionLinks.toDecisionId, d.id)),
    db
      .select({ title: meetings.title, isPublic: meetings.isPublic })
      .from(meetingDecisions)
      .innerJoin(meetings, eq(meetings.id, meetingDecisions.meetingId))
      .where(eq(meetingDecisions.decisionId, d.id))
      .limit(1),
  ]);

  const linkedDecisions = [...forward, ...reverse]
    .filter((l) => l.isPublic)
    .map((l) => ({ number: l.number, title: l.title, relation: l.relation }));

  return {
    ...d,
    tags: tagRows.map((t) => t.name),
    linkedDecisions,
    meetingTitle: meetingRow[0]?.isPublic ? meetingRow[0].title : null,
  };
}

/**
 * A single published, public document for the reader page. Caller enforces the
 * space's publicDocuments toggle.
 */
export async function getPublicDocumentById(spaceId: string, documentId: string) {
  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      type: documents.type,
      content: documents.content,
      currentVersion: documents.currentVersion,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.spaceId, spaceId),
        eq(documents.id, documentId),
        eq(documents.status, "published"),
        eq(documents.isPublic, true)
      )
    )
    .limit(1);
  return doc || null;
}

// ============================================================
// Sitemap / feeds (public discoverability) — Tranche 4b
// ============================================================

/** All spaces with their public-visibility settings, for the dynamic sitemap. */
export async function getPublicSpacesForSitemap() {
  return db
    .select({ slug: spaces.slug, settings: spaces.settings })
    .from(spaces);
}

/** Public decisions (in spaces with publicDecisionLog on) for sitemap permalinks. */
export async function getPublicDecisionsForSitemap(limit = 1000) {
  return db
    .select({ slug: spaces.slug, number: decisions.number, date: decisions.date })
    .from(decisions)
    .innerJoin(spaces, eq(spaces.id, decisions.spaceId))
    .where(
      and(
        eq(decisions.isPublic, true),
        sql`(${spaces.settings}->>'publicDecisionLog') = 'true'`
      )
    )
    .orderBy(desc(decisions.date))
    .limit(limit);
}
