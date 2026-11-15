"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { meetingGuests, meetings } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { limitPoll } from "@/lib/rate-limit";
import { applyStateChange } from "@/lib/meeting-state-store";
import { resolveGuestToken } from "@/lib/queries";
import type { MeetingSessionState } from "@/lib/meeting-state";
import { guestMayRespond, guestParticipantId, newGuestToken } from "@/lib/guests";

/*
 * Guests act through their secret token, not a session. Every action checks
 * the token (hashed lookup, not revoked), that the meeting is live, and what
 * a guest of that kind may do. Facilitator controls are never available here.
 */

type GuestContext = {
  guest: { id: string; name: string; label: string | null; canVote: boolean };
  meetingId: string;
  spaceId: string;
  state: MeetingSessionState;
  participantId: string;
};

const INVALID = { error: "This guest link isn't valid any more" };

async function withGuest<T>(
  token: string,
  fn: (ctx: GuestContext) => Promise<T>
): Promise<T | { error: string }> {
  try {
    const row = await resolveGuestToken(token);
    if (!row) return INVALID;
    const rl = await limitPoll(`guest-action:${row.id}`);
    if (!rl.success) return { error: "Too many requests. Please slow down." };
    if (row.status !== "in_progress" || !row.sessionState) return { error: "The meeting isn't live right now" };
    return await fn({
      guest: { id: row.id, name: row.name, label: row.label, canVote: row.canVote },
      meetingId: row.meetingId,
      spaceId: row.spaceId,
      state: row.sessionState as MeetingSessionState,
      participantId: guestParticipantId(row.id),
    });
  } catch {
    return { error: "Meeting action failed" };
  }
}

function displayName(guest: GuestContext["guest"]) {
  return guest.label ? `${guest.name} (${guest.label})` : guest.name;
}

export async function guestSubmitResponse(token: string, value: string, comment?: string) {
  return withGuest(token, async ({ guest, meetingId, spaceId, state, participantId }) => {
    const flow = state.decisionFlow;
    if (!flow) return { error: "No decision flow active" };
    if (!guestMayRespond(flow.stage, guest.canVote)) {
      return { error: "As a guest adviser you can ask, react and advise, but not object or vote" };
    }
    const cleanValue = String(value ?? "").slice(0, 100);
    const cleanComment = comment ? String(comment).slice(0, 2000) : undefined;
    if (!cleanValue) return { error: "Empty response" };

    const newState = await applyStateChange(meetingId, spaceId, state, (s) => {
      if (!s.decisionFlow || !guestMayRespond(s.decisionFlow.stage, guest.canVote)) return s;
      const stage = s.decisionFlow.stage;
      const others = s.decisionFlow.responses.filter(
        (r) => !(r.participantId === participantId && (r.stage ?? null) === stage)
      );
      return {
        ...s,
        decisionFlow: {
          ...s.decisionFlow,
          responses: [
            ...others,
            {
              participantId,
              name: displayName(guest),
              value: cleanValue,
              comment: cleanComment,
              stage,
              respondedAt: new Date().toISOString(),
            },
          ],
        },
        version: s.version + 1,
        updatedAt: new Date().toISOString(),
      };
    });
    return { state: newState };
  });
}

export async function guestWithdrawResponse(token: string) {
  return withGuest(token, async ({ meetingId, spaceId, state, participantId }) => {
    if (!state.decisionFlow) return { error: "No decision flow active" };
    const newState = await applyStateChange(meetingId, spaceId, state, (s) =>
      !s.decisionFlow
        ? s
        : {
            ...s,
            decisionFlow: {
              ...s.decisionFlow,
              responses: s.decisionFlow.responses.filter(
                (r) => !(r.participantId === participantId && (r.stage ?? null) === s.decisionFlow!.stage)
              ),
            },
            version: s.version + 1,
            updatedAt: new Date().toISOString(),
          }
    );
    return { state: newState };
  });
}

export async function guestRequestToSpeak(token: string) {
  return withGuest(token, async ({ guest, meetingId, spaceId, state, participantId }) => {
    if (state.speakerStack.some((e) => e.participantId === participantId)) return { state };
    const newState = await applyStateChange(meetingId, spaceId, state, (s) =>
      s.speakerStack.some((e) => e.participantId === participantId)
        ? s
        : {
            ...s,
            speakerStack: [
              ...s.speakerStack,
              { participantId, name: displayName(guest), requestedAt: new Date().toISOString(), status: "waiting" as const },
            ],
            version: s.version + 1,
            updatedAt: new Date().toISOString(),
          }
    );
    return { state: newState };
  });
}

export async function guestWithdrawSpeaker(token: string) {
  return withGuest(token, async ({ meetingId, spaceId, state, participantId }) => {
    const newState = await applyStateChange(meetingId, spaceId, state, (s) => ({
      ...s,
      speakerStack: s.speakerStack.filter((e) => e.participantId !== participantId),
      version: s.version + 1,
      updatedAt: new Date().toISOString(),
    }));
    return { state: newState };
  });
}

/** Add the guest to the session's participant list the first time they join. */
export async function guestJoin(token: string) {
  return withGuest(token, async ({ guest, meetingId, spaceId, state, participantId }) => {
    if (state.participants[participantId]) return { state };
    const newState = await applyStateChange(meetingId, spaceId, state, (s) =>
      s.participants[participantId]
        ? s
        : {
            ...s,
            participants: {
              ...s.participants,
              [participantId]: { name: displayName(guest), lastSeenAt: new Date().toISOString(), role: "participant" as const },
            },
            version: s.version + 1,
            updatedAt: new Date().toISOString(),
          }
    );
    return { state: newState };
  });
}

// ------------------------------------------------------------------
// Managing guests (facilitator or admin)
// ------------------------------------------------------------------

async function requireMeetingManager(meetingId: string) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const [m] = await db
    .select({ id: meetings.id, facilitatorId: meetings.facilitatorId, createdBy: meetings.createdBy })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, auth.space.id)))
    .limit(1);
  if (!m) return { error: "Meeting not found" };
  const isChair = (m.facilitatorId ?? m.createdBy) === auth.user.id;
  if (auth.role !== "admin" && !isChair) return { error: "Only the facilitator or an admin can manage guests" };
  return auth;
}

/**
 * Invite a named guest. Returns the secret token once; only its hash is
 * stored, so a lost link means revoking and inviting again.
 */
export async function inviteMeetingGuest(meetingId: string, name: string, label: string, canVote: boolean) {
  const auth = await requireMeetingManager(meetingId);
  if ("error" in auth) return auth;
  const cleanName = name?.trim().slice(0, 255);
  if (!cleanName) return { error: "Give the guest's name" };

  const { token, hash } = newGuestToken();
  await db.insert(meetingGuests).values({
    meetingId,
    name: cleanName,
    label: label?.trim().slice(0, 100) || null,
    canVote: !!canVote,
    tokenHash: hash,
    createdBy: auth.user.id,
  });
  revalidatePath(`/meetings/${meetingId}`);
  return { token };
}

export async function revokeMeetingGuest(meetingId: string, guestId: string) {
  const auth = await requireMeetingManager(meetingId);
  if ("error" in auth) return auth;
  await db
    .update(meetingGuests)
    .set({ revokedAt: new Date() })
    .where(and(eq(meetingGuests.id, guestId), eq(meetingGuests.meetingId, meetingId)));
  revalidatePath(`/meetings/${meetingId}`);
  return { success: true };
}
