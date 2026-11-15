/**
 * Quorum: how many eligible members must be present for a decision to be
 * validly taken. Eligible = admins and members (observers don't count).
 *
 * A rule covers the usual constitution wording:
 *   "at least 3"                       → { minCount: 3 }
 *   "one third of trustees"            → { fraction: 1/3 }
 *   "3 or one third, whichever greater" → { minCount: 3, fraction: 1/3 }
 *
 * Someone who left the room (e.g. over a conflict of interest) does not count
 * towards quorum for that decision; someone who abstained does.
 *
 * Kept free of app imports so it can be unit-tested with `node --test`.
 */

export type QuorumRule = { minCount: number | null; fraction: number | null };

export type QuorumStamp = {
  rule: QuorumRule;
  eligible: number;
  present: number;
  required: number;
  met: boolean;
};

const ELIGIBLE_ROLES = new Set(["admin", "member"]);

export function isQuorumEligibleRole(role: string | null | undefined): boolean {
  return !!role && ELIGIBLE_ROLES.has(role);
}

/** Read the quorum rule from space settings; null when none is set. */
export function parseQuorumRule(settings: unknown): QuorumRule | null {
  const raw = (settings as Record<string, unknown> | null)?.quorum as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return null;
  const minCount =
    typeof raw.minCount === "number" && Number.isFinite(raw.minCount) && raw.minCount >= 1
      ? Math.floor(raw.minCount)
      : null;
  const fraction =
    typeof raw.fraction === "number" && raw.fraction > 0 && raw.fraction <= 1 ? raw.fraction : null;
  if (minCount === null && fraction === null) return null;
  return { minCount, fraction };
}

/** Number of eligible members needed. */
export function quorumRequired(rule: QuorumRule, eligible: number): number {
  // Round the product first so 1/3 × 9 = 3, not 3.0000000000000004 → 4.
  const byFraction = rule.fraction ? Math.ceil(Math.round(rule.fraction * eligible * 1e9) / 1e9) : 0;
  return Math.max(rule.minCount ?? 0, byFraction, 1);
}

export function evaluateQuorum(rule: QuorumRule, eligible: number, present: number): QuorumStamp {
  const required = quorumRequired(rule, eligible);
  return { rule, eligible, present, required, met: present >= required };
}

/**
 * Eligible members counted present for a decision: linked participants who
 * are eligible members and didn't leave the room. Guests never count.
 */
export function countPresentForQuorum(
  participants: { userId: string | null; participation: string }[],
  eligibleUserIds: Set<string>
): number {
  const counted = new Set<string>();
  for (const p of participants) {
    if (p.userId && eligibleUserIds.has(p.userId) && p.participation !== "left_room") counted.add(p.userId);
  }
  return counted.size;
}

/** e.g. "3 or one third of members, whichever is greater". */
export function describeQuorumRule(rule: QuorumRule): string {
  const frac = rule.fraction ? describeFraction(rule.fraction) : null;
  if (rule.minCount && frac) return `${rule.minCount} or ${frac} of members, whichever is greater`;
  if (frac) return `${frac} of members`;
  return `${rule.minCount} member${rule.minCount === 1 ? "" : "s"}`;
}

function describeFraction(f: number): string {
  const named: [number, string][] = [
    [1 / 4, "a quarter"],
    [1 / 3, "one third"],
    [1 / 2, "half"],
    [2 / 3, "two thirds"],
    [3 / 4, "three quarters"],
    [1, "all"],
  ];
  const hit = named.find(([v]) => Math.abs(v - f) < 0.001);
  return hit ? hit[1] : `${Math.round(f * 100)}%`;
}
