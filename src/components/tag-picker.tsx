"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { tagDotClass } from "@/lib/utils";

export interface TagOption {
  id: string;
  name: string;
  color: string | null;
}

/**
 * Controlled tag selector — chip toggles shared by every entity form
 * (decisions, proposals, actions, topics, documents, meetings).
 *
 * Selection is owned by the parent (so callers can inject AI suggestions etc.).
 * Pass `name` to also emit a hidden input for forms that submit natively;
 * forms that build FormData manually can omit it and read the selection directly.
 */
export function TagPicker({
  tags,
  selectedIds,
  onToggle,
  entityLabel = "items",
  label = "Tags",
  optional = true,
  id = "tag-picker",
  name,
  action,
  error,
}: {
  tags: TagOption[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
  entityLabel?: string;
  label?: string;
  optional?: boolean;
  id?: string;
  name?: string;
  action?: ReactNode;
  error?: string | null;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-bark mb-1.5">
          {label}{" "}
          {optional && <span className="font-normal text-bark-muted">(optional)</span>}
        </label>
        {action}
      </div>

      {error && <p className="text-xs text-earth mb-2">{error}</p>}

      {tags.length > 0 ? (
        <div id={id} className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const isSelected = selectedIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => onToggle(tag.id)}
                aria-pressed={isSelected}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  isSelected
                    ? "bg-canopy-pale text-canopy border-canopy/30"
                    : "bg-paper-warm text-bark-muted border-border hover:border-canopy/30 hover:text-bark"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${tagDotClass(tag.color)}`} />
                {tag.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p id={id} className="text-sm text-bark-muted">
          No tags yet.{" "}
          <Link href="/settings" className="text-canopy hover:text-canopy-light underline">
            Create tags in Settings
          </Link>{" "}
          to group {entityLabel} by theme.
        </p>
      )}

      {name && <input type="hidden" name={name} value={selectedIds.join(",")} />}
    </div>
  );
}
