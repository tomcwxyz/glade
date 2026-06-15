"use client";

import type { MeetingSessionState, DecisionFlow } from "@/lib/meeting-state";
import { ChevronRight, ChevronLeft, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { useLiveRegion } from "@/components/live-region";

const ADVICE_STAGES = [
  { key: "present", label: "Present", description: "Present the proposal and who will decide" },
  { key: "consult", label: "Consult", description: "Gather input from those affected or with expertise" },
  { key: "review", label: "Review & Decide", description: "Review advice and record the decision" },
];

export function AdviceFlow({
  flow,
  state,
  isFacilitator,
  currentUserId,
  onAdvanceStage,
  onSubmitAdvice,
  onWithdraw,
  onRecord,
}: {
  flow: DecisionFlow;
  state: MeetingSessionState;
  isFacilitator: boolean;
  currentUserId?: string;
  onAdvanceStage: (stage: string) => Promise<void>;
  onSubmitAdvice: (value: string, comment?: string) => Promise<void>;
  onWithdraw?: () => Promise<void>;
  onRecord: (title: string, method: string, outcome?: string) => Promise<void>;
}) {
  const { announce } = useLiveRegion();
  const [title, setTitle] = useState(flow.proposalText || "");
  const [outcome, setOutcome] = useState("");

  // Derive the caller's existing advice from state so it survives re-renders and
  // can be revised or withdrawn (rather than a one-way local "submitted" flag).
  const myAdvice = flow.responses.find(
    (r) => r.participantId === currentUserId && r.stage === "consult"
  );
  const [advice, setAdvice] = useState(myAdvice?.comment ?? "");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const currentStageIndex = ADVICE_STAGES.findIndex((s) => s.key === flow.stage);

  useEffect(() => {
    if (flow?.stage) {
      const stageLabels: Record<string, string> = {
        present: "Presenting proposal",
        consult: "Consultation open",
        review: "Review and decide",
      };
      announce(stageLabels[flow.stage] || flow.stage);
    }
  }, [flow?.stage, announce]);
  const participantCount = Object.keys(state.participants).length;

  async function handleSubmitAdvice() {
    if (!advice.trim()) return;
    setSubmitting(true);
    await onSubmitAdvice("advice", advice.trim());
    setSubmitting(false);
    setEditing(false);
  }

  async function handleWithdrawAdvice() {
    if (!onWithdraw) return;
    setSubmitting(true);
    await onWithdraw();
    setSubmitting(false);
    setAdvice("");
    setEditing(false);
  }

  return (
    <div className="p-5 bg-paper-warm rounded-xl border border-border">
      {/* Stage indicator */}
      <div className="flex flex-wrap items-center gap-1 mb-5">
        {ADVICE_STAGES.map((stage, i) => {
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
              {i < ADVICE_STAGES.length - 1 && (
                <ChevronRight size={12} className="text-bark-muted/30 mx-0.5 hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-bark mb-1 flex items-center gap-1.5">
          <MessageSquare size={14} className="text-canopy" />
          {ADVICE_STAGES[currentStageIndex]?.label}
        </h3>
        <p className="text-xs text-bark-muted">
          {ADVICE_STAGES[currentStageIndex]?.description}
        </p>
      </div>

      {flow.proposalText && (
        <div className="p-3 bg-paper rounded-lg border border-border mb-4">
          <p className="text-sm text-bark">{flow.proposalText}</p>
        </div>
      )}

      {/* Consult stage: participants give input (editable / withdrawable) */}
      {flow.stage === "consult" && !isFacilitator && (
        (!myAdvice || editing) ? (
          <div className="space-y-3 mb-4">
            <textarea
              placeholder="Share your advice, perspective, or concerns…"
              value={advice}
              onChange={(e) => setAdvice(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20"
            />
            <button
              type="button"
              onClick={handleSubmitAdvice}
              disabled={!advice.trim() || submitting}
              className="px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
            >
              {myAdvice ? "Update advice" : "Submit advice"}
            </button>
          </div>
        ) : (
          <div className="p-3 bg-canopy-pale rounded-lg border border-canopy/20 mb-4">
            <p className="text-sm text-canopy font-medium mb-1">
              Your advice has been recorded. Waiting for others…
            </p>
            <p className="text-sm text-bark-muted mb-2">{myAdvice.comment}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setAdvice(myAdvice.comment ?? "");
                  setEditing(true);
                }}
                className="text-xs text-canopy hover:underline"
              >
                Edit
              </button>
              {onWithdraw && (
                <button
                  type="button"
                  onClick={handleWithdrawAdvice}
                  disabled={submitting}
                  className="text-xs text-bark-muted hover:text-earth transition-colors disabled:opacity-50"
                >
                  Withdraw
                </button>
              )}
            </div>
          </div>
        )
      )}

      {/* Consultation responses (visible to facilitator always, and in review stage) */}
      {(isFacilitator || flow.stage === "review") && flow.responses.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-bark-muted font-medium mb-2">
            Advice received ({flow.responses.length} of {participantCount})
          </h4>
          <div className="space-y-2">
            {flow.responses.map((r, i) => (
              <div
                key={i}
                className="px-3 py-2.5 bg-paper rounded-lg border border-border"
              >
                <div className="text-xs font-medium text-bark mb-1">{r.name}</div>
                <p className="text-sm text-bark-muted">{r.comment || r.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {flow.stage === "consult" && isFacilitator && (
        <p className="text-xs text-bark-muted mb-4">
          {flow.responses.length} of {participantCount} participants have responded.
        </p>
      )}

      {/* Review stage: record decision */}
      {flow.stage === "review" && isFacilitator && (
        <div className="space-y-3 mb-4">
          <input
            type="text"
            placeholder="Decision title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <textarea
            placeholder="Decision outcome — how did the advice inform the decision?"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <button
            type="button"
            onClick={() => onRecord(title, "advice_process", outcome || undefined)}
            disabled={!title.trim()}
            className="px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            Record decision
          </button>
        </div>
      )}

      {/* Facilitator navigation */}
      {isFacilitator && (
        <div className="flex items-center gap-2">
          {currentStageIndex > 0 && (
            <button
              type="button"
              onClick={() => {
                const prev = ADVICE_STAGES[currentStageIndex - 1];
                if (prev) onAdvanceStage(prev.key);
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-bark-muted border border-border rounded-lg hover:bg-paper-deep transition-colors"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
          )}
          {flow.stage !== "review" && (
            <button
              type="button"
              onClick={() => {
                const next = ADVICE_STAGES[currentStageIndex + 1];
                if (next) onAdvanceStage(next.key);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
            >
              Next stage
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
