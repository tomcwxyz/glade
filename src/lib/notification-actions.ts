"use server";

import {
  getMeetingStartRecipients,
  createNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/queries";
import { requireUser, getCurrentSpace } from "@/lib/space";

/**
 * Notify a meeting's invited attendees (or all space members, if none were
 * invited) that the meeting has gone live. Best-effort: notification failures
 * must never block the meeting from starting, so callers ignore the result.
 */
export async function notifyMeetingStarted(
  meetingId: string,
  spaceId: string,
  starterId: string,
  starterName: string
) {
  try {
    const recipients = await getMeetingStartRecipients(meetingId, spaceId, starterId);
    if (!recipients || recipients.userIds.length === 0) return;

    await createNotifications(
      recipients.userIds.map((userId) => ({
        userId,
        spaceId,
        type: "meeting_started" as const,
        title: `${recipients.title} is now live`,
        body: `${starterName} started the meeting.`,
        link: `/meetings/${meetingId}/live`,
        referenceId: meetingId,
      }))
    );
  } catch {
    // Swallow — notifications are a courtesy, not part of the start transaction.
  }
}

/** Mark a single notification (belonging to the current user) as read. */
export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();
  await markNotificationRead(notificationId, user.id);
  return { success: true };
}

/** Mark all of the current user's notifications in the current space as read. */
export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return { error: "No space" };
  await markAllNotificationsRead(user.id, space.id);
  return { success: true };
}
