"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Plus, X } from "lucide-react";
import { linkToMeeting, unlinkFromMeeting } from "@/lib/meeting-link-actions";
import { formatDate } from "@/lib/utils";

type EntityType = "decision" | "action" | "document" | "proposal";

export function MeetingLinks({
  entityType,
  entityId,
  linkedMeetings,
  allMeetings,
}: {
  entityType: EntityType;
  entityId: string;
  linkedMeetings: { meetingId: string; title: string; date: string }[];
  allMeetings: { id: string; title: string; date: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [target, setTarget] = useState("");

  const available = allMeetings.filter(
    (m) => !linkedMeetings.some((lm) => lm.meetingId === m.id)
  );

  function handleAdd() {
    if (!target) return;
    startTransition(async () => {
      await linkToMeeting(target, entityType, entityId);
      setShowForm(false);
      setTarget("");
      router.refresh();
    });
  }

  function handleRemove(meetingId: string) {
    startTransition(async () => {
      await unlinkFromMeeting(meetingId, entityType, entityId);
      router.refresh();
    });
  }

  const selectClass =
    "w-full text-sm border border-border rounded-lg px-3 py-2 bg-paper text-bark focus:outline-none focus:ring-2 focus:ring-canopy/20";

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
          <Calendar size={14} />
          Meetings
        </h2>
        {available.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setShowForm(!showForm);
              setTarget("");
            }}
            className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
          >
            <Plus size={13} />
            Link meeting
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-3 bg-paper-warm rounded-lg border border-border space-y-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className={selectClass}
            aria-label="Select a meeting"
          >
            <option value="">Select a meeting...</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} ({formatDate(m.date)})
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!target || isPending}
              className="px-3 py-1.5 text-xs font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {linkedMeetings.length === 0 && !showForm && (
        <p className="text-sm text-bark-muted/60">Not linked to a meeting.</p>
      )}

      <div className="space-y-1">
        {linkedMeetings.map((m) => (
          <div
            key={m.meetingId}
            className="flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg group hover:bg-paper-warm transition-colors"
          >
            <Link
              href={`/meetings/${m.meetingId}`}
              className="flex-1 text-sm text-bark hover:text-canopy transition-colors min-w-0 truncate"
            >
              {m.title}
            </Link>
            <span className="text-xs text-bark-muted shrink-0">
              {formatDate(m.date)}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(m.meetingId)}
              className="opacity-0 group-hover:opacity-100 text-bark-muted hover:text-earth transition-all shrink-0"
              aria-label={`Unlink meeting ${m.title}`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
