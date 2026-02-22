"use client";

import type { MeetingSessionState, DecisionFlow } from "@/lib/meeting-state";
import { ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const CONSENT_STAGES = [
  { key: "present", label: "Present", description: "Present the proposal to the group" },
  { key: "clarify", label: "Clarify", description: "Clarifying questions only" },
  { key: "react", label: "React", description: "Quick reactions and initial thoughts" },
  { key: "object", label: "Object", description: "Reasoned objections" },
  { key: "integrate", label: "Integrate", description: "Amend proposal to address objections" },
  { key: "decide", label: "Decide", description: "Record the decision" },
];

export function ConsentFlow({
  meetingId,
  flow,
  state,
  mutate,
  isFacilitator,
  onAdvanceStage,
  onRecord,
}: {
  meetingId: string;
  flow: DecisionFlow;
  state: MeetingSessionState;
  mutate: (s: MeetingSessionState) => void;
  isFacilitator: boolean;
  onAdvanceStage: (stage: string) => Promise<void>;
  onRecord: (title: string, method: string, outcome?: string) => Promise<void>;
}) {
  const [title, setTitle] = useState(flow.proposalText || "");
  const [outcome, setOutcome] = useState("");

  const currentStageIndex = CONSENT_STAGES.findIndex((s) => s.key === flow.stage);
  const objections = flow.responses.filter((r) => r.value === "objection");
  const hasObjections = objections.length > 0;

  function nextStage() {
    const next = CONSENT_STAGES[currentStageIndex + 1];
    if (next) {
      // Skip integrate if no objections
      if (next.key === "integrate" && !hasObjections) {
        onAdvanceStage("decide");
      } else {
        onAdvanceStage(next.key);
      }
    }
  }

  return (
    <div className="p-5 bg-paper-warm rounded-xl border border-border">
      {/* Stage indicator */}
      <div className="flex flex-wrap items-center gap-1 mb-5">
        {CONSENT_STAGES.map((stage, i) => {
          const isCurrent = stage.key === flow.stage;
          const isPast = i < currentStageIndex;
          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={`px-2.5 py-1 rounded-full text-[0.6875rem] font-medium transition-colors ${
                  isCurrent
                    ? "bg-canopy text-paper"
                    : isPast
                    ? "bg-canopy-pale text-canopy"
                    : "bg-paper-deep text-bark-muted"
                }`}
              >
                {stage.label}
              </div>
              {i < CONSENT_STAGES.length - 1 && (
                <ChevronRight size={12} className="text-bark-muted/30 mx-0.5 hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage content */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-bark mb-1">
          {CONSENT_STAGES[currentStageIndex]?.label}
        </h3>
        <p className="text-xs text-bark-muted">
          {CONSENT_STAGES[currentStageIndex]?.description}
        </p>
      </div>

      {/* Proposal text */}
      {flow.proposalText && (
        <div className="p-3 bg-paper rounded-lg border border-border mb-4">
          <p className="text-sm text-bark">{flow.proposalText}</p>
        </div>
      )}

      {/* Responses display */}
      {flow.responses.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-bark-muted font-medium mb-2">
            Responses ({flow.responses.length})
          </h4>
          <div className="space-y-1.5">
            {flow.responses.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm ${
                  r.value === "objection"
                    ? "bg-earth/5 border border-earth/20"
                    : "bg-paper-deep"
                }`}
              >
                {r.value === "objection" ? (
                  <AlertTriangle size={14} className="text-earth mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 size={14} className="text-canopy mt-0.5 shrink-0" />
                )}
                <div>
                  <span className="font-medium text-bark">{r.name}</span>
                  <span className="text-bark-muted"> — {r.value}</span>
                  {r.comment && (
                    <p className="text-xs text-bark-muted mt-0.5">{r.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objections summary */}
      {flow.stage === "integrate" && hasObjections && (
        <div className="p-3 bg-earth/5 border border-earth/20 rounded-lg mb-4">
          <h4 className="text-xs font-medium text-earth mb-1">
            Objections to address ({objections.length})
          </h4>
          {objections.map((o, i) => (
            <p key={i} className="text-sm text-bark-muted">
              {o.name}: {o.comment || "(no details)"}
            </p>
          ))}
        </div>
      )}

      {/* Record decision form (decide stage) */}
      {flow.stage === "decide" && isFacilitator && (
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Decision title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <input
            type="text"
            placeholder="Outcome (optional)"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <button
            type="button"
            onClick={() => onRecord(title, "consent", outcome || undefined)}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            Record decision
          </button>
        </div>
      )}

      {/* Facilitator advance button */}
      {isFacilitator && flow.stage !== "decide" && (
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
