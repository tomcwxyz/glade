import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { actions } from "@/db/schema";
import { authenticateApiKey } from "@/lib/api-auth";
import { limitApi, rateLimitedResponse } from "@/lib/rate-limit";
import { parseOptionalDate, parseOptionalText } from "@/lib/action-api";

const ACTION_STATUSES = ["open", "in_progress", "complete", "overdue"] as const;
type ActionStatus = (typeof ACTION_STATUSES)[number];

function parsePatch(body: unknown) {
  if (!body || typeof body !== "object") return { error: "Invalid action update" as const };
  const value = body as Record<string, unknown>;
  try {
    const description = parseOptionalText(value.description, "Description", 2000);
    const ownerName = parseOptionalText(value.ownerName, "Owner name", 255);
    const dueDate = parseOptionalDate(value.dueDate, "due date");
    let status: ActionStatus | undefined;
    if (value.status !== undefined) {
      if (typeof value.status !== "string" || !ACTION_STATUSES.includes(value.status as ActionStatus)) {
        return { error: "Invalid action status" as const };
      }
      status = value.status as ActionStatus;
    }

    if (
      description === undefined &&
      ownerName === undefined &&
      dueDate === undefined &&
      status === undefined
    ) {
      return { error: "No supported action fields supplied" as const };
    }

    if (description === null) return { error: "Description cannot be empty" as const };
    return { data: { description, ownerName, dueDate, status } };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid action update" };
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (auth.permissions !== "read_write") {
    return NextResponse.json(
      { error: "API key does not have write permission" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
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
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = parsePatch(body);
  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id } = await params;
  const now = new Date();
  const update: Partial<typeof actions.$inferInsert> = { updatedAt: now };
  if (parsed.data.description !== undefined) update.description = parsed.data.description;
  if (parsed.data.ownerName !== undefined) update.ownerName = parsed.data.ownerName;
  if (parsed.data.dueDate !== undefined) update.dueDate = parsed.data.dueDate;
  if (parsed.data.status !== undefined) {
    update.status = parsed.data.status;
    update.completedAt = parsed.data.status === "complete" ? now : null;
  }

  const [action] = await db
    .update(actions)
    .set(update)
    .where(and(eq(actions.id, id), eq(actions.spaceId, auth.spaceId)))
    .returning({
      id: actions.id,
      description: actions.description,
      ownerName: actions.ownerName,
      dueDate: actions.dueDate,
      status: actions.status,
      completedAt: actions.completedAt,
      metadata: actions.metadata,
      updatedAt: actions.updatedAt,
    });

  if (!action) {
    return NextResponse.json(
      { error: "Action not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { data: action },
    { headers: { "Cache-Control": "no-store" } },
  );
}
