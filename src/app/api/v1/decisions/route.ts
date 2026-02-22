import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { decisions, decisionTags, tags } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { searchParams } = request.nextUrl;
  const statusFilter = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Build where conditions
  const conditions = [eq(decisions.spaceId, auth.spaceId)];
  if (statusFilter) {
    conditions.push(
      eq(
        decisions.status,
        statusFilter as "decided" | "implemented" | "reviewed" | "learned"
      )
    );
  }

  const rows = await db
    .select({
      id: decisions.id,
      number: decisions.number,
      title: decisions.title,
      date: decisions.date,
      status: decisions.status,
      method: decisions.method,
      outcome: decisions.outcome,
      reviewDate: decisions.reviewDate,
    })
    .from(decisions)
    .where(and(...conditions))
    .orderBy(desc(decisions.date), desc(decisions.number))
    .limit(limit)
    .offset(offset);

  // Fetch tags for returned decisions
  const ids = rows.map((d) => d.id);
  let tagMap = new Map<string, string[]>();

  if (ids.length > 0) {
    const allTags = await db
      .select({ decisionId: decisionTags.decisionId, name: tags.name })
      .from(decisionTags)
      .innerJoin(tags, eq(tags.id, decisionTags.tagId))
      .where(inArray(decisionTags.decisionId, ids));

    for (const t of allTags) {
      const arr = tagMap.get(t.decisionId) || [];
      arr.push(t.name);
      tagMap.set(t.decisionId, arr);
    }
  }

  const data = rows.map((d) => ({
    ...d,
    tags: tagMap.get(d.id) || [],
  }));

  return NextResponse.json(
    { data, meta: { limit, offset, count: data.length } },
    { headers: { "Cache-Control": "no-store" } }
  );
}
