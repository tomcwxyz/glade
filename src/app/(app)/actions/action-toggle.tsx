"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateActionStatus } from "@/lib/action-actions";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MinusCircle,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";

type ActionStatus = "open" | "in_progress" | "complete" | "overdue" | "superseded";

const STATUS_CYCLE: Record<ActionStatus, ActionStatus> = {
  open: "in_progress",
  in_progress: "complete",
  complete: "open",
  overdue: "complete",
  superseded: "open",
};

const STATUS_LABELS: Record<ActionStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  complete: "Complete",
  overdue: "Overdue",
  superseded: "Superseded",
};

const STATUS_ICONS: Record<ActionStatus, React.ReactNode> = {
  open: <Circle size={18} className="text-bark-muted" />,
  in_progress: <Clock size={18} className="text-amber" />,
  complete: <CheckCircle2 size={18} className="text-canopy" />,
  overdue: <TriangleAlert size={18} className="text-earth" />,
  superseded: <MinusCircle size={18} className="text-bark-muted" />,
};

export function ActionToggle({
  actionId,
  initialStatus,
}: {
  actionId: string;
  initialStatus: ActionStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ActionStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const previousStatus = status;
    const nextStatus = STATUS_CYCLE[status];
    setLoading(true);
    setStatus(nextStatus);

    const result = await updateActionStatus(actionId, nextStatus);
    if (result?.error) {
      setStatus(previousStatus);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  const nextStatus = STATUS_CYCLE[status];

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-paper-deep transition-colors disabled:opacity-50"
      title={`Change status from ${STATUS_LABELS[status]} to ${STATUS_LABELS[nextStatus]}`}
      aria-label={`Action status: ${STATUS_LABELS[status]}. Change to ${STATUS_LABELS[nextStatus]}`}
    >
      {loading ? (
        <Loader2 size={18} className="text-bark-muted animate-spin" />
      ) : (
        STATUS_ICONS[status]
      )}
    </button>
  );
}

export function CompleteActionButton({
  actionId,
  initialStatus,
}: {
  actionId: string;
  initialStatus: ActionStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ActionStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  const isResolved = status === "complete" || status === "superseded";
  const nextStatus: ActionStatus = isResolved ? "open" : "complete";
  const label = isResolved ? "Reopen" : "Complete";

  async function handleClick() {
    const previousStatus = status;
    setLoading(true);
    setStatus(nextStatus);

    const result = await updateActionStatus(actionId, nextStatus);
    if (result?.error) {
      setStatus(previousStatus);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-paper-warm px-2.5 text-xs font-medium text-bark hover:border-canopy/30 hover:text-canopy transition-colors disabled:opacity-50"
      aria-label={`${label} action`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isResolved ? (
        <RotateCcw size={14} />
      ) : (
        <CheckCircle2 size={14} />
      )}
      <span>{label}</span>
    </button>
  );
}
