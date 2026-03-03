"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteAction } from "@/lib/action-actions";

export function DeleteAction({ actionId }: { actionId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="p-1 text-bark-muted/40 hover:text-earth transition-colors rounded"
        title="Delete action"
      >
        <Trash2 size={13} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await deleteAction(actionId);
          })
        }
        className="px-2 py-0.5 text-xs font-medium text-paper bg-earth rounded hover:bg-earth/90 transition-colors disabled:opacity-50"
      >
        {isPending ? "..." : "Delete"}
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        className="px-1 py-0.5 text-xs text-bark-muted hover:text-bark transition-colors"
      >
        No
      </button>
    </div>
  );
}
