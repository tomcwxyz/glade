"use client";

import { useState } from "react";
import { advanceProposalStatus } from "@/lib/proposal-actions";
import { ChevronRight, Loader2 } from "lucide-react";

const STATUS_FLOW: Record<string, { next: string; label: string }> = {
  draft: { next: "open_for_discussion", label: "Open for discussion" },
  open_for_discussion: { next: "ready_for_decision", label: "Ready for decision" },
  ready_for_decision: { next: "decided", label: "Mark decided" },
  decided: { next: "implemented", label: "Mark implemented" },
};

export function ProposalStatusAdvance({
  proposalId,
  currentStatus,
}: {
  proposalId: string;
  currentStatus: string;
}) {
  const [loading, setLoading] = useState(false);
  const flow = STATUS_FLOW[currentStatus];

  if (!flow) return null;

  async function handleAdvance() {
    setLoading(true);
    await advanceProposalStatus(
      proposalId,
      flow!.next as "draft" | "open_for_discussion" | "ready_for_decision" | "decided" | "implemented"
    );
    setLoading(false);
  }

  return (
    <button
      onClick={handleAdvance}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <>
          {flow.label}
          <ChevronRight size={14} />
        </>
      )}
    </button>
  );
}
