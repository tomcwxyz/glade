"use client";

import type { MeetingSessionState, DecisionFlow } from "@/lib/meeting-state";
import { ChevronRight, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useLiveRegion } from "@/components/live-region";

const DELEGATION_STAGES = [
  { key: "present", label: "Present", description: "Describe the delegation" },
  { key: "record", label: "Record", description: "Capture scope, constraints, and delegate" },
];

export function DelegationFlow({
  flow,
  isFacilitator,
  onAdvanceStage,
  onRecord,
}: {
  flow: DecisionFlow;
  isFacilitator: boolean;
  onAdvanceStage: (stage: string) => Promise<void>;
  onRecord: (title: string, method: string, outcome?: string) => Promise<void>;
}) {
  const { announce } = useLiveRegion();
  const [title, setTitle] = useState(flow.proposalText || "");
  const [delegate, setDelegate] = useState("");
  const [scope, setScope] = useState("");
  const [constraints, setConstraints] = useState("");
  const [reporting, setReporting] = useState("");
  const [reviewDate, setReviewDate] = useState("");

  const currentStageIndex = DELEGATION_STAGES.findIndex((s) => s.key === flow.stage);

  useEffect(() => {
    if (flow?.stage) {
      const stageLabels: Record<string, string> = {
        present: "Presenting delegation",
        record: "Recording delegation details",
      };
      announce(stageLabels[flow.stage] || flow.stage);
    }
  }, [flow?.stage, announce]);

  function handleRecord() {
    const parts = [`Delegated to: ${delegate}`];
    if (scope) parts.push(`Scope: ${scope}`);
    if (constraints) parts.push(`Constraints: ${constraints}`);
    if (reporting) parts.push(`Reporting: ${reporting}`);
    if (reviewDate) parts.push(`Review by: ${reviewDate}`);
    onRecord(title, "delegation", parts.join(". "));
  }

  return (
    <div className="p-5 bg-paper-warm rounded-xl border border-border">
      {/* Stage indicator */}
      <div className="flex items-center gap-1 mb-5">
        {DELEGATION_STAGES.map((stage, i) => {
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
              {i < DELEGATION_STAGES.length - 1 && (
                <ChevronRight size={12} className="text-bark-muted/30 mx-0.5" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-medium text-bark mb-1 flex items-center gap-1.5">
          <UserCheck size={14} className="text-canopy" />
          {DELEGATION_STAGES[currentStageIndex]?.label}
        </h3>
        <p className="text-xs text-bark-muted">
          {DELEGATION_STAGES[currentStageIndex]?.description}
        </p>
      </div>

      {flow.proposalText && flow.stage === "present" && (
        <div className="p-3 bg-paper rounded-lg border border-border mb-4">
          <p className="text-sm text-bark">{flow.proposalText}</p>
        </div>
      )}

      {/* Record stage: delegation details form */}
      {flow.stage === "record" && isFacilitator && (
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
            placeholder="Delegated to (person or role)"
            value={delegate}
            onChange={(e) => setDelegate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <textarea
            placeholder="Scope — what authority is being delegated?"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <textarea
            placeholder="Constraints — any limits or conditions? (optional)"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <input
            type="text"
            placeholder="Reporting requirements (optional)"
            value={reporting}
            onChange={(e) => setReporting(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
          />
          <div>
            <label className="block text-xs text-bark-muted mb-1">Review date (optional)</label>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
            />
          </div>
          <button
            type="button"
            onClick={handleRecord}
            disabled={!title.trim() || !delegate.trim()}
            className="px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            Record delegation
          </button>
        </div>
      )}

      {!isFacilitator && flow.stage === "record" && (
        <p className="text-xs text-bark-muted">
          The facilitator is recording the delegation details.
        </p>
      )}

      {/* Facilitator advance from present to record */}
      {isFacilitator && flow.stage === "present" && (
        <button
          type="button"
          onClick={() => onAdvanceStage("record")}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
        >
          Capture details
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
