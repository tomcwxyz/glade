"use client";

import { useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { addProposalToAgenda } from "@/lib/meeting-actions";

interface Meeting {
  id: string;
  title: string;
  date: string;
}

export function AddToAgenda({
  proposalId,
  meetings,
}: {
  proposalId: string;
  meetings: Meeting[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(meetingId: string) {
    setLoading(true);
    setError(null);
    const result = await addProposalToAgenda(proposalId, meetingId);
    setLoading(false);
    if (result && "error" in result) {
      setError(result.error ?? "Something went wrong");
    } else {
      setDone(meetingId);
      setTimeout(() => {
        setDone(null);
        setOpen(false);
      }, 1500);
    }
  }

  if (meetings.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
      >
        <CalendarPlus size={14} />
        Add to agenda
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-paper border border-border rounded-lg shadow-lg z-10 py-1 max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs text-bark-muted font-medium border-b border-border">
            Choose a meeting
          </div>
          {meetings.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleAdd(m.id)}
              disabled={loading || done === m.id}
              className="w-full text-left px-3 py-2 hover:bg-paper-warm transition-colors disabled:opacity-50 flex items-center justify-between"
            >
              <div>
                <span className="text-sm text-bark block truncate">{m.title}</span>
                <span className="text-xs text-bark-muted">
                  {new Date(m.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {done === m.id && <Check size={14} className="text-canopy shrink-0" />}
              {loading && done !== m.id && <Loader2 size={14} className="animate-spin text-bark-muted shrink-0" />}
            </button>
          ))}
          {error && (
            <p className="px-3 py-2 text-xs text-earth">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
