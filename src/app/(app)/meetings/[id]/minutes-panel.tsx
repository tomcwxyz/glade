"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, LockOpen, PenLine } from "lucide-react";
import { approveMinutes, reopenMinutes } from "@/lib/minutes-actions";
import { formatDate } from "@/lib/utils";

type HistoryItem = {
  event: "approved" | "reopened";
  at: string;
  byName: string | null;
  reason?: string;
  inMeeting?: { id: string; title: string } | null;
};

/**
 * Minutes status for a meeting: approved and locked (with who signed off,
 * when, and at which meeting), or awaiting approval. Admins can approve here
 * directly, or reopen approved minutes with a reason.
 */
export function MinutesPanel({
  meetingId,
  isAdmin,
  isPast,
  approval,
  history,
}: {
  meetingId: string;
  isAdmin: boolean;
  isPast: boolean;
  approval: { at: string; byName: string | null; inMeeting: { id: string; title: string } | null } | null;
  history: HistoryItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState("");

  function run(fn: () => Promise<{ success?: boolean } | { error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setReopening(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-3">
        {approval ? <Lock size={13} /> : <PenLine size={13} />}
        Minutes
      </h2>

      {approval ? (
        <div className="rounded-lg border border-canopy/20 bg-canopy-pale px-3 py-2.5 text-sm">
          <p className="text-canopy font-medium">Approved and locked</p>
          <p className="text-xs text-bark-muted mt-0.5">
            Signed off by {approval.byName ?? "the chair"} on {formatDate(approval.at)}
            {approval.inMeeting && (
              <>
                {" "}at{" "}
                <Link href={`/meetings/${approval.inMeeting.id}`} className="underline underline-offset-2 hover:text-bark">
                  {approval.inMeeting.title}
                </Link>
              </>
            )}
            .
          </p>
        </div>
      ) : (
        <p className="text-sm text-bark-muted">
          {isPast
            ? "Not yet approved. Add an “Approve minutes” item to the next meeting's agenda, or an admin can sign them off here."
            : "Minutes can be approved once the meeting has happened."}
        </p>
      )}

      {isAdmin && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!approval && isPast && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => approveMinutes(meetingId))}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
            >
              <Lock size={12} />
              Approve minutes as chair
            </button>
          )}
          {approval && !reopening && (
            <button
              type="button"
              onClick={() => setReopening(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-bark-muted border border-border rounded-lg hover:text-bark transition-colors"
            >
              <LockOpen size={12} />
              Reopen for correction
            </button>
          )}
          {reopening && (
            <form
              className="flex flex-wrap items-center gap-2 w-full"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => reopenMinutes(meetingId, reason));
              }}
            >
              <input
                type="text"
                required
                aria-label="Why are the minutes being reopened?"
                placeholder="Why reopen? (recorded)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="flex-1 min-w-48 px-2 py-1.5 text-xs border border-border rounded-md bg-paper"
              />
              <button
                type="submit"
                disabled={isPending || !reason.trim()}
                className="px-3 py-1.5 text-xs font-medium text-paper bg-earth rounded-lg disabled:opacity-50"
              >
                Reopen
              </button>
              <button type="button" onClick={() => setReopening(false)} className="text-xs text-bark-muted hover:text-bark">
                Cancel
              </button>
            </form>
          )}
        </div>
      )}

      {error && <p className="text-xs text-earth mt-2">{error}</p>}

      {history.length > 0 && (
        <ul className="mt-3 space-y-1">
          {history.map((h, i) => (
            <li key={i} className="text-xs text-bark-muted">
              {formatDate(h.at)} · {h.event === "approved" ? "Approved" : "Reopened"}
              {h.byName ? ` by ${h.byName}` : ""}
              {h.inMeeting ? ` at ${h.inMeeting.title}` : ""}
              {h.reason ? `: “${h.reason}”` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
