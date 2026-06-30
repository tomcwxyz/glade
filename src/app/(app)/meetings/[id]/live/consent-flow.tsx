"use client";

import type { MeetingSessionState, DecisionFlow } from "@/lib/meeting-state";
import { ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLiveRegion } from "@/components/live-region";

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
  currentUserId,
  onAdvanceStage,
  onSubmit,
  onRecord,
}: {
  meetingId: string;
  flow: DecisionFlow;
  state: MeetingSessionState;
  mutate: (s: MeetingSessionState) => void;
  isFacilitator: boolean;
  currentUserId?: string;
  onAdvanceStage: (stage: string) => Promise<void>;
  onSubmit?: (value: string, comment?: string) => Promise<void>;
  onRecord: (title: string, method: string, outcome?: string) => Promise<void>;
}) {
  const { announce } = useLiveRegion();
  const [title, setTitle] = useState(flow.proposalText || "");
  const [outcome, setOutcome] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // The current participant's response in the current stage (if any).
  const myResponse = flow.responses.find(
    (r) => r.participantId === currentUserId && r.stage === flow.stage
  );

  async function submit(value: string, withComment?: string) {
    if (!onSubmit) return;
    setSubmitting(true);
    await onSubmit(value, withComment);
    setSubmitting(false);
    setComment("");
  }

  const currentStageIndex = CONSENT_STAGES.findIndex((s) => s.key === flow.stage);

  useEffect(() => {
    if (flow?.stage) {
      const stageLabels: Record<string, string> = {
        present: "Presenting proposal",
        clarify: "Clarifying questions",
        react: "Reactions round",
        object: "Objection round",
        integrate: "Integration",
        decide: "Decision",
      };
      announce(stageLabels[flow.stage] || flow.stage);
    }
  }, [flow?.stage, announce]);
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

  function prevStage() {
    if (currentStageIndex <= 0) return;
    const prev = CONSENT_STAGES[currentStageIndex - 1];
    if (prev) onAdvanceStage(prev.key);
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

      {/* Participant: reactions round */}
      {flow.stage === "react" && !isFacilitator && onSubmit && (
        <div className="mb-4">
          {myResponse ? (
            <p className="text-sm text-canopy">
              Reaction recorded: <span className="font-medium">{myResponse.value}</span>
            </p>
          ) : (
            <>
              <h4 className="text-xs text-bark-muted font-medium mb-2">Your reaction</h4>
              <div className="flex flex-wrap gap-2 mb-2">
                {[
                  { v: "support", label: "👍 Support" },
                  { v: "concern", label: "🤔 Concern" },
                  { v: "against", label: "👎 Against" },
                  { v: "neutral", label: "😐 Neutral" },
                ].map((r) => (
                  <button
                    key={r.v}
                    type="button"
                    onClick={() => submit(r.v, comment || undefined)}
                    disabled={submitting}
                    className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-paper-deep transition-colors disabled:opacity-50"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Optional comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20"
              />
            </>
          )}
        </div>
      )}

      {/* Participant: objection round */}
      {flow.stage === "object" && !isFacilitator && onSubmit && (
        <div className="mb-4">
          {myResponse ? (
            <p className="text-sm text-canopy">
              {myResponse.value === "objection"
                ? "Objection recorded."
                : "Recorded: no objection."}
            </p>
          ) : (
            <>
              <h4 className="text-xs text-bark-muted font-medium mb-2">
                Do you have a reasoned objection?
              </h4>
              <textarea
                placeholder="Describe your objection (leave blank for none)…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20 mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => submit("no_objection")}
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
                >
                  No objection
                </button>
                <button
                  type="button"
                  onClick={() => submit("objection", comment)}
                  disabled={submitting || !comment.trim()}
                  className="px-4 py-2 text-sm bg-earth text-paper rounded-lg font-medium hover:bg-earth/90 transition-colors disabled:opacity-50"
                >
                  Raise objection
                </button>
              </div>
            </>
          )}
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

      {/* Facilitator navigation */}
      {isFacilitator && (
        <div className="flex items-center gap-2">
          {currentStageIndex > 0 && (
            <button
              type="button"
              onClick={prevStage}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-bark-muted border border-border rounded-lg hover:bg-paper-deep transition-colors"
            >
              <ChevronLeft size={14} />
              Previous
            </button>
          )}
          {flow.stage !== "decide" && (
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
      )}
    </div>
  );
}
