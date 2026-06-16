"use client";

import { useState, useTransition } from "react";
import { createTag, renameTag, deleteTag } from "@/lib/tag-actions";
import { TAG_COLORS, tagDotClass } from "@/lib/utils";
import { Tag as TagIcon, Plus, Trash2, Check, X, Loader2, Pencil } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {TAG_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          aria-label={c.label}
          aria-pressed={value === c.value}
          className={`w-5 h-5 rounded-full ${tagDotClass(c.value)} transition-transform ${
            value === c.value ? "ring-2 ring-offset-1 ring-bark scale-110" : "opacity-60 hover:opacity-100"
          }`}
        />
      ))}
    </div>
  );
}

export function TagManager({ tags }: { tags: Tag[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("canopy");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("canopy");

  function run(fn: () => Promise<{ error?: string } | { success?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  function handleAdd() {
    if (!newName.trim()) return;
    run(async () => {
      const r = await createTag(newName, newColor);
      if (!("error" in r)) {
        setNewName("");
        setNewColor("canopy");
      }
      return r;
    });
  }

  function startEdit(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color ?? "canopy");
    setError(null);
  }

  function saveEdit() {
    run(async () => {
      const r = await renameTag(editingId!, editName, editColor);
      if (!("error" in r)) setEditingId(null);
      return r;
    });
  }

  return (
    <section>
      <div className="flex items-center gap-2.5 mb-1">
        <TagIcon size={18} className="text-bark-muted" />
        <h2
          className="text-xl font-light tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Tags
        </h2>
      </div>
      <p className="text-sm text-bark-muted mb-6">
        Themes for organising decisions. Available when logging or editing a decision.
      </p>

      {error && <p className="text-sm text-earth mb-3">{error}</p>}

      {/* Existing tags */}
      <div className="space-y-2 mb-5">
        {tags.length === 0 && (
          <p className="text-sm text-bark-muted">No tags yet — add your first below.</p>
        )}
        {tags.map((tag) =>
          editingId === tag.id ? (
            <div
              key={tag.id}
              className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-paper-warm border border-border"
            >
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 min-w-[8rem] px-2.5 py-1.5 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
              />
              <ColorPicker value={editColor} onChange={setEditColor} />
              <button
                type="button"
                onClick={saveEdit}
                disabled={pending || !editName.trim()}
                className="p-1.5 text-canopy hover:bg-canopy-pale rounded-lg disabled:opacity-50"
                aria-label="Save tag"
              >
                {pending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="p-1.5 text-bark-muted hover:bg-paper-deep rounded-lg"
                aria-label="Cancel"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div
              key={tag.id}
              className="flex items-center gap-2.5 p-2.5 rounded-lg bg-paper-warm border border-border"
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tagDotClass(tag.color)}`} />
              <span className="text-sm text-bark flex-1 truncate">{tag.name}</span>
              <button
                type="button"
                onClick={() => startEdit(tag)}
                className="p-1.5 text-bark-muted hover:text-bark hover:bg-paper-deep rounded-lg"
                aria-label={`Edit ${tag.name}`}
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => run(() => deleteTag(tag.id))}
                disabled={pending}
                className="p-1.5 text-bark-muted hover:text-earth hover:bg-earth/5 rounded-lg disabled:opacity-50"
                aria-label={`Delete ${tag.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        )}
      </div>

      {/* Add tag */}
      <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border border-dashed border-border">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder="New tag name"
          className="flex-1 min-w-[8rem] px-2.5 py-1.5 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
        />
        <ColorPicker value={newColor} onChange={setNewColor} />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || !newName.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>
    </section>
  );
}
