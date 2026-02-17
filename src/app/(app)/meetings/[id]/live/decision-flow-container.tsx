"use client";

import type { MeetingSessionState } from "@/lib/meeting-state";
import { ConsentFlow } from "./consent-flow";
import { VoteFlow } from "./vote-flow";
import {
  advanceDecisionStage,
  recordMeetingDecision,
  advanceAgendaItem,
} from "@/lib/meeting-live-actions";
import { useCallback } from "react";

export function DecisionFlowContainer({
  meetingId,
  state,
  mutate,
  isFacilitator,
}: {
  meetingId: string;
  state: MeetingSessionState;
  mutate: (s: MeetingSessionState) => void;
  isFacilitator: boolean;
}) {
  const handleAdvanceStage = useCallback(
    async (nextStage: string) => {
      const result = await advanceDecisionStage(meetingId, nextStage);
      if ("state" in result && result.state) mutate(result.state);
    },
    [meetingId, mutate]
  );

  const handleRecordAndAdvance = useCallback(
    async (title: string, method: string, outcome?: string) => {
      const result = await recordMeetingDecision(meetingId, title, method, outcome);
      if ("decisionId" in result) {
        const advResult = await advanceAgendaItem(meetingId, outcome, result.decisionId);
        if ("state" in advResult && advResult.state) mutate(advResult.state);
      }
    },
    [meetingId, mutate]
  );

  const flow = state.decisionFlow;
  if (!flow) return null;

  if (flow.method === "consent") {
    return (
      <ConsentFlow
        meetingId={meetingId}
        flow={flow}
        state={state}
        mutate={mutate}
        isFacilitator={isFacilitator}
        onAdvanceStage={handleAdvanceStage}
        onRecord={handleRecordAndAdvance}
      />
    );
  }

  if (flow.method === "majority_vote") {
    return (
      <VoteFlow
        meetingId={meetingId}
        flow={flow}
        state={state}
        mutate={mutate}
        isFacilitator={isFacilitator}
        onAdvanceStage={handleAdvanceStage}
        onRecord={handleRecordAndAdvance}
      />
    );
  }

  // Advice process / lazy consensus: simplified flow
  return (
    <div className="p-4 bg-paper-warm rounded-xl border border-border">
      <h3 className="text-sm font-medium text-bark mb-2 capitalize">
        {flow.method.replace("_", " ")} — {flow.stage}
      </h3>
      {flow.proposalText && (
        <p className="text-sm text-bark-muted mb-4">{flow.proposalText}</p>
      )}
      {isFacilitator && flow.stage === "present" && (
        <button
          type="button"
          onClick={() => handleAdvanceStage("record")}
          className="px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
        >
          Proceed to record
        </button>
      )}
      {isFacilitator && flow.stage === "record" && (
        <p className="text-xs text-bark-muted">
          Use the &quot;Record decision&quot; button above to finalise.
        </p>
      )}
    </div>
  );
}
