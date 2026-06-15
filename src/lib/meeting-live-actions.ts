"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  meetings,
  meetingDecisions,
  meetingActions,
  actions,
  meetingAgendaItems,
  proposals,
  decisionResponses,
} from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";
import { insertDecisionWithUniqueNumber, updateMeetingSessionState } from "@/lib/queries";
import type { MeetingSessionState, Deliberation } from "@/lib/meeting-state";
import { advanceItem, skipItem, goToItem, startDecisionFlow } from "@/lib/meeting-state";

async function getMeetingState(meetingId: string, spaceId: string) {
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
async function applyStateChange(
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

/**
 * Snapshot the live deliberation (tallies, objections + resolutions, clarifying
 * questions, speaker notes) so it survives onto the recorded decision. Returns
 * undefined when there's no active flow (e.g. a quick manual record).
 */
function buildDeliberation(state: MeetingSessionState): Deliberation | undefined {
  const flow = state.decisionFlow;
  if (!flow) return undefined;

  const counts = new Map<string, number>();
  for (const r of flow.responses) {
    if (r.stage === "clarify") continue; // questions, not votes
    counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
  }

  return {
    method: flow.method,
    tallies: [...counts].map(([value, count]) => ({ value, count })),
    objections: flow.responses
      .filter((r) => r.value === "objection")
      .map((o) => ({
        name: o.name,
        comment: o.comment,
        resolution: o.resolution,
        resolutionNote: o.resolutionNote,
      })),
    clarifyingQuestions: flow.responses
      .filter((r) => r.stage === "clarify" && (r.comment || r.value))
      .map((r) => ({ name: r.name, question: r.comment || r.value })),
    speakers: state.speakerStack
      .filter((s) => s.note)
      .map((s) => ({ name: s.name, note: s.note })),
  };
}

async function getAgendaCount(meetingId: string) {
  const items = await db
    .select({ id: meetingAgendaItems.id })
    .from(meetingAgendaItems)
    .where(eq(meetingAgendaItems.meetingId, meetingId));
  return items.length;
}

type User = { id: string; name?: string | null; email?: string | null };
type Space = { id: string; name: string; slug: string; description: string | null; settings: unknown };
type MeetingRow = { id: string; sessionState: unknown; createdBy: string | null; facilitatorId: string | null };

async function withMeetingState<T>(
  meetingId: string,
  fn: (ctx: { state: MeetingSessionState; meeting: MeetingRow; user: User; space: Space }) => Promise<T> | T
): Promise<T | { error: string }> {
  try {
    const user = await requireUser();
    const space = await getCurrentSpace();
    if (!space) return { error: "No space" };
    const m = await getMeetingState(meetingId, space.id);
    if (!m?.sessionState) return { error: "No session state" };
    const state = m.sessionState as MeetingSessionState;
    return await fn({ state, meeting: m as MeetingRow, user, space });
  } catch {
    return { error: "Meeting action failed" };
  }
}

/**
 * Like withMeetingState, but additionally requires the caller to be the
 * meeting's facilitator (authoritative `meetings.facilitatorId`, falling back
 * to `createdBy` for legacy rows). Use for control actions — advancing the
 * agenda, timers, decision flows, recording outcomes, ending the meeting.
 */
async function withFacilitatorState<T>(
  meetingId: string,
  fn: (ctx: { state: MeetingSessionState; meeting: MeetingRow; user: User; space: Space }) => Promise<T> | T
): Promise<T | { error: string }> {
  return withMeetingState(meetingId, async (ctx) => {
    const authoritative = ctx.meeting.facilitatorId ?? ctx.meeting.createdBy;
    if (authoritative && ctx.user.id !== authoritative) {
      return { error: "Only the facilitator can do this" } as { error: string };
    }
    return fn(ctx);
  });
}

export async function advanceAgendaItem(meetingId: string, outcome?: string, decisionId?: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const totalItems = await getAgendaCount(meetingId);
    const newState = await applyStateChange(meetingId, space.id, state, (s) =>
      advanceItem(s, totalItems, outcome, decisionId)
    );
    return { state: newState };
  });
}

export async function skipAgendaItem(meetingId: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const totalItems = await getAgendaCount(meetingId);
    const newState = await applyStateChange(meetingId, space.id, state, (s) =>
      skipItem(s, totalItems)
    );
    return { state: newState };
  });
}

export async function goToAgendaItem(meetingId: string, index: number) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const newState = await applyStateChange(meetingId, space.id, state, (s) =>
      goToItem(s, index)
    );
    return { state: newState };
  });
}

export async function startTimer(meetingId: string, durationMinutes: number) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const newState = await applyStateChange(meetingId, space.id, state, (s) => ({
      ...s,
      timer: {
        startedAt: new Date().toISOString(),
        durationMinutes,
        paused: false,
        pausedAt: null,
        elapsed: 0,
      },
      version: s.version + 1,
      updatedAt: new Date().toISOString(),
    }));
    return { state: newState };
  });
}

export async function pauseTimer(meetingId: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const newState = await applyStateChange(meetingId, space.id, state, (s) => {
      const now = new Date();
      const startedAt = s.timer.startedAt ? new Date(s.timer.startedAt) : now;
      const elapsed = s.timer.elapsed + (now.getTime() - startedAt.getTime()) / 1000;
      return {
        ...s,
        timer: {
          ...s.timer,
          paused: true,
          pausedAt: now.toISOString(),
          elapsed,
          startedAt: null,
        },
        version: s.version + 1,
        updatedAt: now.toISOString(),
      };
    });
    return { state: newState };
  });
}

export async function resetTimer(meetingId: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const newState = await applyStateChange(meetingId, space.id, state, (s) => ({
      ...s,
      timer: {
        startedAt: null,
        durationMinutes: s.timer.durationMinutes,
        paused: false,
        pausedAt: null,
        elapsed: 0,
      },
      version: s.version + 1,
      updatedAt: new Date().toISOString(),
    }));
    return { state: newState };
  });
}

export async function beginDecisionFlow(meetingId: string, method: string, proposalText?: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const newState = await applyStateChange(meetingId, space.id, state, (s) =>
      startDecisionFlow(s, method, proposalText)
    );
    return { state: newState };
  });
}

export async function advanceDecisionStage(meetingId: string, nextStage: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    if (!state.decisionFlow) return { error: "No decision flow active" };

    const newState = await applyStateChange(meetingId, space.id, state, (s) =>
      s.decisionFlow
        ? {
            ...s,
            decisionFlow: { ...s.decisionFlow, stage: nextStage },
            version: s.version + 1,
            updatedAt: new Date().toISOString(),
          }
        : s
    );
    return { state: newState };
  });
}

export async function submitResponse(
  meetingId: string,
  value: string,
  comment?: string
) {
  return withMeetingState(meetingId, async ({ state, space, user }) => {
    if (!state.decisionFlow) return { error: "No decision flow active" };

    const newState = await applyStateChange(meetingId, space.id, state, (s) => {
      if (!s.decisionFlow) return s;
      const stage = s.decisionFlow.stage;
      // Dedupe: a participant has one response per stage — replace any prior one.
      const others = s.decisionFlow.responses.filter(
        (r) => !(r.participantId === user.id && (r.stage ?? null) === stage)
      );
      return {
        ...s,
        decisionFlow: {
          ...s.decisionFlow,
          responses: [
            ...others,
            {
              participantId: user.id,
              name: user.name || "Unknown",
              value,
              comment,
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

/**
 * Remove the caller's own response in the current decision-flow stage, letting a
 * participant withdraw a reaction / objection / vote (not just replace it).
 */
export async function withdrawResponse(meetingId: string) {
  return withMeetingState(meetingId, async ({ state, space, user }) => {
    if (!state.decisionFlow) return { error: "No decision flow active" };

    const newState = await applyStateChange(meetingId, space.id, state, (s) => {
      if (!s.decisionFlow) return s;
      const stage = s.decisionFlow.stage;
      return {
        ...s,
        decisionFlow: {
          ...s.decisionFlow,
          responses: s.decisionFlow.responses.filter(
            (r) => !(r.participantId === user.id && (r.stage ?? null) === stage)
          ),
        },
        version: s.version + 1,
        updatedAt: new Date().toISOString(),
      };
    });
    return { state: newState };
  });
}

/**
 * Record how an objection was resolved (consent integrate stage). The facilitator
 * may set any resolution; an objector may withdraw their own objection (which
 * preserves the record as "withdrawn" rather than deleting it).
 */
export async function resolveObjection(
  meetingId: string,
  participantId: string,
  resolution: "addressed" | "integrated" | "withdrawn" | "stands",
  note?: string
) {
  return withMeetingState(meetingId, async ({ state, space, user, meeting }) => {
    if (!state.decisionFlow) return { error: "No decision flow active" };

    const isSelfWithdraw = participantId === user.id && resolution === "withdrawn";
    if (!isSelfWithdraw) {
      const authoritative = meeting.facilitatorId ?? meeting.createdBy;
      if (authoritative && user.id !== authoritative) {
        return { error: "Only the facilitator can resolve objections" };
      }
    }

    const newState = await applyStateChange(meetingId, space.id, state, (s) => {
      if (!s.decisionFlow) return s;
      return {
        ...s,
        decisionFlow: {
          ...s.decisionFlow,
          responses: s.decisionFlow.responses.map((r) =>
            r.participantId === participantId &&
            r.stage === "object" &&
            r.value === "objection"
              ? { ...r, resolution, resolutionNote: note?.trim() || r.resolutionNote }
              : r
          ),
        },
        version: s.version + 1,
        updatedAt: new Date().toISOString(),
      };
    });
    return { state: newState };
  });
}

export async function requestToSpeak(meetingId: string) {
  return withMeetingState(meetingId, async ({ state, space, user }) => {
    if (state.speakerStack.some((s) => s.participantId === user.id)) {
      return { state };
    }

    const newState = await applyStateChange(meetingId, space.id, state, (s) =>
      s.speakerStack.some((e) => e.participantId === user.id)
        ? s
        : {
            ...s,
            speakerStack: [
              ...s.speakerStack,
              {
                participantId: user.id,
                name: user.name || "Unknown",
                requestedAt: new Date().toISOString(),
                status: "waiting" as const,
              },
            ],
            version: s.version + 1,
            updatedAt: new Date().toISOString(),
          }
    );
    return { state: newState };
  });
}

export async function withdrawSpeaker(meetingId: string, participantId?: string) {
  return withMeetingState(meetingId, async ({ state, space, user, meeting }) => {
    const targetId = participantId || user.id;

    // Anyone may withdraw themselves; removing someone else is facilitator-only.
    if (targetId !== user.id) {
      const authoritative = meeting.facilitatorId ?? meeting.createdBy;
      if (authoritative && user.id !== authoritative) {
        return { error: "Only the facilitator can remove others from the stack" };
      }
    }

    const newState = await applyStateChange(meetingId, space.id, state, (s) => ({
      ...s,
      speakerStack: s.speakerStack.filter((e) => e.participantId !== targetId),
      version: s.version + 1,
      updatedAt: new Date().toISOString(),
    }));
    return { state: newState };
  });
}

/**
 * Facilitator calls a queued speaker to the floor. Only one speaker is "speaking"
 * at a time — any current speaker is marked "spoke" first.
 */
export async function callSpeaker(meetingId: string, participantId: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const now = new Date().toISOString();
    const newState = await applyStateChange(meetingId, space.id, state, (s) => ({
      ...s,
      speakerStack: s.speakerStack.map((e) => {
        if (e.participantId === participantId) {
          return { ...e, status: "speaking" as const, calledAt: now };
        }
        // Demote whoever was speaking — single active speaker.
        if ((e.status ?? "waiting") === "speaking") {
          return { ...e, status: "spoke" as const, finishedAt: now };
        }
        return e;
      }),
      version: s.version + 1,
      updatedAt: now,
    }));
    return { state: newState };
  });
}

/** Facilitator marks a speaker as finished (keeps them in the record). */
export async function markSpeakerDone(meetingId: string, participantId: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const now = new Date().toISOString();
    const newState = await applyStateChange(meetingId, space.id, state, (s) => ({
      ...s,
      speakerStack: s.speakerStack.map((e) =>
        e.participantId === participantId
          ? { ...e, status: "spoke" as const, finishedAt: now }
          : e
      ),
      version: s.version + 1,
      updatedAt: now,
    }));
    return { state: newState };
  });
}

/** Facilitator records a note / clarifying question against a speaker. */
export async function setSpeakerNote(
  meetingId: string,
  participantId: string,
  note: string
) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const newState = await applyStateChange(meetingId, space.id, state, (s) => ({
      ...s,
      speakerStack: s.speakerStack.map((e) =>
        e.participantId === participantId
          ? { ...e, note: note.trim() || undefined }
          : e
      ),
      version: s.version + 1,
      updatedAt: new Date().toISOString(),
    }));
    return { state: newState };
  });
}

export async function cancelDecisionFlow(meetingId: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    const newState = await applyStateChange(meetingId, space.id, state, (s) => ({
      ...s,
      phase: "agenda_item",
      decisionFlow: null,
      version: s.version + 1,
      updatedAt: new Date().toISOString(),
    }));
    return { state: newState };
  });
}

export async function recordMeetingDecision(
  meetingId: string,
  title: string,
  method: string,
  outcome?: string,
  proposalId?: string
) {
  return withFacilitatorState(meetingId, async ({ user, space, state }) => {
    const deliberation = buildDeliberation(state);

    const decision = await insertDecisionWithUniqueNumber(space.id, {
      title,
      method: method as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus",
      outcome,
      status: "decided",
      date: new Date(),
      createdBy: user.id,
      deliberation,
    });

    await db.insert(meetingDecisions).values({
      meetingId,
      decisionId: decision.id,
    });

    // Persist the per-response deliberation record (durable audit trail).
    const responses = state.decisionFlow?.responses ?? [];
    if (responses.length > 0) {
      await db.insert(decisionResponses).values(
        responses.map((r) => ({
          decisionId: decision.id,
          participantId: r.participantId,
          name: r.name,
          value: r.value,
          comment: r.comment,
          stage: r.stage,
          resolution: r.resolution,
          resolutionNote: r.resolutionNote,
          respondedAt: r.respondedAt ? new Date(r.respondedAt) : null,
        }))
      );
    }

    // If this decision came from a proposal, link and update the proposal
    if (proposalId) {
      await db
        .update(proposals)
        .set({
          decidedAsDecisionId: decision.id,
          status: "decided",
          updatedAt: new Date(),
        })
        .where(eq(proposals.id, proposalId));
      revalidatePath("/proposals");
    }

    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath("/decisions");
    return { decisionId: decision.id, number: decision.number };
  });
}

export async function recordMeetingAction(
  meetingId: string,
  decisionId: string,
  description: string,
  ownerName?: string,
  dueDate?: string
) {
  return withFacilitatorState(meetingId, async ({ space }) => {
    const [newAction] = await db
      .insert(actions)
      .values({
        spaceId: space.id,
        decisionId,
        description,
        ownerName: ownerName || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "open",
      })
      .returning({ id: actions.id });

    await db.insert(meetingActions).values({
      meetingId,
      actionId: newAction.id,
    });

    revalidatePath(`/meetings/${meetingId}`);
    revalidatePath("/actions");
    return { success: true };
  });
}

export async function endMeeting(meetingId: string) {
  return withFacilitatorState(meetingId, async ({ state, space }) => {
    // Lock the phase transition so a last-second vote isn't clobbered.
    await applyStateChange(meetingId, space.id, state, (s) => ({
      ...s,
      phase: "completed",
      version: s.version + 1,
      updatedAt: new Date().toISOString(),
    }));

    await db
      .update(meetings)
      .set({ status: "completed", updatedAt: new Date() })
      .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)));

    revalidatePath(`/meetings/${meetingId}`);
    return { success: true };
  });
}
