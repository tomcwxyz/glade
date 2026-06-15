"use server";

import {
  getMeetingStartRecipients,
  createNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getReviewsDue,
  getSpaceMembers,
  getRecentNotificationUserIds,
} from "@/lib/queries";
import { requireUser, getCurrentSpace } from "@/lib/space";
import { isEmailConfigured, sendReviewDigestEmail } from "@/lib/email";

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

/**
 * Notify space members that decisions are overdue for review. Best-effort and
 * deduped: one summary notification per member per ~week. Fired lazily from the
 * dashboard (via after()) — there's no cron infrastructure.
 */
export async function notifyReviewsDue(spaceId: string, spaceName: string) {
  try {
    const due = await getReviewsDue(spaceId);
    if (due.length === 0) return;

    const members = await getSpaceMembers(spaceId);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentlyNotified = new Set(
      await getRecentNotificationUserIds(spaceId, "review_due", sevenDaysAgo)
    );
    const toNotify = members.filter((m) => !recentlyNotified.has(m.userId));
    if (toNotify.length === 0) return;

    const count = due.length;
    await createNotifications(
      toNotify.map((m) => ({
        userId: m.userId,
        spaceId,
        type: "review_due" as const,
        title: `${count} decision${count === 1 ? "" : "s"} due for review`,
        body: "Open the dashboard to review them.",
        link: "/dashboard",
      }))
    );

    if (isEmailConfigured()) {
      for (const m of toNotify) {
        if (!m.email) continue;
        try {
          await sendReviewDigestEmail(m.email, spaceName, count);
        } catch {
          // Best-effort — never block on email.
        }
      }
    }
  } catch {
    // Best-effort — review nudges must never break the dashboard.
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
