"use client";

import { useState, useTransition } from "react";
import { Hand } from "lucide-react";
import { declarationsFor, type MeetingSessionState } from "@/lib/meeting-state";
import { declareInterestInCurrentItem, withdrawInterestDeclaration } from "@/lib/meeting-live-actions";

const ACTION_LABELS = {
  abstain: "staying, not taking part",
  leave: "leaving the room",
} as const;

/**
 * Declarations of interest on the current agenda item: visible to everyone in
 * the meeting (they go into the record), and the place to make your own.
 */
export function DeclarationsPanel({
  meetingId,
  state,
  currentUserId,
  mutate,
}: {
  meetingId: string;
  state: MeetingSessionState;
  currentUserId: string;
  mutate: (s: MeetingSessionState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [interest, setInterest] = useState("");
  const [action, setAction] = useState<"abstain" | "leave">("leave");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const declarations = declarationsFor(state, state.currentAgendaItemIndex);
  const mine = declarations.find((d) => d.participantId === currentUserId);

  function run(fn: () => Promise<{ state?: MeetingSessionState } | { error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      if ("state" in result && result.state) mutate(result.state);
      setOpen(false);
      setInterest("");
    });
  }

  return (
    <section aria-label="Declarations of interest" className="rounded-lg border border-border bg-paper p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs uppercase tracking-wider text-bark-muted font-medium">Declarations of interest</h3>
        {!mine && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border rounded-lg text-bark-muted hover:text-bark hover:border-amber/40 transition-colors"
          >
            <Hand size={12} />
            Declare an interest
          </button>
        )}
      </div>

      {declarations.length === 0 && !open && (
        <p className="text-xs text-bark-muted mt-1">None declared for this item.</p>
      )}

      {declarations.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {declarations.map((d) => (
            <li key={d.participantId} className="text-xs">
              <span className="font-medium text-bark">{d.name}</span>
              <span className="text-bark-muted">: {d.interest} ({ACTION_LABELS[d.action]})</span>
            </li>
          ))}
        </ul>
      )}

      {mine && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-amber">
          You won&apos;t take part in this item&apos;s decision.
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => withdrawInterestDeclaration(meetingId))}
            className="text-bark-muted underline underline-offset-2 hover:text-bark disabled:opacity-50"
          >
            Withdraw declaration
          </button>
        </div>
      )}

      {open && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => declareInterestInCurrentItem(meetingId, interest, action));
          }}
        >
          <label className="block text-xs text-bark">
            What is the interest?
            <input
              type="text"
              required
              maxLength={500}
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              placeholder="e.g. I'm a trustee of the applicant"
              className="mt-1 w-full px-2 py-1.5 text-sm border border-border rounded-md bg-paper focus:outline-none focus:ring-1 focus:ring-canopy/40"
            />
          </label>
          <fieldset className="text-xs text-bark space-y-1">
            <legend className="mb-1">For this item I will be</legend>
            {(["leave", "abstain"] as const).map((a) => (
              <label key={a} className="flex items-center gap-2">
                <input type="radio" name="declare-action" checked={action === a} onChange={() => setAction(a)} />
                {a === "leave" ? "Leaving the room (not counted towards quorum)" : "Staying, but not taking part"}
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || !interest.trim()}
              className="px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
            >
              Declare
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-1.5 text-xs text-bark-muted hover:text-bark"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-earth mt-2">{error}</p>}
    </section>
  );
}
