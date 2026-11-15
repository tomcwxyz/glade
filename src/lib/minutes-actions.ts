"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { meetings } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { appendMinutesHistory } from "@/lib/minutes";

/**
 * Approve a meeting's minutes (chair sign-off). Allowed for admins, or for the
 * facilitator of the meeting at which they are being approved. The notes are
 * frozen as approved and the meeting is locked against edits.
 */
export async function approveMinutes(meetingId: string, approvedInMeetingId?: string | null) {
  const auth = await requireSpaceRole("member");
  if ("error" in auth) return auth;
  const { user, space, role } = auth;

  const [meeting] = await db
    .select({
      id: meetings.id,
      date: meetings.date,
      notes: meetings.notes,
      metadata: meetings.metadata,
      approvedAt: meetings.minutesApprovedAt,
    })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)))
    .limit(1);
  if (!meeting) return { error: "Meeting not found" };
  if (meeting.approvedAt) return { error: "These minutes are already approved" };
  if (meeting.date.getTime() > Date.now()) return { error: "This meeting hasn't happened yet" };

  let approvingMeeting: { id: string; facilitatorId: string | null; createdBy: string | null } | null = null;
  if (approvedInMeetingId) {
    const [m] = await db
      .select({ id: meetings.id, date: meetings.date, facilitatorId: meetings.facilitatorId, createdBy: meetings.createdBy })
      .from(meetings)
      .where(and(eq(meetings.id, approvedInMeetingId), eq(meetings.spaceId, space.id)))
      .limit(1);
    if (!m) return { error: "Approving meeting not found" };
    if (m.id === meeting.id || m.date.getTime() <= meeting.date.getTime()) {
      return { error: "Minutes are approved at a later meeting" };
    }
    approvingMeeting = m;
  }

  const isChairOfApprovingMeeting =
    !!approvingMeeting && (approvingMeeting.facilitatorId ?? approvingMeeting.createdBy) === user.id;
  if (role !== "admin" && !isChairOfApprovingMeeting) {
    return { error: "Only an admin, or the chair of the meeting approving them, can sign off minutes" };
  }

  const now = new Date();
  const byName = user.name ?? user.email ?? null;
  const updated = await db
    .update(meetings)
    .set({
      minutesApprovedAt: now,
      minutesApprovedBy: user.id,
      minutesApprovedByName: byName,
      minutesApprovedInMeetingId: approvingMeeting?.id ?? null,
      minutesApprovedText: meeting.notes,
      metadata: appendMinutesHistory(meeting.metadata, {
        event: "approved",
        at: now.toISOString(),
        by: user.id,
        byName,
        inMeetingId: approvingMeeting?.id ?? null,
      }),
      updatedAt: now,
    })
    // Only if still unapproved, so two chairs clicking at once can't both sign.
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id), isNull(meetings.minutesApprovedAt)))
    .returning({ id: meetings.id });
  if (updated.length === 0) return { error: "These minutes are already approved" };

  revalidatePath(`/meetings/${meetingId}`);
  if (approvingMeeting) revalidatePath(`/meetings/${approvingMeeting.id}`);
  return { success: true };
}

/** Reopen approved minutes for correction (admins only, with a reason). */
export async function reopenMinutes(meetingId: string, reason: string) {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  const { user, space } = auth;

  const why = reason?.trim();
  if (!why) return { error: "Say why the minutes are being reopened" };

  const [meeting] = await db
    .select({ id: meetings.id, metadata: meetings.metadata })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id), isNotNull(meetings.minutesApprovedAt)))
    .limit(1);
  if (!meeting) return { error: "Approved minutes not found" };

  const now = new Date();
  await db
    .update(meetings)
    .set({
      minutesApprovedAt: null,
      minutesApprovedBy: null,
      minutesApprovedByName: null,
      minutesApprovedInMeetingId: null,
      minutesApprovedText: null,
      metadata: appendMinutesHistory(meeting.metadata, {
        event: "reopened",
        at: now.toISOString(),
        by: user.id,
        byName: user.name ?? user.email ?? null,
        reason: why.slice(0, 1000),
      }),
      updatedAt: now,
    })
    .where(and(eq(meetings.id, meetingId), eq(meetings.spaceId, space.id)));

  revalidatePath(`/meetings/${meetingId}`);
  return { success: true };
}
