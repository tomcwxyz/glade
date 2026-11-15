/**
 * Decision lifecycle rules. Status only moves forward:
 *
 *   decided → implemented → reviewed → learned
 *
 * - Members can mark a decision implemented by hand.
 * - "reviewed" is reached only by recording a review (recordDecisionReview).
 * - "learned" is reached only from "reviewed", once learnings are captured.
 *
 * Kept free of app imports so it can be unit-tested with `node --test`.
 */

export const DECISION_STAGES = ["decided", "implemented", "reviewed", "learned"] as const;
export type DecisionStatus = (typeof DECISION_STAGES)[number];

/** Statuses a decision may be recorded with when it is first created. */
export const INITIAL_STATUSES: readonly DecisionStatus[] = ["decided", "implemented"];

export function isDecisionStatus(value: unknown): value is DecisionStatus {
  return typeof value === "string" && (DECISION_STAGES as readonly string[]).includes(value);
}

/** Status to record a new decision with; anything past "implemented" falls back to "decided". */
export function initialStatus(requested: unknown): DecisionStatus {
  return isDecisionStatus(requested) && INITIAL_STATUSES.includes(requested) ? requested : "decided";
}

/**
 * The next status a member can move a decision to by hand, or null if the
 * next step has to come from the review flow (or there is none).
 */
export function nextManualStatus(
  current: DecisionStatus,
  opts: { hasLearnings: boolean }
): DecisionStatus | null {
  if (current === "decided") return "implemented";
  if (current === "reviewed" && opts.hasLearnings) return "learned";
  return null;
}

export function canTransitionManually(
  from: DecisionStatus,
  to: DecisionStatus,
  opts: { hasLearnings: boolean }
): boolean {
  return nextManualStatus(from, opts) === to;
}

/** Status after a review is recorded. Never moves a decision backwards. */
export function statusAfterReview(current: DecisionStatus): DecisionStatus {
  return current === "learned" ? "learned" : "reviewed";
}
