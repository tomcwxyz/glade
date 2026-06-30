import { NextResponse } from "next/server";
import { getMeetingSessionStateByShareToken } from "@/lib/queries";

// Public, token-scoped live-observer poll. No auth — the share token is the
// access grant. Deliberately NOT the id-based /api/meetings/[id]/state route,
// which is space-membership scoped.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await getMeetingSessionStateByShareToken(token);

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    { state: result.sessionState, status: result.status },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
