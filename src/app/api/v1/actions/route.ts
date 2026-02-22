import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { actions, decisions } from "@/db/schema";
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

  // Build where conditions
  const conditions = [eq(actions.spaceId, auth.spaceId)];
  if (statusFilter) {
    conditions.push(
      eq(actions.status, statusFilter as "open" | "complete")
    );
  }

  const rows = await db
    .select({
      id: actions.id,
      description: actions.description,
      status: actions.status,
      dueDate: actions.dueDate,
      ownerName: actions.ownerName,
      decisionTitle: decisions.title,
      decisionNumber: decisions.number,
    })
    .from(actions)
    .innerJoin(decisions, eq(decisions.id, actions.decisionId))
    .where(and(...conditions))
    .orderBy(desc(actions.createdAt));

  return NextResponse.json(
    { data: rows },
    { headers: { "Cache-Control": "no-store" } }
  );
}
