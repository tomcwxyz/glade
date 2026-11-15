import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { updateMeetingSessionState } from "@/lib/queries";
import type { MeetingSessionState } from "@/lib/meeting-state";

/*
 * Server-only helpers for reading and writing live meeting state.
 *
 * Deliberately NOT a "use server" module: everything exported from one of
 * those becomes a client-callable server action, and these helpers do no
 * authorisation of their own. Callers (meeting-live-actions, guest-actions)
 * check who is acting before using them.
 */

export async function getMeetingState(meetingId: string, spaceId: string) {
  const [m] = await db
    .select({
      id: meetings.id,
      sessionState: meetings.sessionState,
      createdBy: meetings.createdBy,
      facilitatorId: meetings.facilitatorId,
    })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, spaceId)))
    .limit(1);

  return m || null;
}

/**
 * Apply a pure state transition under optimistic locking. The mutator MUST bump
 * `version` by 1. We write only if the DB version still matches the version we
 * based the change on; on conflict we re-read the latest state and re-apply, so
 * concurrent votes / speaker-stack entries are never silently lost.
 */
export async function applyStateChange(
  meetingId: string,
  spaceId: string,
  baseState: MeetingSessionState,
  mutate: (s: MeetingSessionState) => MeetingSessionState
): Promise<MeetingSessionState> {
  let current = baseState;
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = mutate(current);
    const ok = await updateMeetingSessionState(meetingId, next, current.version);
    if (ok) return next;

    const fresh = await getMeetingState(meetingId, spaceId);
    if (!fresh?.sessionState) throw new Error("Meeting state not found");
    current = fresh.sessionState as MeetingSessionState;
  }
  throw new Error("Could not save meeting state — too many concurrent updates");
}

