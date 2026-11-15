/**
 * Field-level diffs for decision corrections. Every change to a recorded
 * decision is stored as a revision (who, when, why, and what changed).
 *
 * Kept free of app imports so it can be unit-tested with `node --test`.
 */

/** The editable fields of a decision, as plain display values. */
export type DecisionSnapshot = {
  title: string;
  description: string | null;
  rationale: string | null;
  outcome: string | null;
  method: string;
  participants: string[];
  date: Date;
  conditions: string | null;
  reviewDate: Date | null;
  isPublic: boolean;
  tags: string[];
};

export type RevisionChanges = Record<string, { from: unknown; to: unknown }>;

export const REVISION_FIELD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  rationale: "Rationale",
  outcome: "Outcome",
  method: "Method",
  participants: "Participants",
  date: "Decision date",
  conditions: "Conditions",
  reviewDate: "Review date",
  isPublic: "Visibility",
  tags: "Tags",
  status: "Status",
};

/** Normalise a value for comparison and storage: dates → YYYY-MM-DD, lists sorted, "" → null. */
function normalise(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return [...value].map(String).sort();
  if (typeof value === "string") return value.trim() === "" ? null : value.trim();
  return value ?? null;
}

/** Fields that differ between two snapshots, as { field: { from, to } }. */
export function diffDecision(before: DecisionSnapshot, after: DecisionSnapshot): RevisionChanges {
  const changes: RevisionChanges = {};
  for (const key of Object.keys(after) as (keyof DecisionSnapshot)[]) {
    const from = normalise(before[key]);
    const to = normalise(after[key]);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[key] = { from, to };
    }
  }
  return changes;
}

/** Short human-readable rendering of a stored revision value. */
export function formatRevisionValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (field === "isPublic") return value ? "Public" : "Hidden";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}
