"use client";

import type { MeetingSessionState, DecisionFlow } from "@/lib/meeting-state";
import { ChevronRight, BarChart3 } from "lucide-react";
import { useState } from "react";

const VOTE_STAGES = [
  { key: "present", label: "Present", description: "Present the proposal" },
  { key: "vote", label: "Vote", description: "Participants cast their votes" },
  { key: "results", label: "Results", description: "Review results and record" },
];

export function VoteFlow({
  meetingId,
  flow,
  state,
  mutate,
  isFacilitator,
  onAdvanceStage,
  onRecord,
  passThreshold,
}: {
  meetingId: string;
  flow: DecisionFlow;
  state: MeetingSessionState;
  mutate: (s: MeetingSessionState) => void;
  isFacilitator: boolean;
  onAdvanceStage: (stage: string) => Promise<void>;
  onRecord: (title: string, method: string, outcome?: string) => Promise<void>;
  passThreshold?: number;
}) {
  const [title, setTitle] = useState(flow.proposalText || "");
  const currentStageIndex = VOTE_STAGES.findIndex((s) => s.key === flow.stage);
  const threshold = passThreshold ?? 0.5;

  // Vote tallies
  const forVotes = flow.responses.filter((r) => r.value === "for").length;
  const againstVotes = flow.responses.filter((r) => r.value === "against").length;
  const abstainVotes = flow.responses.filter((r) => r.value === "abstain").length;
  const totalVotes = flow.responses.length;
  const castVotes = forVotes + againstVotes; // abstentions don't count toward threshold
  const passed = castVotes > 0 ? forVotes / castVotes > threshold : false;
  const thresholdLabel = threshold === 0.5 ? "Simple majority" : `${Math.round(threshold * 100)}% required`;

  function nextStage() {
    const next = VOTE_STAGES[currentStageIndex + 1];
    if (next) onAdvanceStage(next.key);
  }

  return (
    <div className="p-5 bg-paper-warm rounded-xl border border-border">
      {/* Stage indicator */}
      <div className="flex items-center gap-1 mb-5">
        {VOTE_STAGES.map((stage, i) => {
          const isCurrent = stage.key === flow.stage;
          const isPast = i < currentStageIndex;
          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={`px-2.5 py-1 rounded-full text-[0.6875rem] font-medium ${
                  isCurrent
                    ? "bg-canopy text-paper"
                    : isPast
                    ? "bg-canopy-pale text-canopy"
                    : "bg-paper-deep text-bark-muted"
                }`}
              >
                {stage.label}
              </div>
              {i < VOTE_STAGES.length - 1 && (
                <ChevronRight size={12} className="text-bark-muted/30 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-bark mb-1">
          {VOTE_STAGES[currentStageIndex]?.label}
        </h3>
        <p className="text-xs text-bark-muted">
          {VOTE_STAGES[currentStageIndex]?.description}
        </p>
      </div>

      {flow.proposalText && (
        <div className="p-3 bg-paper rounded-lg border border-border mb-4">
          <p className="text-sm text-bark">{flow.proposalText}</p>
        </div>
      )}

      {/* Vote count (visible during vote and results) */}
      {(flow.stage === "vote" || flow.stage === "results") && (
        <div className="mb-4">
          <h4 className="text-xs text-bark-muted font-medium flex items-center gap-1.5 mb-2">
            <BarChart3 size={12} />
            Votes ({totalVotes})
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-canopy-pale rounded-lg">
              <div className="text-xl font-medium text-canopy">{forVotes}</div>
              <div className="text-xs text-canopy">For</div>
            </div>
            <div className="text-center p-3 bg-earth/5 rounded-lg">
              <div className="text-xl font-medium text-earth">{againstVotes}</div>
              <div className="text-xs text-earth">Against</div>
            </div>
            <div className="text-center p-3 bg-paper-deep rounded-lg">
              <div className="text-xl font-medium text-bark-muted">{abstainVotes}</div>
              <div className="text-xs text-bark-muted">Abstain</div>
            </div>
          </div>
        </div>
      )}

      {/* Results stage: record */}
      {flow.stage === "results" && isFacilitator && (
        <div className="space-y-3 mb-4">
          <div className={`text-sm font-medium p-2 rounded ${passed ? "text-canopy bg-canopy-pale" : "text-earth bg-earth/5"}`}>
            {passed ? "Motion carried" : "Motion not carried"}
            <span className="font-normal text-xs ml-2 opacity-70">({thresholdLabel})</span>
          </div>
          <input
            type="text"
            placeholder="Decision title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <button
            type="button"
            onClick={() =>
              onRecord(
                title,
                "majority_vote",
                `${passed ? "Carried" : "Not carried"}: ${forVotes} for, ${againstVotes} against, ${abstainVotes} abstain`
              )
            }
            disabled={!title.trim()}
            className="px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            Record decision
          </button>
        </div>
      )}

      {/* Facilitator advance */}
      {isFacilitator && flow.stage !== "results" && (
        <button
          type="button"
          onClick={nextStage}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
        >
          Next stage
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
