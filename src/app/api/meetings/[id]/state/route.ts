import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMeetingSessionState, updateMeetingSessionState } from "@/lib/queries";
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
  const result = await getMeetingSessionState(id);

  if (!result) {
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

  const success = await updateMeetingSessionState(id, state, expectedVersion);

  if (!success) {
    return NextResponse.json(
      { error: "Version conflict — state was updated by another client" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true });
}
