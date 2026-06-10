import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getMeetingSessionStateForUser,
  isMeetingSpaceMember,
  updateMeetingSessionState,
} from "@/lib/queries";
import { limitPoll, rateLimitedResponse } from "@/lib/rate-limit";
import type { MeetingSessionState } from "@/lib/meeting-state";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { state, expectedVersion } = body as {
    state: MeetingSessionState;
    expectedVersion: number;
  };

  if (!state || typeof expectedVersion !== "number") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Must be a member of the meeting's space to write its state.
  if (!(await isMeetingSpaceMember(id, session.user.id))) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const success = await updateMeetingSessionState(id, state, expectedVersion);

  if (!success) {
    return NextResponse.json(
      { error: "Version conflict — state was updated by another client" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
