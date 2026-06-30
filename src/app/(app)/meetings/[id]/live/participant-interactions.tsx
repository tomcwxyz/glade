"use client";

import type { MeetingSessionState } from "@/lib/meeting-state";
import { MessageCircle } from "lucide-react";

/**
 * Idle panel shown to participants when no decision flow is active. During a
 * flow, participant input is handled inside the flow components themselves
 * (ConsentFlow / VoteFlow / AdviceFlow / TemperatureCheckFlow) via
 * DecisionFlowContainer.
 */
export function ParticipantInteractions({
  state,
}: {
  meetingId: string;
  state: MeetingSessionState;
  mutate: (s: MeetingSessionState) => void;
}) {
  if (state.decisionFlow) return null;

  return (
    <div className="p-4 bg-paper-warm rounded-xl border border-border">
      <p className="text-sm text-bark-muted flex items-center gap-2">
        <MessageCircle size={14} />
        Waiting for the facilitator to begin a decision process.
      </p>
    </div>
  );
}
