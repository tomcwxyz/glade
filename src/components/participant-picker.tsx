"use client";

import { useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { inputClass } from "@/lib/utils";
import {
  PARTICIPATION,
  PARTICIPATION_LABELS,
  type Participation,
  type ParticipantInput,
} from "@/lib/participants";

type Member = { id: string; name: string };

type Entry = {
  userId: string | null;
  name: string;
  participation: Participation;
  interest: string;
};

/**
 * Pick who took part in a decision: space members (linked) or guests (named),
 * with how each took part and any interest they declared. Submits a JSON array
 * as the `participants` form field (see parseParticipantsField).
 */
export function ParticipantPicker({
  members,
  initial = [],
  name = "participants",
}: {
  members: Member[];
  initial?: ParticipantInput[];
  name?: string;
}) {
  const [entries, setEntries] = useState<Entry[]>(() =>
    initial.map((p) => ({
      userId: p.userId ?? null,
      name: p.name,
      participation: p.participation ?? "participated",
      interest: p.interest ?? "",
    }))
  );
  const [guestName, setGuestName] = useState("");

  const selectedIds = new Set(entries.map((e) => e.userId).filter(Boolean));

  function toggleMember(m: Member) {
    setEntries((prev) =>
      selectedIds.has(m.id)
        ? prev.filter((e) => e.userId !== m.id)
        : [...prev, { userId: m.id, name: m.name, participation: "participated", interest: "" }]
    );
  }

  function addGuest() {
    const trimmed = guestName.trim();
    if (!trimmed) return;
    const member = members.find((m) => m.name.toLowerCase() === trimmed.toLowerCase());
    if (member) {
      if (!selectedIds.has(member.id)) toggleMember(member);
    } else if (!entries.some((e) => !e.userId && e.name.toLowerCase() === trimmed.toLowerCase())) {
      setEntries((prev) => [...prev, { userId: null, name: trimmed, participation: "participated", interest: "" }]);
    }
    setGuestName("");
  }

  function update(index: number, patch: Partial<Entry>) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function remove(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  const value = JSON.stringify(
    entries.map((e) => ({
      userId: e.userId,
      name: e.name,
      participation: e.participation,
      interest: e.interest.trim() || null,
    }))
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />

      {members.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Members who took part">
          {members.map((m) => {
            const on = selectedIds.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleMember(m)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  on
                    ? "bg-canopy-pale text-canopy border-canopy/30"
                    : "bg-paper text-bark-muted border-border hover:border-canopy/30 hover:text-bark"
                }`}
              >
                {on && <Check size={12} />}
                {m.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          aria-label="Add a guest by name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addGuest();
            }
          }}
          placeholder="Add a guest (adviser, staff, co-opted member)"
          className={inputClass}
        />
        <button
          type="button"
          onClick={addGuest}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors shrink-0"
        >
          <UserPlus size={14} />
          Add
        </button>
      </div>

      {entries.length > 0 && (
        <ul className="border border-border rounded-lg divide-y divide-border">
          {entries.map((e, i) => (
            <li key={`${e.userId ?? "g"}-${e.name}`} className="px-3 py-2.5 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-bark font-medium flex-1 min-w-32">
                  {e.name}
                  {!e.userId && <span className="ml-1.5 text-[0.6875rem] font-normal text-bark-muted">guest</span>}
                </span>
                <select
                  aria-label={`How ${e.name} took part`}
                  value={e.participation}
                  onChange={(ev) => update(i, { participation: ev.target.value as Participation })}
                  className="px-2 py-1 text-xs border border-border rounded-md bg-paper text-bark"
                >
                  {PARTICIPATION.map((p) => (
                    <option key={p} value={p}>
                      {PARTICIPATION_LABELS[p]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${e.name}`}
                  className="p-1 text-bark-muted hover:text-earth transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                aria-label={`Interest declared by ${e.name}`}
                value={e.interest}
                onChange={(ev) => update(i, { interest: ev.target.value })}
                placeholder="Interest declared (if any)"
                className="w-full px-2 py-1 text-xs border border-border rounded-md bg-paper text-bark placeholder:text-bark-muted/60"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
