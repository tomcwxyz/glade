"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Pencil, Loader2, X } from "lucide-react";
import { getActionForEdit, updateAction } from "@/lib/action-actions";
import { OwnerSelect, type OwnerMember } from "@/components/owner-select";
import { TagPicker, type TagOption } from "@/components/tag-picker";

export function EditAction({
  actionId,
  members = [],
  tags = [],
  showLabel = false,
}: {
  actionId: string;
  members?: OwnerMember[];
  tags?: TagOption[];
  showLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Lazy-load the editable snapshot when the dialog opens.
  useEffect(() => {
    if (!open || loaded) return;
    let active = true;
    (async () => {
      const result = await getActionForEdit(actionId);
      if (!active) return;
      if ("error" in result) {
        setError(result.error as string);
        return;
      }
      setDescription(result.description);
      setOwnerName(result.ownerName);
      setOwnerIds(result.ownerUserIds);
      setTagIds(result.tagIds);
      setDueDate(result.dueDate);
      setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [open, loaded, actionId]);

  // Close on backdrop click / Escape.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function toggleOwner(id: string) {
    setOwnerIds((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  }

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleSave() {
    if (!description.trim()) return;
    startTransition(async () => {
      const result = await updateAction(
        actionId,
        description,
        ownerName || undefined,
        dueDate || undefined,
        ownerIds,
        tagIds
      );
      if (result && "error" in result) {
        setError(result.error as string);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={showLabel
          ? "inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-paper-warm px-2.5 text-xs font-medium text-bark-muted hover:border-canopy/30 hover:text-canopy transition-colors shrink-0"
          : "inline-flex h-8 w-8 items-center justify-center rounded-lg text-bark-muted hover:bg-paper-deep hover:text-canopy transition-colors shrink-0"
        }
        title="Edit action"
        aria-label="Edit action"
      >
        <Pencil size={14} />
        {showLabel && <span>Edit</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bark/20 backdrop-blur-sm p-4">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-action-title"
            className="bg-paper rounded-xl shadow-lg border border-border p-6 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="edit-action-title"
                className="text-lg font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Edit action
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-bark-muted hover:text-bark transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {error && <p className="text-sm text-earth mb-3">{error}</p>}

            {!loaded && !error ? (
              <div className="flex items-center justify-center py-8 text-bark-muted">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What needs to be done?"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-paper-warm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40 resize-none"
                  autoFocus
                />
                <OwnerSelect
                  members={members}
                  selectedIds={ownerIds}
                  onToggle={toggleOwner}
                  ownerName={ownerName}
                  onOwnerNameChange={setOwnerName}
                />
                <div>
                  <label htmlFor="edit-action-due" className="block text-xs text-bark-muted mb-1">
                    Due date
                  </label>
                  <input
                    id="edit-action-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="px-3 py-2 text-sm bg-paper-warm border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-canopy/40"
                  />
                </div>
                {tags.length > 0 && (
                  <TagPicker
                    tags={tags}
                    selectedIds={tagIds}
                    onToggle={toggleTag}
                    entityLabel="actions"
                    id="edit-action-tags"
                  />
                )}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isPending || !description.trim()}
                    className="px-4 py-2 text-sm font-medium bg-canopy text-paper rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm border border-border rounded-lg text-bark hover:bg-paper-warm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
