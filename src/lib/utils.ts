import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateRelative(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }
  return formatDate(dateString);
}

// Shared form field classes — used across all form components
export const inputClass =
  "w-full px-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

export const textareaClass = `${inputClass} resize-none`;

export function formatDateMonth(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

// ============================================================
// Tag colour palette — shared across the Tag Manager and every
// tag picker/chip so the colour set stays in one place.
// ============================================================

export const TAG_COLORS: { value: string; label: string }[] = [
  { value: "canopy", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "earth", label: "Earth" },
  { value: "sky", label: "Sky" },
  { value: "moss", label: "Moss" },
  { value: "plum", label: "Plum" },
  { value: "teal", label: "Teal" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
];

// Colour token → background dot class. Literal strings so Tailwind's JIT
// keeps the utilities; bare tokens map to the matching @theme colour.
const TAG_DOT_CLASS: Record<string, string> = {
  canopy: "bg-canopy",
  amber: "bg-amber",
  earth: "bg-earth",
  sky: "bg-sky",
  moss: "bg-moss",
  plum: "bg-plum",
  teal: "bg-teal",
  rose: "bg-rose",
  slate: "bg-slate",
};

export function tagDotClass(color: string | null | undefined): string {
  return (color && TAG_DOT_CLASS[color]) || "bg-bark-muted";
}

export type ActionStatus = "open" | "in_progress" | "complete" | "overdue" | "superseded";

/**
 * Derive an action's effective status at read time. `overdue` is never stored —
 * an open/in-progress action whose due date has passed is overdue. Computed on
 * read so badges stay correct without a background job.
 */
export function deriveActionStatus(
  status: ActionStatus,
  dueDate: Date | string | null
): ActionStatus {
  if (status !== "open" && status !== "in_progress") return status;
  if (!dueDate) return status;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  return due.getTime() < Date.now() ? "overdue" : status;
}
