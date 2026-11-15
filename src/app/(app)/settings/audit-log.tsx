"use client";

import Link from "next/link";
import { formatDateRelative } from "@/lib/utils";

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  decision: { label: "Decision", color: "bg-status-decided/10 text-status-decided" },
  meeting: { label: "Meeting", color: "bg-sky/10 text-sky" },
  action: { label: "Action", color: "bg-amber/10 text-amber" },
  proposal: { label: "Proposal", color: "bg-canopy-pale text-canopy" },
  document: { label: "Document", color: "bg-paper-deep text-bark-muted" },
  topic: { label: "Topic", color: "bg-earth/10 text-earth" },
};

type AuditEntry = {
  id: string;
  entityType: string;
  entityTitle: string;
  entityMeta: Record<string, unknown> | null;
  deletedByName: string | null;
  deletedAt: Date;
};

/** Soft-deleted decisions stay viewable (and restorable) by admins at their page. */
function restorableHref(entry: AuditEntry): string | null {
  if (entry.entityType !== "decision" || entry.entityMeta?.soft !== true) return null;
  const n = entry.entityMeta.number;
  return typeof n === "number" ? `/decisions/${n}` : null;
}

export function AuditLog({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <section>
        <h2
          className="text-lg font-medium tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Activity Log
        </h2>
        <p className="text-sm text-bark-muted mb-4">
          Recent deletions in this space.
        </p>
        <p className="text-sm text-bark-muted/60 italic">No deletions recorded yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2
        className="text-lg font-medium tracking-tight mb-1"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Activity Log
      </h2>
      <p className="text-sm text-bark-muted mb-4">
        Recent deletions in this space.
      </p>
      <div className="border border-border rounded-lg divide-y divide-border">
        {entries.map((entry) => {
          const badge = TYPE_BADGE[entry.entityType] || {
            label: entry.entityType,
            color: "bg-paper-deep text-bark-muted",
          };
          return (
            <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
              <span
                className={`shrink-0 px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${badge.color}`}
              >
                {badge.label}
              </span>
              <span className="flex-1 min-w-0 text-sm text-bark">
                {restorableHref(entry) ? (
                  <Link href={restorableHref(entry)!} className="block truncate hover:text-canopy underline-offset-2 hover:underline">
                    {entry.entityTitle}
                  </Link>
                ) : (
                  <span className="block truncate">{entry.entityTitle}</span>
                )}
                {typeof entry.entityMeta?.reason === "string" && (
                  <span className="block truncate text-xs text-bark-muted">{entry.entityMeta.reason}</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-bark-muted">
                {entry.deletedByName || "Unknown"}
              </span>
              <span className="shrink-0 text-xs text-bark-muted/60">
                {formatDateRelative(entry.deletedAt.toISOString())}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
