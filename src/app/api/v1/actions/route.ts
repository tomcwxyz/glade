import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { actions, decisions, topics, proposals } from "@/db/schema";
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
  const statusFilter = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

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
      topicTitle: topics.title,
      proposalTitle: proposals.title,
      decisionId: actions.decisionId,
      topicId: actions.topicId,
      proposalId: actions.proposalId,
    })
    .from(actions)
    .leftJoin(decisions, eq(decisions.id, actions.decisionId))
    .leftJoin(topics, eq(topics.id, actions.topicId))
    .leftJoin(proposals, eq(proposals.id, actions.proposalId))
    .where(and(...conditions))
    .orderBy(desc(actions.createdAt))
    .limit(limit)
    .offset(offset);

  const data = rows.map((r) => ({
    id: r.id,
    description: r.description,
    status: r.status,
    dueDate: r.dueDate,
    ownerName: r.ownerName,
    // Backwards-compatible fields (now nullable)
    decisionTitle: r.decisionTitle,
    decisionNumber: r.decisionNumber,
    // New fields
    parentType: r.decisionId ? "decision" : r.topicId ? "topic" : r.proposalId ? "proposal" : null,
    parentTitle: r.decisionId
      ? r.decisionTitle
      : r.topicId
        ? r.topicTitle
        : r.proposalId
          ? r.proposalTitle
          : null,
  }));

  return NextResponse.json(
    { data, meta: { limit, offset, count: data.length } },
    { headers: { "Cache-Control": "no-store" } }
  );
}


function parseCreateActionBody(body: unknown) {
  if (!body || typeof body !== "object") return { error: "Invalid action" as const };
  const value = body as Record<string, unknown>;
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const ownerName = typeof value.ownerName === "string" ? value.ownerName.trim() : undefined;
  const dueDateRaw = typeof value.dueDate === "string" ? value.dueDate.trim() : undefined;

  if (!description) return { error: "Description is required" as const };
  if (description.length > 2000) return { error: "Description must be 2000 characters or fewer" as const };
  if (ownerName && ownerName.length > 255) return { error: "Owner name must be 255 characters or fewer" as const };

  let dueDate: Date | undefined;
  if (dueDateRaw) {
    dueDate = new Date(dueDateRaw);
    if (Number.isNaN(dueDate.getTime())) return { error: "Invalid due date" as const };
  }

  return { data: { description, ownerName, dueDate } };
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (auth.permissions !== "read_write") {
    return NextResponse.json(
      { error: "API key does not have write permission" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const rl = await limitApi(auth.spaceId);
  if (!rl.success) return rateLimitedResponse(rl);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const parsed = parseCreateActionBody(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 422, headers: { "Cache-Control": "no-store" } }
    );
  }

  const [action] = await db
    .insert(actions)
    .values({
      spaceId: auth.spaceId,
      description: parsed.data.description,
      ownerName: parsed.data.ownerName || null,
      dueDate: parsed.data.dueDate || null,
      status: "open",
      isPublic: false,
    })
    .returning({
      id: actions.id,
      description: actions.description,
      ownerName: actions.ownerName,
      dueDate: actions.dueDate,
      status: actions.status,
      isPublic: actions.isPublic,
    });

  return NextResponse.json(
    { data: action },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
