"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { deleteDecision, restoreDecision } from "@/lib/decision-actions";

/**
 * Admin-only soft delete. The decision is hidden but kept, with the reason,
 * and can be restored from its page.
 */
export function DeleteDecision({
  decisionId,
  decisionNumber,
}: {
  decisionId: string;
  decisionNumber: number;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirmed = confirmValue === String(decisionNumber) && reason.trim().length > 0;

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-earth hover:text-paper hover:bg-earth border border-earth/30 rounded-lg transition-colors"
      >
        <Trash2 size={14} />
        Delete
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        aria-label="Reason for deleting"
        placeholder="Reason (e.g. recorded twice)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-56 px-2 py-1.5 text-sm border border-earth/30 rounded-lg bg-paper focus:outline-none focus:ring-1 focus:ring-earth/50"
      />
      <input
        type="text"
        aria-label={`Type ${decisionNumber} to confirm`}
        placeholder={`Type ${decisionNumber} to confirm`}
        value={confirmValue}
        onChange={(e) => setConfirmValue(e.target.value)}
        className="w-40 px-2 py-1.5 text-sm border border-earth/30 rounded-lg bg-paper focus:outline-none focus:ring-1 focus:ring-earth/50"
      />
      <button
        disabled={!confirmed || isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await deleteDecision(decisionId, reason);
            if (result && "error" in result) setError(result.error);
          })
        }
        className="px-3 py-1.5 text-sm font-medium text-paper bg-earth rounded-lg hover:bg-earth/90 transition-colors disabled:opacity-50"
      >
        {isPending ? "Deleting..." : "Confirm"}
      </button>
      <button
        onClick={() => {
          setShowConfirm(false);
          setConfirmValue("");
          setReason("");
          setError(null);
        }}
        className="px-2 py-1.5 text-sm text-bark-muted hover:text-bark transition-colors"
      >
        Cancel
      </button>
      {error && <span className="w-full text-xs text-earth">{error}</span>}
    </div>
  );
}

export function RestoreDecision({ decisionId }: { decisionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-earth">{error}</span>}
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await restoreDecision(decisionId);
            if (result && "error" in result) {
              setError(result.error);
              return;
            }
            router.refresh();
          })
        }
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-canopy bg-canopy-pale hover:bg-canopy/10 border border-canopy/20 rounded-lg transition-colors disabled:opacity-50"
      >
        <RotateCcw size={14} />
        {isPending ? "Restoring..." : "Restore"}
      </button>
    </div>
  );
}
