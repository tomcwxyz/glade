/**
 * Minutes approval: a board approves the previous meeting's minutes at its
 * next meeting, and the chair signs them off. Approved minutes are locked;
 * an admin can reopen them with a reason. Every approval and reopening is
 * kept in the meeting's metadata.minutesHistory.
 *
 * Kept free of app imports so it can be unit-tested with `node --test`.
 */

export type MinutesHistoryEntry = {
  event: "approved" | "reopened";
  at: string;
  by: string | null;
  byName: string | null;
  /** For "approved": the meeting at which they were approved. */
  inMeetingId?: string | null;
  /** For "reopened": why. */
  reason?: string;
};

type MeetingRef = { id: string; date: Date; status: string; minutesApprovedAt: Date | null };

/**
 * Earlier meetings whose minutes are still to be approved, most recent first.
 * Only meetings that have happened (completed, or dated in the past) qualify.
 */
export function minutesAwaitingApproval(
  meetings: MeetingRef[],
  current: { id: string; date: Date },
  now: Date = new Date()
): MeetingRef[] {
  return meetings
    .filter(
      (m) =>
        m.id !== current.id &&
        !m.minutesApprovedAt &&
        m.date.getTime() < current.date.getTime() &&
        (m.status === "completed" || m.date.getTime() < now.getTime())
    )
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function isMinutesLocked(meeting: { minutesApprovedAt: Date | null }): boolean {
  return !!meeting.minutesApprovedAt;
}

/** Read the minutes history from meeting metadata, tolerating junk. */
export function minutesHistory(metadata: unknown): MinutesHistoryEntry[] {
  const raw = (metadata as Record<string, unknown> | null)?.minutesHistory;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is MinutesHistoryEntry =>
      !!e && typeof e === "object" && (e.event === "approved" || e.event === "reopened") && typeof e.at === "string"
  );
}

/** Metadata with one more history entry appended. */
export function appendMinutesHistory(metadata: unknown, entry: MinutesHistoryEntry): Record<string, unknown> {
  const base = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  return { ...base, minutesHistory: [...minutesHistory(metadata), entry] };
}
