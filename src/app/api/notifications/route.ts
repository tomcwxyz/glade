import { NextResponse } from "next/server";
import { requireUser, getCurrentSpace } from "@/lib/space";
import { getNotifications, getUnreadNotificationCount } from "@/lib/queries";

// Polled by the notification bell. Auth + current-space scoped; never cached.
export async function GET() {
  try {
    const user = await requireUser();
    const space = await getCurrentSpace();
    if (!space) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const [list, unreadCount] = await Promise.all([
      getNotifications(user.id, space.id, 20),
      getUnreadNotificationCount(user.id, space.id),
    ]);

    return NextResponse.json(
      { notifications: list, unreadCount },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}
