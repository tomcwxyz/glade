import { createHash, randomBytes } from "node:crypto";

/**
 * Meeting guests: named people without accounts who take part in a live
 * meeting through their own secret link.
 *
 * Kept free of app imports so it can be unit-tested with `node --test`.
 */

/** Stages any guest may respond in: questions, reactions, advice. */
const NON_VOTING_STAGES = new Set(["clarify", "react", "consult"]);

/** A new guest token (shown once) and the hash we store. */
export function newGuestToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashGuestToken(token) };
}

export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Plausible token shape, checked before touching the database. */
export function isWellFormedGuestToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{32}$/.test(token);
}

/** The participant id a guest acts under in session state. */
export function guestParticipantId(guestId: string): string {
  return `guest:${guestId}`;
}

export function isGuestParticipantId(id: string): boolean {
  return id.startsWith("guest:");
}

/** Guests without a vote can ask, react and advise; voting guests can do anything. */
export function guestMayRespond(stage: string | undefined, canVote: boolean): boolean {
  return canVote || (!!stage && NON_VOTING_STAGES.has(stage));
}
