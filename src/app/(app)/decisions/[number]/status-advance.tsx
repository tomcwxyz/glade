"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { updateDecisionStatus } from "@/lib/decision-actions";
import { isDecisionStatus, nextManualStatus, type DecisionStatus } from "@/lib/decision-lifecycle";

const LABELS: Record<DecisionStatus, string> = {
  decided: "Decided",
  implemented: "Implemented",
  reviewed: "Reviewed",
  learned: "Learned",
};

/**
 * The one forward step a member can take by hand. Reviewed comes from
 * "Record review"; learned needs learnings captured first.
 */
export function StatusAdvance({
  decisionId,
  currentStatus,
  hasLearnings,
}: {
  decisionId: string;
  currentStatus: string;
  hasLearnings: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isDecisionStatus(currentStatus)) return null;
  const nextStatus = nextManualStatus(currentStatus, { hasLearnings });
  if (!nextStatus) return null;

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-earth">{error}</span>}
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await updateDecisionStatus(decisionId, nextStatus);
            if (result && "error" in result) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-canopy bg-canopy-pale hover:bg-canopy/10 border border-canopy/20 rounded-lg transition-colors disabled:opacity-50"
      >
        {isPending ? "Updating..." : `Mark as ${LABELS[nextStatus]}`}
        {!isPending && <ChevronRight size={14} />}
      </button>
    </div>
  );
}
