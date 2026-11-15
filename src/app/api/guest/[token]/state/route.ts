import { NextRequest, NextResponse } from "next/server";
import { resolveGuestToken } from "@/lib/queries";
import { limitPoll, rateLimitedResponse } from "@/lib/rate-limit";
import { guestParticipantId } from "@/lib/guests";

/**
 * Live meeting state for an invited guest, authorised by their secret token.
 * Same shape as the member poll, plus who the guest is.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await resolveGuestToken(token);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rl = await limitPoll(`guest:${row.id}`);
  if (!rl.success) return rateLimitedResponse(rl);

  return NextResponse.json(
    {
      state: row.status === "in_progress" ? row.sessionState : null,
      status: row.status,
      presence: [],
      guest: { participantId: guestParticipantId(row.id), name: row.name, canVote: row.canVote },
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
