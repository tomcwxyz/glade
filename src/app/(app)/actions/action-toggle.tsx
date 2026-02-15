"use client";

import { useState } from "react";
import { updateActionStatus } from "@/lib/action-actions";
import { CheckCircle2, Circle, Clock, Loader2, TriangleAlert } from "lucide-react";

type ActionStatus = "open" | "in_progress" | "complete" | "overdue";

const STATUS_CYCLE: Record<ActionStatus, ActionStatus> = {
  open: "in_progress",
  in_progress: "complete",
  complete: "open",
  overdue: "complete",
};

const STATUS_ICONS: Record<ActionStatus, React.ReactNode> = {
  open: <Circle size={16} className="text-bark-muted" />,
  in_progress: <Clock size={16} className="text-amber" />,
  complete: <CheckCircle2 size={16} className="text-canopy" />,
  overdue: <TriangleAlert size={16} className="text-earth" />,
};

export function ActionToggle({
  actionId,
  initialStatus,
}: {
  actionId: string;
  initialStatus: ActionStatus;
}) {
  const [status, setStatus] = useState<ActionStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const nextStatus = STATUS_CYCLE[status];
    setLoading(true);
    setStatus(nextStatus);

    const result = await updateActionStatus(actionId, nextStatus);
    if (result?.error) {
      setStatus(status); // revert on error
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="mt-0.5 hover:scale-110 transition-transform disabled:opacity-50"
      title={`Click to mark as ${STATUS_CYCLE[status]}`}
    >
      {loading ? (
        <Loader2 size={16} className="text-bark-muted animate-spin" />
      ) : (
        STATUS_ICONS[status]
      )}
    </button>
  );
}
