"use server";

import { revalidatePath } from "next/cache";
import { and, eq, min, count } from "drizzle-orm";
import { db } from "@/db";
import { actions, decisions, documents, meetings, proposals, spaces, topics } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { decisionNotDeleted, actionDecisionNotDeleted } from "@/lib/soft-delete";

/**
 * Items default to isPublic = true, so switching on a public section publishes
 * everything already recorded in it. These actions let an admin see what is
 * about to go public first, and optionally keep the back catalogue private.
 */

export type PublicSectionKey =
  | "publicGlade"
  | "publicDecisionLog"
  | "publicActions"
  | "publicMeetings"
  | "publicDocuments"
  | "publicProposals"
  | "publicTopics";

const NOUNS: Record<PublicSectionKey, [string, string]> = {
  publicGlade: ["decision", "decisions"],
  publicDecisionLog: ["decision", "decisions"],
  publicActions: ["action", "actions"],
  publicMeetings: ["meeting record", "meeting records"],
  publicDocuments: ["published document", "published documents"],
  publicProposals: ["proposal", "proposals"],
  publicTopics: ["topic", "topics"],
};

function isSectionKey(key: string): key is PublicSectionKey {
  return key in NOUNS;
}

/** Count of items that would become publicly visible, and the oldest one's date. */
async function exposure(spaceId: string, key: PublicSectionKey): Promise<{ count: number; since: Date | null }> {
  const pick = async (q: Promise<{ count: number; since: Date | null }[]>) => (await q)[0] ?? { count: 0, since: null };
  switch (key) {
    case "publicGlade":
    case "publicDecisionLog":
      return pick(
        db.select({ count: count(), since: min(decisions.date) }).from(decisions)
          .where(and(eq(decisions.spaceId, spaceId), eq(decisions.isPublic, true), decisionNotDeleted))
      );
    case "publicActions":
      return pick(
        db.select({ count: count(), since: min(actions.createdAt) }).from(actions)
          .where(and(eq(actions.spaceId, spaceId), eq(actions.isPublic, true), actionDecisionNotDeleted))
      );
    case "publicMeetings":
      return pick(
        db.select({ count: count(), since: min(meetings.date) }).from(meetings)
          .where(and(eq(meetings.spaceId, spaceId), eq(meetings.isPublic, true)))
      );
    case "publicDocuments":
      return pick(
        db.select({ count: count(), since: min(documents.createdAt) }).from(documents)
          .where(and(eq(documents.spaceId, spaceId), eq(documents.isPublic, true), eq(documents.status, "published")))
      );
    case "publicProposals":
      return pick(
        db.select({ count: count(), since: min(proposals.createdAt) }).from(proposals)
          .where(and(eq(proposals.spaceId, spaceId), eq(proposals.isPublic, true)))
      );
    case "publicTopics":
      return pick(
        db.select({ count: count(), since: min(topics.createdAt) }).from(topics)
          .where(and(eq(topics.spaceId, spaceId), eq(topics.isPublic, true)))
      );
  }
}

export async function previewPublicSection(key: string) {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  if (!isSectionKey(key)) return { error: "Unknown section" };

  const { count: n, since } = await exposure(auth.space.id, key);
  const [one, many] = NOUNS[key];
  return { count: n, noun: n === 1 ? one : many, since: since ? since.toISOString() : null };
}

/**
 * Switch a public section on. With "hide_existing", everything already in the
 * section is marked hidden first, so only items recorded from now on are public
 * (each can still be made public individually).
 */
export async function enablePublicSection(key: string, mode: "publish_existing" | "hide_existing") {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  if (!isSectionKey(key)) return { error: "Unknown section" };
  const spaceId = auth.space.id;

  await db.transaction(async (tx) => {
    if (mode === "hide_existing") {
      switch (key) {
        case "publicGlade":
        case "publicDecisionLog":
          await tx.update(decisions).set({ isPublic: false }).where(eq(decisions.spaceId, spaceId));
          break;
        case "publicActions":
          await tx.update(actions).set({ isPublic: false }).where(eq(actions.spaceId, spaceId));
          break;
        case "publicMeetings":
          await tx.update(meetings).set({ isPublic: false }).where(eq(meetings.spaceId, spaceId));
          break;
        case "publicDocuments":
          await tx.update(documents).set({ isPublic: false }).where(eq(documents.spaceId, spaceId));
          break;
        case "publicProposals":
          await tx.update(proposals).set({ isPublic: false }).where(eq(proposals.spaceId, spaceId));
          break;
        case "publicTopics":
          await tx.update(topics).set({ isPublic: false }).where(eq(topics.spaceId, spaceId));
          break;
      }
    }

    // Re-read settings inside the tx so a concurrent toggle isn't overwritten.
    const [space] = await tx.select({ settings: spaces.settings }).from(spaces).where(eq(spaces.id, spaceId));
    const current = (space?.settings as Record<string, unknown>) || {};
    await tx.update(spaces).set({ settings: { ...current, [key]: true }, updatedAt: new Date() }).where(eq(spaces.id, spaceId));
  });

  revalidatePath("/settings");
  return { success: true };
}
