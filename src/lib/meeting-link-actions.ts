"use server";

import { db } from "@/db";
import {
  meetings,
  meetingDecisions,
  meetingActions,
  meetingDocuments,
  meetingProposals,
} from "@/db/schema";
import { getCurrentSpace } from "@/lib/space";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

type EntityType = "decision" | "action" | "document" | "proposal";

const entityConfig = {
  decision: {
    table: meetingDecisions,
    entityCol: meetingDecisions.decisionId,
    meetingCol: meetingDecisions.meetingId,
    revalidate: ["/decisions"],
  },
  action: {
    table: meetingActions,
    entityCol: meetingActions.actionId,
    meetingCol: meetingActions.meetingId,
    revalidate: ["/actions"],
  },
  document: {
    table: meetingDocuments,
    entityCol: meetingDocuments.documentId,
    meetingCol: meetingDocuments.meetingId,
    revalidate: ["/documents"],
  },
  proposal: {
    table: meetingProposals,
    entityCol: meetingProposals.proposalId,
    meetingCol: meetingProposals.meetingId,
    revalidate: ["/proposals"],
  },
} as const;

export async function linkToMeeting(
  meetingId: string,
  entityType: EntityType,
  entityId: string
) {
  const space = await getCurrentSpace();
  if (!space) return { error: "No space selected" };

  // Verify meeting belongs to space
  const [meeting] = await db
    .select({ id: meetings.id })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };

  const config = entityConfig[entityType];

  // Check if already linked
  const [existing] = await db
    .select({ meetingId: config.meetingCol })
    .from(config.table)
    .where(and(eq(config.entityCol, entityId), eq(config.meetingCol, meetingId)));
  if (existing) return { error: "Already linked" };

  // Insert link
  const values: Record<string, string> = { meetingId };
  if (entityType === "decision") values.decisionId = entityId;
  else if (entityType === "action") values.actionId = entityId;
  else if (entityType === "document") values.documentId = entityId;
  else if (entityType === "proposal") values.proposalId = entityId;

  await db.insert(config.table).values(values as never);

  revalidatePath(`/meetings/${meetingId}`);
  for (const path of config.revalidate) revalidatePath(path);
}

export async function unlinkFromMeeting(
  meetingId: string,
  entityType: EntityType,
  entityId: string
) {
  const config = entityConfig[entityType];

  await db
    .delete(config.table)
    .where(and(eq(config.entityCol, entityId), eq(config.meetingCol, meetingId)));

  revalidatePath(`/meetings/${meetingId}`);
  for (const path of config.revalidate) revalidatePath(path);
}
