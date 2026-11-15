"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { approveMinutes } from "@/lib/minutes-actions";
import { advanceAgendaItem } from "@/lib/meeting-live-actions";
import { formatDate } from "@/lib/utils";
import type { MeetingSessionState } from "@/lib/meeting-state";

/**
 * Facilitator control for an "Approve minutes" agenda item: pick the earlier
 * meeting (defaults to the most recent unapproved one), sign off as chair,
 * and move on. The approval records this meeting as where it happened.
 */
export function MinutesApprovalControl({
  meetingId,
  candidates,
  mutate,
}: {
  meetingId: string;
  candidates: { id: string; title: string; date: string }[];
  mutate: (s: MeetingSessionState) => void;
}) {
  const [selected, setSelected] = useState(candidates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-bark-muted rounded-lg border border-border px-3 py-2.5">
        There are no earlier minutes waiting for approval. You can move on.
      </p>
    );
  }

  const chosen = candidates.find((c) => c.id === selected);

  return (
    <div className="rounded-lg border border-canopy/20 bg-canopy-pale/50 p-4 space-y-3">
      <label className="block text-sm text-bark">
        Minutes to approve
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="mt-1 block w-full px-2 py-1.5 text-sm border border-border rounded-md bg-paper"
        >
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({formatDate(c.date)})
            </option>
          ))}
        </select>
      </label>
      {chosen && (
        <Link href={`/meetings/${chosen.id}`} target="_blank" className="text-xs text-bark-muted underline underline-offset-2">
          Open these minutes in a new tab
        </Link>
      )}
      <p className="text-xs text-bark-muted">
        Approving signs them off in your name as chair and locks them against edits.
      </p>
      <button
        type="button"
        disabled={isPending || !chosen}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const approved = await approveMinutes(selected, meetingId);
            if ("error" in approved) {
              setError(approved.error);
              return;
            }
            const advanced = await advanceAgendaItem(meetingId, `Minutes of ${chosen!.title} approved`);
            if ("state" in advanced && advanced.state) mutate(advanced.state);
          })
        }
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
      >
        <Lock size={14} />
        {isPending ? "Approving..." : "Approve as a correct record"}
      </button>
      {error && <p className="text-xs text-earth">{error}</p>}
    </div>
  );
}
