export interface MeetingTimer {
  startedAt: string | null;
  durationMinutes: number;
  paused: boolean;
  pausedAt: string | null;
  elapsed: number; // seconds elapsed before pause
}

export interface DecisionResponse {
  participantId: string;
  name: string;
  value: string; // "consent" | "object" | "abstain" | vote choice etc
  comment?: string;
  stage?: string; // flow stage the response was given in (dedupe key per participant+stage)
  respondedAt: string;
}

export interface DecisionFlow {
  method: string;
  stage: string;
  proposalText?: string;
  responses: DecisionResponse[];
}

export type SpeakerStatus = "waiting" | "speaking" | "spoke";

export interface SpeakerEntry {
  participantId: string;
  name: string;
  requestedAt: string;
  status?: SpeakerStatus; // missing => "waiting" (back-compat for in-flight meetings)
  calledAt?: string;
  finishedAt?: string;
  note?: string; // facilitator note / clarifying question raised
}

/** Resolve a speaker's status, defaulting legacy entries (no status) to waiting. */
export function speakerStatus(entry: SpeakerEntry): SpeakerStatus {
  return entry.status ?? "waiting";
}

export interface CompletedItem {
  outcome?: string;
  decisionId?: string;
  skipped: boolean;
  completedAt: string;
}

export interface Participant {
  name: string;
  lastSeenAt: string;
  role: "facilitator" | "participant" | "observer";
}

export interface MeetingSessionState {
  currentAgendaItemIndex: number;
  phase: "not_started" | "agenda_item" | "decision_flow" | "completed";
  timer: MeetingTimer;
  decisionFlow: DecisionFlow | null;
  speakerStack: SpeakerEntry[];
  completedItems: Record<number, CompletedItem>;
  participants: Record<string, Participant>;
  version: number;
  updatedAt: string;
}

export function createInitialState(
  facilitatorId: string,
  facilitatorName: string
): MeetingSessionState {
  return {
    currentAgendaItemIndex: 0,
    phase: "agenda_item",
    timer: {
      startedAt: null,
      durationMinutes: 5,
      paused: false,
      pausedAt: null,
      elapsed: 0,
    },
    decisionFlow: null,
    speakerStack: [],
    completedItems: {},
    participants: {
      [facilitatorId]: {
        name: facilitatorName,
        lastSeenAt: new Date().toISOString(),
        role: "facilitator",
      },
    },
    version: 1,
    updatedAt: new Date().toISOString(),
  };
}

export function advanceItem(
  state: MeetingSessionState,
  totalItems: number,
  outcome?: string,
  decisionId?: string
): MeetingSessionState {
  const now = new Date().toISOString();

  // Mark current as completed
  const completedItems = {
    ...state.completedItems,
    [state.currentAgendaItemIndex]: {
      outcome,
      decisionId,
      skipped: false,
      completedAt: now,
    },
  };

  const nextIndex = state.currentAgendaItemIndex + 1;
  const isComplete = nextIndex >= totalItems;

  return {
    ...state,
    currentAgendaItemIndex: isComplete ? state.currentAgendaItemIndex : nextIndex,
    phase: isComplete ? "completed" : "agenda_item",
    timer: {
      startedAt: null,
      durationMinutes: 5,
      paused: false,
      pausedAt: null,
      elapsed: 0,
    },
    decisionFlow: null,
    speakerStack: [],
    completedItems,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function skipItem(
  state: MeetingSessionState,
  totalItems: number
): MeetingSessionState {
  const now = new Date().toISOString();

  const completedItems = {
    ...state.completedItems,
    [state.currentAgendaItemIndex]: {
      skipped: true,
      completedAt: now,
    },
  };

  const nextIndex = state.currentAgendaItemIndex + 1;
  const isComplete = nextIndex >= totalItems;

  return {
    ...state,
    currentAgendaItemIndex: isComplete ? state.currentAgendaItemIndex : nextIndex,
    phase: isComplete ? "completed" : "agenda_item",
    timer: {
      startedAt: null,
      durationMinutes: 5,
      paused: false,
      pausedAt: null,
      elapsed: 0,
    },
    decisionFlow: null,
    speakerStack: [],
    completedItems,
    version: state.version + 1,
    updatedAt: now,
  };
}

export function goToItem(
  state: MeetingSessionState,
  index: number
): MeetingSessionState {
  return {
    ...state,
    currentAgendaItemIndex: index,
    phase: "agenda_item",
    timer: {
      startedAt: null,
      durationMinutes: 5,
      paused: false,
      pausedAt: null,
      elapsed: 0,
    },
    decisionFlow: null,
    speakerStack: [],
    version: state.version + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function startDecisionFlow(
  state: MeetingSessionState,
  method: string,
  proposalText?: string
): MeetingSessionState {
  const stageMap: Record<string, string> = {
    consent: "present",
    majority_vote: "present",
    advice_process: "present",
    lazy_consensus: "present",
    temperature_check: "vote",
  };

  return {
    ...state,
    phase: "decision_flow",
    decisionFlow: {
      method,
      stage: stageMap[method] || "present",
      proposalText,
      responses: [],
    },
    version: state.version + 1,
    updatedAt: new Date().toISOString(),
  };
}
