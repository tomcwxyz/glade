"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, UserPlus, X } from "lucide-react";
import { inviteMeetingGuest, revokeMeetingGuest } from "@/lib/guest-actions";

type Guest = { id: string; name: string; label: string | null; canVote: boolean };

/**
 * Invite named guests (co-opted members, staff, advisers) to take part in the
 * live meeting without an account. Each gets a personal link, shown once.
 */
export function GuestInvites({ meetingId, guests }: { meetingId: string; guests: Guest[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [canVote, setCanVote] = useState(false);
  const [link, setLink] = useState<{ name: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function invite() {
    setError(null);
    startTransition(async () => {
      const result = await inviteMeetingGuest(meetingId, name, label, canVote);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setLink({ name, url: `${window.location.origin}/guest/${result.token}` });
      setCopied(false);
      setName("");
      setLabel("");
      setCanVote(false);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-3">Guests</h2>

      {guests.length === 0 && !link && (
        <p className="text-xs text-bark-muted mb-2">
          Invite people without an account (advisers, staff, co-opted members) to take part in the live meeting.
        </p>
      )}

      {guests.length > 0 && (
        <ul className="space-y-1.5 mb-2">
          {guests.map((g) => (
            <li key={g.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 min-w-0 truncate text-bark">
                {g.name}
                <span className="text-xs text-bark-muted">
                  {g.label ? ` · ${g.label}` : ""}
                  {g.canVote ? " · can vote" : " · advises"}
                </span>
              </span>
              <button
                type="button"
                disabled={isPending}
                aria-label={`Withdraw ${g.name}'s link`}
                onClick={() =>
                  startTransition(async () => {
                    await revokeMeetingGuest(meetingId, g.id);
                    router.refresh();
                  })
                }
                className="p-1 text-bark-muted hover:text-earth"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {link && (
        <div className="rounded-lg border border-amber/30 bg-amber/5 p-2.5 mb-2 text-xs">
          <p className="text-bark mb-1">
            Link for {link.name}. Copy it now: it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-1.5">
            <input readOnly value={link.url} aria-label="Guest link" className="flex-1 min-w-0 px-2 py-1 border border-border rounded bg-paper text-bark" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(link.url).catch(() => {});
                setCopied(true);
              }}
              className="p-1.5 border border-border rounded text-bark-muted hover:text-bark"
              aria-label="Copy link"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      )}

      {open ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            invite();
          }}
        >
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            aria-label="Guest name"
            className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-paper"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Role, e.g. Finance adviser"
            aria-label="Guest role"
            className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-paper"
          />
          <label className="flex items-start gap-2 text-xs text-bark">
            <input type="checkbox" checked={canVote} onChange={(e) => setCanVote(e.target.checked)} className="mt-0.5" />
            Can object and vote (e.g. a co-opted member with voting rights). Otherwise they can ask, react, advise and speak.
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg disabled:opacity-50"
            >
              Create link
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-bark-muted hover:text-bark">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light"
        >
          <UserPlus size={13} />
          Invite a guest
        </button>
      )}

      {error && <p className="text-xs text-earth mt-1">{error}</p>}
    </section>
  );
}
