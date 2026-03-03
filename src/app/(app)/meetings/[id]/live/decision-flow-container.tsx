"use client";

import type { MeetingSessionState } from "@/lib/meeting-state";
import { ConsentFlow } from "./consent-flow";
import { VoteFlow } from "./vote-flow";
import { AdviceFlow } from "./advice-flow";
import { DelegationFlow } from "./delegation-flow";
import { TemperatureCheckFlow } from "./temperature-check-flow";
import {
  advanceDecisionStage,
  submitResponse,
  recordMeetingDecision,
  advanceAgendaItem,
  cancelDecisionFlow,
} from "@/lib/meeting-live-actions";
import { useCallback, useEffect } from "react";
import { useLiveRegion } from "@/components/live-region";

export function DecisionFlowContainer({
  meetingId,
  state,
  mutate,
  isFacilitator,
  voteThreshold,
}: {
  meetingId: string;
  state: MeetingSessionState;
  mutate: (s: MeetingSessionState) => void;
  isFacilitator: boolean;
  voteThreshold?: number;
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

  const handleSubmitResponse = useCallback(
    async (value: string, comment?: string) => {
      const result = await submitResponse(meetingId, value, comment);
      if ("state" in result && result.state) mutate(result.state);
    },
    [meetingId, mutate]
  );

  const handleCloseFlow = useCallback(async () => {
    const result = await cancelDecisionFlow(meetingId);
    if ("state" in result && result.state) mutate(result.state);
  }, [meetingId, mutate]);

  const { announce } = useLiveRegion();
  const flow = state.decisionFlow;

  // Announce stage changes for lazy consensus (other methods announce in their own components)
  const lazyConsensusStage = flow?.method === "lazy_consensus" ? flow.stage : null;
  useEffect(() => {
    if (lazyConsensusStage) {
      const stageLabels: Record<string, string> = {
        present: "Presenting proposal for lazy consensus",
        record: "Recording decision",
      };
      announce(stageLabels[lazyConsensusStage] || lazyConsensusStage);
    }
  }, [lazyConsensusStage, announce]);

  if (!flow) return null;

  if (flow.method === "temperature_check") {
    return (
      <TemperatureCheckFlow
        flow={flow}
        state={state}
        isFacilitator={isFacilitator}
        onSubmit={(value) => handleSubmitResponse(value)}
        onClose={handleCloseFlow}
      />
    );
  }

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
        passThreshold={voteThreshold}
      />
    );
  }

  if (flow.method === "delegation") {
    return (
      <DelegationFlow
        flow={flow}
        isFacilitator={isFacilitator}
        onAdvanceStage={handleAdvanceStage}
        onRecord={handleRecordAndAdvance}
      />
    );
  }

  if (flow.method === "advice_process") {
    return (
      <AdviceFlow
        flow={flow}
        state={state}
        isFacilitator={isFacilitator}
        onAdvanceStage={handleAdvanceStage}
        onSubmitAdvice={handleSubmitResponse}
        onRecord={handleRecordAndAdvance}
      />
    );
  }

  // Lazy consensus: simplified flow
  return (
    <div className="p-4 bg-paper-warm rounded-xl border border-border">
      <h3 className="text-sm font-medium text-bark mb-2 capitalize">
        {flow.method.replace("_", " ")} — {flow.stage}
      </h3>
      {flow.proposalText && (
        <p className="text-sm text-bark-muted mb-4">{flow.proposalText}</p>
      )}
      {isFacilitator && flow.stage === "record" && (
        <p className="text-xs text-bark-muted mb-4">
          Use the &quot;Record decision&quot; button above to finalise.
        </p>
      )}
      {isFacilitator && (
        <div className="flex items-center gap-2">
          {flow.stage === "record" && (
            <button
              type="button"
              onClick={() => handleAdvanceStage("present")}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-bark-muted border border-border rounded-lg hover:bg-paper-deep transition-colors"
            >
              Previous
            </button>
          )}
          {flow.stage === "present" && (
            <button
              type="button"
              onClick={() => handleAdvanceStage("record")}
              className="px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
            >
              Proceed to record
            </button>
          )}
        </div>
      )}
    </div>
  );
}
