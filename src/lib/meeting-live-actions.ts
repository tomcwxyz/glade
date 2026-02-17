"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  meetings,
  decisions,
  meetingDecisions,
  actions,
  meetingAgendaItems,
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

export async function advanceAgendaItem(meetingId: string, outcome?: string, decisionId?: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
  const totalItems = await getAgendaCount(meetingId);
  const newState = advanceItem(state, totalItems, outcome, decisionId);

  await saveState(meetingId, newState);
  return { state: newState };
}

export async function skipAgendaItem(meetingId: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
  const totalItems = await getAgendaCount(meetingId);
  const newState = skipItem(state, totalItems);

  await saveState(meetingId, newState);
  return { state: newState };
}

export async function goToAgendaItem(meetingId: string, index: number) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
  const newState = goToItem(state, index);

  await saveState(meetingId, newState);
  return { state: newState };
}

export async function startTimer(meetingId: string, durationMinutes: number) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
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
}

export async function pauseTimer(meetingId: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
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
}

export async function resetTimer(meetingId: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
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
}

export async function beginDecisionFlow(meetingId: string, method: string, proposalText?: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
  const newState = startDecisionFlow(state, method, proposalText);

  await saveState(meetingId, newState);
  return { state: newState };
}

export async function advanceDecisionStage(meetingId: string, nextStage: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
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
}

export async function submitResponse(
  meetingId: string,
  value: string,
  comment?: string
) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
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
}

export async function requestToSpeak(meetingId: string) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;

  // Don't add if already in stack
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
}

export async function withdrawSpeaker(meetingId: string, participantId?: string) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
  const targetId = participantId || user.id;

  const newState: MeetingSessionState = {
    ...state,
    speakerStack: state.speakerStack.filter((s) => s.participantId !== targetId),
    version: state.version + 1,
    updatedAt: new Date().toISOString(),
  };

  await saveState(meetingId, newState);
  return { state: newState };
}

export async function recordMeetingDecision(
  meetingId: string,
  title: string,
  method: string,
  outcome?: string
) {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

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

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/decisions");
  return { decisionId: decision.id, number: nextNumber };
}

export async function recordMeetingAction(
  meetingId: string,
  decisionId: string,
  description: string,
  ownerName?: string,
  dueDate?: string
) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  await db.insert(actions).values({
    spaceId: space.id,
    decisionId,
    description,
    ownerName: ownerName || null,
    dueDate: dueDate ? new Date(dueDate) : null,
    status: "open",
  });

  revalidatePath(`/meetings/${meetingId}`);
  revalidatePath("/actions");
  return { success: true };
}

export async function endMeeting(meetingId: string) {
  await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };

  const m = await getMeetingState(meetingId, space.id);
  if (!m?.sessionState) return { error: "No session state" };

  const state = m.sessionState as MeetingSessionState;
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
}
