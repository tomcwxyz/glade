"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createAction } from "@/lib/action-actions";

interface ParentOption {
  type: "decision" | "topic" | "proposal";
  id: string;
  label: string;
}

export function AddActionWithParent({
  parents,
  memberNames,
}: {
  parents: ParentOption[];
  memberNames?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [parentKey, setParentKey] = useState("");
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedParent = parents.find(
    (p) => `${p.type}:${p.id}` === parentKey
  );

  function handleSave() {
    if (!description.trim() || !selectedParent) return;
    startTransition(async () => {
      const result = await createAction(
        selectedParent.type,
        selectedParent.id,
        description,
        ownerName || undefined,
        dueDate || undefined
      );
      if (!result?.error) {
        setDescription("");
        setOwnerName("");
        setDueDate("");
        setParentKey("");
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

  // Group parents by type
  const decisions = parents.filter((p) => p.type === "decision");
  const topicsList = parents.filter((p) => p.type === "topic");
  const proposals = parents.filter((p) => p.type === "proposal");

  return (
    <div className="border border-border rounded-lg p-4 bg-paper-warm">
      <div className="space-y-3">
        <div>
          <select
            value={parentKey}
            onChange={(e) => setParentKey(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-paper border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40"
          >
            <option value="">Link to...</option>
            {decisions.length > 0 && (
              <optgroup label="Decisions">
                {decisions.map((p) => (
                  <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            )}
            {topicsList.length > 0 && (
              <optgroup label="Topics">
                {topicsList.map((p) => (
                  <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            )}
            {proposals.length > 0 && (
              <optgroup label="Proposals">
                {proposals.map((p) => (
                  <option key={`${p.type}:${p.id}`} value={`${p.type}:${p.id}`}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-3 py-2 text-sm bg-paper border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40"
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
              list="member-names-actions"
              className="w-full px-3 py-2 text-sm bg-paper border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40"
            />
            {memberNames && memberNames.length > 0 && (
              <datalist id="member-names-actions">
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
            disabled={isPending || !description.trim() || !selectedParent}
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
              setParentKey("");
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
