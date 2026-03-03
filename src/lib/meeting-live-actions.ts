"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  meetings,
  decisions,
  meetingDecisions,
  meetingActions,
  actions,
  meetingAgendaItems,
  proposals,
} from "@/db/schema";
import { getCurrentSpace, requireUser } from "@/lib/space";
import { getNextDecisionNumber } from "@/lib/queries";
import type { MeetingSessionState } from "@/lib/meeting-state";
import { advanceItem, skipItem, goToItem, startDecisionFlow } from "@/lib/meeting-state";

async function getMeetingState(meetingId: string, spaceId: string) {
  const [m] = await db
    .select({
      id: meetings.id,
      sessionState: meetings.sessionState,
      createdBy: meetings.createdBy,
    })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, spaceId)))
    .limit(1);

  return m || null;
}

async function saveState(meetingId: string, state: MeetingSessionState) {
  await db
    .update(meetings)
    .set({ sessionState: state, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));
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
type MeetingRow = { id: string; sessionState: unknown; createdBy: string | null };

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

export async function advanceAgendaItem(meetingId: string, outcome?: string, decisionId?: string) {
  return withMeetingState(meetingId, async ({ state }) => {
    const totalItems = await getAgendaCount(meetingId);
    const newState = advanceItem(state, totalItems, outcome, decisionId);
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function skipAgendaItem(meetingId: string) {
  return withMeetingState(meetingId, async ({ state }) => {
    const totalItems = await getAgendaCount(meetingId);
    const newState = skipItem(state, totalItems);
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function goToAgendaItem(meetingId: string, index: number) {
  return withMeetingState(meetingId, async ({ state }) => {
    const newState = goToItem(state, index);
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function startTimer(meetingId: string, durationMinutes: number) {
  return withMeetingState(meetingId, async ({ state }) => {
    const newState: MeetingSessionState = {
      ...state,
      timer: {
        startedAt: new Date().toISOString(),
        durationMinutes,
        paused: false,
        pausedAt: null,
        elapsed: 0,
      },
      version: state.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function pauseTimer(meetingId: string) {
  return withMeetingState(meetingId, async ({ state }) => {
    const now = new Date();
    const startedAt = state.timer.startedAt ? new Date(state.timer.startedAt) : now;
    const elapsed = state.timer.elapsed + (now.getTime() - startedAt.getTime()) / 1000;

    const newState: MeetingSessionState = {
      ...state,
      timer: {
        ...state.timer,
        paused: true,
        pausedAt: now.toISOString(),
        elapsed,
        startedAt: null,
      },
      version: state.version + 1,
      updatedAt: now.toISOString(),
    };
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function resetTimer(meetingId: string) {
  return withMeetingState(meetingId, async ({ state }) => {
    const newState: MeetingSessionState = {
      ...state,
      timer: {
        startedAt: null,
        durationMinutes: state.timer.durationMinutes,
        paused: false,
        pausedAt: null,
        elapsed: 0,
      },
      version: state.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function beginDecisionFlow(meetingId: string, method: string, proposalText?: string) {
  return withMeetingState(meetingId, async ({ state }) => {
    const newState = startDecisionFlow(state, method, proposalText);
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function advanceDecisionStage(meetingId: string, nextStage: string) {
  return withMeetingState(meetingId, async ({ state }) => {
    if (!state.decisionFlow) return { error: "No decision flow active" };

    const newState: MeetingSessionState = {
      ...state,
      decisionFlow: {
        ...state.decisionFlow,
        stage: nextStage,
      },
      version: state.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function submitResponse(
  meetingId: string,
  value: string,
  comment?: string
) {
  return withMeetingState(meetingId, async ({ state, user }) => {
    if (!state.decisionFlow) return { error: "No decision flow active" };

    const newState: MeetingSessionState = {
      ...state,
      decisionFlow: {
        ...state.decisionFlow,
        responses: [
          ...state.decisionFlow.responses,
          {
            participantId: user.id,
            name: user.name || "Unknown",
            value,
            comment,
            respondedAt: new Date().toISOString(),
          },
        ],
      },
      version: state.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function requestToSpeak(meetingId: string) {
  return withMeetingState(meetingId, async ({ state, user }) => {
    if (state.speakerStack.some((s) => s.participantId === user.id)) {
      return { state };
    }

    const newState: MeetingSessionState = {
      ...state,
      speakerStack: [
        ...state.speakerStack,
        {
          participantId: user.id,
          name: user.name || "Unknown",
          requestedAt: new Date().toISOString(),
        },
      ],
      version: state.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function withdrawSpeaker(meetingId: string, participantId?: string) {
  return withMeetingState(meetingId, async ({ state, user }) => {
    const targetId = participantId || user.id;

    const newState: MeetingSessionState = {
      ...state,
      speakerStack: state.speakerStack.filter((s) => s.participantId !== targetId),
      version: state.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await saveState(meetingId, newState);
    return { state: newState };
  });
}

export async function cancelDecisionFlow(meetingId: string) {
  return withMeetingState(meetingId, async ({ state }) => {
    const newState: MeetingSessionState = {
      ...state,
      phase: "agenda_item",
      decisionFlow: null,
      version: state.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await saveState(meetingId, newState);
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
  return withMeetingState(meetingId, async ({ user, space }) => {
    const nextNumber = await getNextDecisionNumber(space.id);

    const [decision] = await db
      .insert(decisions)
      .values({
        spaceId: space.id,
        number: nextNumber,
        title,
        method: method as "consent" | "majority_vote" | "advice_process" | "delegation" | "consensus" | "lazy_consensus",
        outcome,
        status: "decided",
        date: new Date(),
        createdBy: user.id,
      })
      .returning({ id: decisions.id });

    await db.insert(meetingDecisions).values({
      meetingId,
      decisionId: decision.id,
    });

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
    return { decisionId: decision.id, number: nextNumber };
  });
}

export async function recordMeetingAction(
  meetingId: string,
  decisionId: string,
  description: string,
  ownerName?: string,
  dueDate?: string
) {
  return withMeetingState(meetingId, async ({ space }) => {
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
  return withMeetingState(meetingId, async ({ state }) => {
    const finalState: MeetingSessionState = {
      ...state,
      phase: "completed",
      version: state.version + 1,
      updatedAt: new Date().toISOString(),
    };

    await db
      .update(meetings)
      .set({
        status: "completed",
        sessionState: finalState,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId));

    revalidatePath(`/meetings/${meetingId}`);
    return { success: true };
  });
}
