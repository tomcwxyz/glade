"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDecision } from "@/lib/decision-actions";

export function DeleteDecision({
  decisionId,
  decisionNumber,
}: {
  decisionId: string;
  decisionNumber: number;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirmed = confirmValue === String(decisionNumber);

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
    <div className="flex items-center gap-2">
      <input
        type="text"
        placeholder={`Type ${decisionNumber} to confirm`}
        value={confirmValue}
        onChange={(e) => setConfirmValue(e.target.value)}
        className="w-40 px-2 py-1.5 text-sm border border-earth/30 rounded-lg bg-paper focus:outline-none focus:ring-1 focus:ring-earth/50"
      />
      <button
        disabled={!confirmed || isPending}
        onClick={() =>
          startTransition(async () => {
            await deleteDecision(decisionId);
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
        }}
        className="px-2 py-1.5 text-sm text-bark-muted hover:text-bark transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
