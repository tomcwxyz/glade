"use client";

import { useState, useTransition } from "react";
import { updateSpaceSettings } from "@/lib/space-actions";
import { inputClass } from "@/lib/utils";
import { describeQuorumRule, quorumRequired, type QuorumRule } from "@/lib/quorum";

const FRACTIONS = [
  { value: "", label: "No proportion" },
  { value: String(1 / 4), label: "A quarter" },
  { value: String(1 / 3), label: "One third" },
  { value: String(1 / 2), label: "Half" },
  { value: String(2 / 3), label: "Two thirds" },
  { value: String(3 / 4), label: "Three quarters" },
];

/**
 * Quorum rule from the governing document: a minimum number, a proportion of
 * members, or whichever is greater. Stamped on every decision recorded.
 */
export function QuorumSetting({ rule, eligible }: { rule: QuorumRule | null; eligible: number }) {
  const [minCount, setMinCount] = useState(rule?.minCount ? String(rule.minCount) : "");
  const [fraction, setFraction] = useState(
    rule?.fraction ? FRACTIONS.find((f) => Math.abs(Number(f.value) - rule.fraction!) < 0.001)?.value ?? "" : ""
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const draft: QuorumRule = {
    minCount: Number(minCount) >= 1 ? Math.floor(Number(minCount)) : null,
    fraction: fraction ? Number(fraction) : null,
  };
  const hasRule = draft.minCount !== null || draft.fraction !== null;

  function save(next: QuorumRule | null) {
    setError(null);
    startTransition(async () => {
      const result = await updateSpaceSettings({ quorum: next });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <span className="block text-sm font-medium text-bark mb-1.5">Quorum</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-bark-muted">At least</span>
        <input
          type="number"
          min={1}
          aria-label="Minimum number of members"
          value={minCount}
          onChange={(e) => setMinCount(e.target.value)}
          placeholder="3"
          className={`${inputClass} w-20`}
        />
        <span className="text-sm text-bark-muted">members, or</span>
        <select
          aria-label="Proportion of members"
          value={fraction}
          onChange={(e) => setFraction(e.target.value)}
          className={`${inputClass} w-44`}
        >
          {FRACTIONS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-bark-muted">whichever is greater</span>
      </div>
      <p className="text-xs text-bark-muted mt-1.5">
        {hasRule
          ? `${describeQuorumRule(draft)}. With ${eligible} eligible member${eligible === 1 ? "" : "s"} today, that's ${quorumRequired(draft, eligible)}.`
          : "Set this from your governing document. "}
        {" "}Admins and members count; observers and guests don&apos;t. Anyone who leaves the room for a decision isn&apos;t counted for it.
      </p>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          disabled={isPending || !hasRule}
          onClick={() => save(draft)}
          className="px-3 py-1.5 text-sm font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          Save quorum
        </button>
        {rule && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => save(null)}
            className="px-3 py-1.5 text-sm text-bark-muted hover:text-bark transition-colors"
          >
            Remove
          </button>
        )}
      </div>
      {error && <p className="text-xs text-earth mt-1">{error}</p>}
    </div>
  );
}
