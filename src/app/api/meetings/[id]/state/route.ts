import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMeetingSessionStateForUser } from "@/lib/queries";
import { limitPoll, rateLimitedResponse } from "@/lib/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const rl = await limitPoll(`${session.user.id}:${id}`);
  if (!rl.success) return rateLimitedResponse(rl);

  const result = await getMeetingSessionStateForUser(id, session.user.id);

  if (!result) {
    // Either the meeting doesn't exist or the user isn't a member of its space.
    // Same 404 either way — don't leak existence cross-tenant.
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json(
    { state: result.sessionState, status: result.status },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

// No PUT: live state is changed only through the server actions in
// meeting-live-actions.ts, which check the caller's role for each change.
