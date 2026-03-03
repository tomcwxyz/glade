"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createAction } from "@/lib/action-actions";

export function AddAction({
  parentType,
  parentId,
  memberNames,
}: {
  parentType: "decision" | "topic" | "proposal";
  parentId: string;
  memberNames?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!description.trim()) return;
    startTransition(async () => {
      const result = await createAction(
        parentType,
        parentId,
        description,
        ownerName || undefined,
        dueDate || undefined
      );
      if (!result?.error) {
        setDescription("");
        setOwnerName("");
        setDueDate("");
        setOpen(false);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-bark-muted hover:text-canopy transition-colors"
      >
        <Plus size={14} />
        Add action
      </button>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-paper-warm">
      <div className="space-y-3">
        <div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 text-sm bg-paper border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSave();
              }
            }}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Owner"
              list="member-names"
              className="w-full px-3 py-2 text-sm bg-paper border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40"
            />
            {memberNames && memberNames.length > 0 && (
              <datalist id="member-names">
                {memberNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
          </div>
          <div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-2 text-sm bg-paper border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isPending || !description.trim()}
            className="px-4 py-1.5 text-sm font-medium bg-canopy text-paper rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setDescription("");
              setOwnerName("");
              setDueDate("");
            }}
            className="p-1.5 text-bark-muted hover:text-bark transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
