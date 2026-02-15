import { db } from "@/db";
import {
  decisions,
  decisionLinks,
  decisionTags,
  tags,
  actions,
  meetings,
  meetingAgendaItems,
  meetingAttendees,
  meetingDecisions,
  spaceMembers,
  users,
  documents,
  documentVersions,
  documentSectionLinks,
  proposals,
  proposalComments,
  topics,
} from "@/db/schema";
import { eq, and, desc, asc, count, sql } from "drizzle-orm";

// ============================================================
// Decisions
// ============================================================

export async function getDecisions(spaceId: string) {
  const rows = await db
    .select()
    .from(decisions)
    .where(eq(decisions.spaceId, spaceId))
    .orderBy(desc(decisions.date), desc(decisions.number));

  // Fetch tags and action counts for each decision
  const enriched = await Promise.all(
    rows.map(async (d) => {
      const tagRows = await db
        .select({ name: tags.name })
        .from(decisionTags)
        .innerJoin(tags, eq(tags.id, decisionTags.tagId))
        .where(eq(decisionTags.decisionId, d.id));

      const actionRows = await db
        .select({ status: actions.status })
        .from(actions)
        .where(eq(actions.decisionId, d.id));

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

      // Also get reverse links
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

      return {
        ...d,
        tags: tagRows.map((t) => t.name),
        actionsCount: actionRows.length,
        actionsComplete: actionRows.filter((a) => a.status === "complete").length,
        linkedDecisions: [...linkedRows, ...reverseLinkedRows],
      };
    })
  );

  return enriched;
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

export async function getActions(spaceId: string) {
  const rows = await db
    .select({
      id: actions.id,
      description: actions.description,
      ownerName: actions.ownerName,
      dueDate: actions.dueDate,
      status: actions.status,
      decisionNumber: decisions.number,
      decisionTitle: decisions.title,
    })
    .from(actions)
    .innerJoin(decisions, eq(decisions.id, actions.decisionId))
    .where(eq(actions.spaceId, spaceId));

  return rows;
}

// ============================================================
// Meetings
// ============================================================

export async function getMeetings(spaceId: string) {
  const rows = await db
    .select()
    .from(meetings)
    .where(eq(meetings.spaceId, spaceId))
    .orderBy(desc(meetings.date));

  const enriched = await Promise.all(
    rows.map(async (m) => {
      const attendeeRows = await db
        .select({ name: users.name })
        .from(meetingAttendees)
        .innerJoin(users, eq(users.id, meetingAttendees.userId))
        .where(eq(meetingAttendees.meetingId, m.id));

      const decisionCount = await db
        .select({ count: count() })
        .from(meetingDecisions)
        .where(eq(meetingDecisions.meetingId, m.id));

      return {
        ...m,
        attendees: attendeeRows.map((a) => a.name || "Unknown"),
        decisionsCount: decisionCount[0]?.count || 0,
      };
    })
  );

  return enriched;
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

  const decisionRows = await db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      status: decisions.status,
      method: decisions.method,
    })
    .from(meetingDecisions)
    .innerJoin(decisions, eq(decisions.id, meetingDecisions.decisionId))
    .where(eq(meetingDecisions.meetingId, m.id));

  return {
    ...m,
    attendees: attendeeRows,
    agendaItems: agendaRows,
    decisions: decisionRows,
  };
}

// ============================================================
// Stats
// ============================================================

export async function getSpaceStats(spaceId: string) {
  const allDecisions = await db
    .select({ id: decisions.id, reviewDate: decisions.reviewDate })
    .from(decisions)
    .where(eq(decisions.spaceId, spaceId));

  const allActions = await db
    .select({ status: actions.status })
    .from(actions)
    .where(eq(actions.spaceId, spaceId));

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const decisionsThisMonth = await db
    .select({ id: decisions.id })
    .from(decisions)
    .where(
      and(
        eq(decisions.spaceId, spaceId),
        sql`${decisions.date} >= ${monthStart}`
      )
    );

  const totalDecisions = allDecisions.length;
  const reviewedDecisions = allDecisions.filter((d) => d.reviewDate).length;
  const completedActions = allActions.filter((a) => a.status === "complete").length;
  const activeActions = allActions.filter((a) => a.status !== "complete").length;
  const upcomingReviews = allDecisions.filter(
    (d) => d.reviewDate && new Date(d.reviewDate) > now
  ).length;

  return {
    totalDecisions,
    reviewRate: totalDecisions > 0 ? reviewedDecisions / totalDecisions : 0,
    actionCompletionRate: allActions.length > 0 ? completedActions / allActions.length : 0,
    activeActions,
    decisionsThisMonth: decisionsThisMonth.length,
    upcomingReviews,
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
    })
    .from(meetings)
    .where(eq(meetings.spaceId, spaceId))
    .orderBy(desc(meetings.date));
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

export async function getDocuments(spaceId: string) {
  const rows = await db
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
    .orderBy(desc(documents.updatedAt));

  return rows;
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

// ============================================================
// Proposals
// ============================================================

export async function getProposals(spaceId: string) {
  const rows = await db
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
    .orderBy(desc(proposals.updatedAt));

  const enriched = await Promise.all(
    rows.map(async (p) => {
      const commentCount = await db
        .select({ count: count() })
        .from(proposalComments)
        .where(eq(proposalComments.proposalId, p.id));

      return {
        ...p,
        commentCount: commentCount[0]?.count || 0,
      };
    })
  );

  return enriched;
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

  return {
    ...p,
    createdByName: createdByUser[0]?.name || null,
    comments: commentRows,
  };
}

// ============================================================
// Topics
// ============================================================

export async function getTopics(spaceId: string) {
  return db
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
