"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMeeting } from "@/lib/meeting-actions";

export function DeleteMeeting({ meetingId }: { meetingId: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm text-earth hover:text-paper hover:bg-earth border border-earth/30 rounded-lg transition-colors"
      >
        <Trash2 size={14} />
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-bark-muted">Delete this meeting?</span>
      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await deleteMeeting(meetingId);
          })
        }
        className="px-3 py-1.5 text-sm font-medium text-paper bg-earth rounded-lg hover:bg-earth/90 transition-colors disabled:opacity-50"
      >
        {isPending ? "Deleting..." : "Yes, delete"}
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        className="px-2 py-1.5 text-sm text-bark-muted hover:text-bark transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
