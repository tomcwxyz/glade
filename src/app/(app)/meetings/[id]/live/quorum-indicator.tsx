"use client";

import { CheckCircle2, TriangleAlert } from "lucide-react";
import { describeQuorumRule, evaluateQuorum, isQuorumEligibleRole, type QuorumRule } from "@/lib/quorum";
import type { PresentMember } from "./use-meeting-poll";

/**
 * Live quorum for the facilitator: eligible members currently in the meeting
 * against the space's rule. Decisions recorded now are stamped with the same
 * count (minus anyone marked as having left the room).
 */
export function QuorumIndicator({
  rule,
  eligible,
  presence,
  compact = false,
}: {
  rule: QuorumRule | null;
  eligible: number;
  presence: PresentMember[];
  compact?: boolean;
}) {
  if (!rule) return null;
  const present = new Set(presence.filter((p) => isQuorumEligibleRole(p.role)).map((p) => p.userId)).size;
  const q = evaluateQuorum(rule, eligible, present);
  const Icon = q.met ? CheckCircle2 : TriangleAlert;
  const tone = q.met ? "text-canopy" : "text-amber";

  if (compact) {
    return (
      <span className={`flex items-center gap-1 ${tone}`} title={`Quorum: ${describeQuorumRule(rule)}`}>
        <Icon size={11} />
        {q.present}/{q.required}
      </span>
    );
  }

  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
        q.met ? "border-canopy/20 bg-canopy-pale" : "border-amber/30 bg-amber/5"
      }`}
    >
      <Icon size={14} className={`${tone} shrink-0 mt-0.5`} />
      <div>
        <p className={`font-medium ${tone}`}>{q.met ? "Quorate" : "Not quorate"}</p>
        <p className="text-bark-muted">
          {q.present} of {q.eligible} eligible members here; {q.required} needed ({describeQuorumRule(rule)}).
        </p>
        {!q.met && (
          <p className="text-bark-muted mt-0.5">Decisions recorded now will be marked as not quorate.</p>
        )}
      </div>
    </div>
  );
}
