import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { actions, decisions, topics, proposals } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { limitApi, rateLimitedResponse } from "@/lib/rate-limit";
import { parseActionMetadata, parseOptionalDate, parseOptionalText } from "@/lib/action-api";

const ACTION_STATUSES = ["open", "in_progress", "complete", "overdue", "superseded"] as const;
type ActionStatus = (typeof ACTION_STATUSES)[number];

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
  const rawStatus = searchParams.get("status");
  const statusFilter = rawStatus && ACTION_STATUSES.includes(rawStatus as ActionStatus)
    ? rawStatus as ActionStatus
    : null;
  if (rawStatus && !statusFilter) {
    return NextResponse.json({ error: "Invalid action status" }, { status: 422, headers: { "Cache-Control": "no-store" } });
  }
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  // Build where conditions
  const conditions = [eq(actions.spaceId, auth.spaceId)];
  if (statusFilter) {
    conditions.push(
      eq(actions.status, statusFilter)
    );
  }

  const rows = await db
    .select({
      id: actions.id,
      description: actions.description,
      status: actions.status,
      dueDate: actions.dueDate,
      ownerName: actions.ownerName,
      metadata: actions.metadata,
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
    metadata: r.metadata,
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
  try {
    const description = parseOptionalText(value.description, "Description", 2000);
    if (!description) return { error: "Description is required" as const };
    const ownerName = parseOptionalText(value.ownerName, "Owner name", 255);
    const dueDate = parseOptionalDate(value.dueDate, "due date");
    const metadata = parseActionMetadata(value.metadata);
    return { data: { description, ownerName, dueDate, metadata } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid action" };
  }
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
      metadata: parsed.data.metadata ?? {},
    })
    .returning({
      id: actions.id,
      description: actions.description,
      ownerName: actions.ownerName,
      dueDate: actions.dueDate,
      status: actions.status,
      isPublic: actions.isPublic,
      metadata: actions.metadata,
    });

  return NextResponse.json(
    { data: action },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
