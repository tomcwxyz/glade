"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { updateDecisionStatus } from "@/lib/decision-actions";

const STAGES = ["decided", "implemented", "reviewed", "learned"] as const;
type Status = (typeof STAGES)[number];

const LABELS: Record<Status, string> = {
  decided: "Decided",
  implemented: "Implemented",
  reviewed: "Reviewed",
  learned: "Learned",
};

export function StatusAdvance({
  decisionId,
  currentStatus,
}: {
  decisionId: string;
  currentStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const currentIndex = STAGES.indexOf(currentStatus as Status);
  if (currentIndex === -1 || currentIndex >= STAGES.length - 1) return null;

  const nextStatus = STAGES[currentIndex + 1];

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await updateDecisionStatus(decisionId, nextStatus);
          router.refresh();
        })
      }
      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-canopy bg-canopy-pale hover:bg-canopy/10 border border-canopy/20 rounded-lg transition-colors disabled:opacity-50"
    >
      {isPending ? "Updating..." : `Mark as ${LABELS[nextStatus]}`}
      {!isPending && <ChevronRight size={14} />}
    </button>
  );
}
