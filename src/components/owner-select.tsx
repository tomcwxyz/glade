"use client";

import { Check } from "lucide-react";

export interface OwnerMember {
  id: string; // users.id
  name: string;
}

/**
 * Action owner picker: choose any number of space members, plus an optional
 * free-text "other owner" for non-members. Members are stored in action_owners;
 * the free-text value maps to actions.ownerName.
 */
export function OwnerSelect({
  members,
  selectedIds,
  onToggle,
  ownerName,
  onOwnerNameChange,
}: {
  members: OwnerMember[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  ownerName: string;
  onOwnerNameChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      {members.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => {
            const selected = selectedIds.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onToggle(m.id)}
                aria-pressed={selected}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  selected
                    ? "bg-canopy-pale text-canopy border-canopy/30"
                    : "bg-paper text-bark-muted border-border hover:border-canopy/30 hover:text-bark"
                }`}
              >
                {selected && <Check size={11} />}
                {m.name}
              </button>
            );
          })}
        </div>
      )}
      <input
        type="text"
        value={ownerName}
        onChange={(e) => onOwnerNameChange(e.target.value)}
        placeholder={members.length > 0 ? "Other owner (non-member)" : "Owner"}
        className="w-full px-3 py-2 text-sm bg-paper border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40"
      />
    </div>
  );
}
