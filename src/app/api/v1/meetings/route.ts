import { NextRequest, NextResponse } from "next/server";
import { eq, desc, count, inArray } from "drizzle-orm";
import { db } from "@/db";
import { meetings, meetingAttendees } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { limitApi, rateLimitedResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rl = await limitApi(auth.spaceId);
  if (!rl.success) return rateLimitedResponse(rl);

  const { searchParams } = request.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const rows = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      date: meetings.date,
      type: meetings.type,
      status: meetings.status,
    })
    .from(meetings)
    .where(eq(meetings.spaceId, auth.spaceId))
    .orderBy(desc(meetings.date))
    .limit(limit)
    .offset(offset);

  // Fetch attendee counts
  const ids = rows.map((m) => m.id);
  let attendeeCountMap = new Map<string, number>();

  if (ids.length > 0) {
    const attendeeCounts = await db
      .select({
        meetingId: meetingAttendees.meetingId,
        count: count(),
      })
      .from(meetingAttendees)
      .where(inArray(meetingAttendees.meetingId, ids))
      .groupBy(meetingAttendees.meetingId);

    for (const a of attendeeCounts) {
      attendeeCountMap.set(a.meetingId, a.count);
    }
  }

  const data = rows.map((m) => ({
    ...m,
    attendeeCount: attendeeCountMap.get(m.id) || 0,
  }));

  return NextResponse.json(
    { data, meta: { limit, offset, count: data.length } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
