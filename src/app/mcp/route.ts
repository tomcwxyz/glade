import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey, type ApiKeyAuth } from "@/lib/api-auth";
import { db } from "@/db";
import { spaces } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const maxDuration = 60;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const tools = [
  {
    name: "glade_current_space",
    description:
      "Return the stable Glade space represented by this API key. Use for connection/resource discovery, not as governance content.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "glade_list_decisions",
    description: "List durable Glade decisions for the API key's space.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["decided", "implemented", "reviewed", "learned"] },
        limit: { type: "integer", minimum: 1, maximum: 200, default: 50 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "glade_get_decision",
    description: "Read one Glade decision in detail by decision number.",
    inputSchema: {
      type: "object",
      properties: { number: { type: "integer", minimum: 1 } },
      required: ["number"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "glade_list_open_actions",
    description: "List open Glade actions and commitments.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "glade_get_action",
    description:
      "Read one Glade action/commitment by stable action ID. Use after a broader action list when one specific commitment materially supports the answer.",
    inputSchema: {
      type: "object",
      properties: {
        actionId: { type: "string", format: "uuid" },
      },
      required: ["actionId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "glade_create_action",
    description: "Create a private Glade action. Requires a read_write Glade API key.",
    inputSchema: {
      type: "object",
      properties: {
        description: { type: "string", minLength: 1, maxLength: 2000 },
        ownerName: { type: "string", maxLength: 255 },
        dueDate: { type: "string" },
        metadata: { type: "object", additionalProperties: true },
      },
      required: ["description"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  },
  {
    name: "glade_update_action",
    description: "Update an existing Glade action's description, owner, due date or status. Requires a read_write Glade API key.",
    inputSchema: {
      type: "object",
      properties: {
        actionId: { type: "string", format: "uuid" },
        description: { type: "string", minLength: 1, maxLength: 2000 },
        ownerName: { anyOf: [{ type: "string", maxLength: 255 }, { type: "null" }] },
        dueDate: { anyOf: [{ type: "string" }, { type: "null" }] },
        status: { type: "string", enum: ["open", "in_progress", "complete", "overdue", "superseded"] },
      },
      required: ["actionId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  },
  {
    name: "glade_list_meetings",
    description: "List recent Glade governance meetings.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 200, default: 30 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "glade_list_documents",
    description: "List Glade governance documents.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 200, default: 30 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "glade_draft_decision_candidate",
    description: "Structure a reviewable decision candidate without saving anything to Glade.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", minLength: 1 },
        proposedOutcome: { type: "string", minLength: 1 },
        whyItMayNeedDecision: { type: "string", minLength: 1 },
        evidence: { type: "array", items: { type: "string", minLength: 1 }, default: [] },
        suggestedReviewDate: { type: "string" },
      },
      required: ["title", "proposedOutcome", "whyItMayNeedDecision"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
] as const;

function rpc(id: JsonRpcRequest["id"], result: unknown, status = 200) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, result },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string, status = 400) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function positiveInt(value: unknown, fallback: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed)
    ? Math.max(1, Math.min(Math.trunc(parsed), max))
    : fallback;
}

async function spaceIdentity(request: NextRequest, auth: ApiKeyAuth) {
  const [space] = await db
    .select({
      id: spaces.id,
      name: spaces.name,
      slug: spaces.slug,
      description: spaces.description,
    })
    .from(spaces)
    .where(eq(spaces.id, auth.spaceId))
    .limit(1);

  if (!space) throw new Error("Glade space not found");

  return {
    ...space,
    url: new URL("/public/" + space.slug, request.nextUrl.origin).toString(),
  };
}

function actionCollectionUrl(request: NextRequest, spaceSlug: string) {
  return new URL(
    "/public/" + spaceSlug + "/actions",
    request.nextUrl.origin,
  ).toString();
}

async function apiCall(
  request: NextRequest,
  path: string,
  init?: RequestInit,
) {
  const target = new URL(path, request.nextUrl.origin);
  const authorization = request.headers.get("authorization") ?? "";
  const response = await fetch(target, {
    ...init,
    headers: {
      authorization,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ error: `Glade API request failed (${response.status})` }));
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload
      ? String((payload as { error: unknown }).error)
      : `Glade API request failed (${response.status})`;
    throw new Error(message);
  }
  return payload;
}

async function callTool(
  request: NextRequest,
  name: string,
  args: Record<string, unknown>,
  auth: ApiKeyAuth,
) {
  switch (name) {
    case "glade_current_space":
      return { space: await spaceIdentity(request, auth) };
    case "glade_list_decisions": {
      const params = new URLSearchParams({ limit: String(positiveInt(args.limit, 50, 200)) });
      if (typeof args.status === "string") params.set("status", args.status);
      return apiCall(request, `/api/v1/decisions?${params}`);
    }
    case "glade_get_decision":
      return apiCall(request, `/api/v1/decisions/${positiveInt(args.number, 1, Number.MAX_SAFE_INTEGER)}`);
    case "glade_list_open_actions": {
      const payload = await apiCall(
        request,
        `/api/v1/actions?status=open&limit=${positiveInt(args.limit, 50, 200)}`,
      );
      const space = await spaceIdentity(request, auth);
      return {
        ...asRecord(payload),
        space,
        collectionUrl: actionCollectionUrl(request, space.slug),
      };
    }
    case "glade_get_action": {
      if (typeof args.actionId !== "string" || !args.actionId) {
        throw new Error("actionId is required");
      }
      const payload = await apiCall(
        request,
        `/api/v1/actions/${encodeURIComponent(args.actionId)}`,
      );
      const space = await spaceIdentity(request, auth);
      return {
        ...asRecord(payload),
        space,
        collectionUrl: actionCollectionUrl(request, space.slug),
      };
    }
    case "glade_create_action": {
      const payload = await apiCall(request, "/api/v1/actions", {
        method: "POST",
        body: JSON.stringify({
          description: args.description,
          ...(args.ownerName !== undefined ? { ownerName: args.ownerName } : {}),
          ...(args.dueDate !== undefined ? { dueDate: args.dueDate } : {}),
          ...(args.metadata !== undefined ? { metadata: args.metadata } : {}),
        }),
      });
      const space = await spaceIdentity(request, auth);
      return {
        ...asRecord(payload),
        space,
        collectionUrl: actionCollectionUrl(request, space.slug),
      };
    }
    case "glade_update_action": {
      if (typeof args.actionId !== "string" || !args.actionId) throw new Error("actionId is required");
      const { actionId, ...updates } = args;
      const payload = await apiCall(
        request,
        `/api/v1/actions/${encodeURIComponent(actionId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(updates),
        },
      );
      const space = await spaceIdentity(request, auth);
      return {
        ...asRecord(payload),
        space,
        collectionUrl: actionCollectionUrl(request, space.slug),
      };
    }
    case "glade_list_meetings":
      return apiCall(request, `/api/v1/meetings?limit=${positiveInt(args.limit, 30, 200)}`);
    case "glade_list_documents":
      return apiCall(request, `/api/v1/documents?limit=${positiveInt(args.limit, 30, 200)}`);
    case "glade_draft_decision_candidate":
      return {
        saved: false,
        kind: "glade_decision_candidate",
        candidate: args,
        nextStep: "Review with the human. Recording a real Glade decision remains a separate deliberate action.",
      };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return rpcError(null, -32001, "Invalid or missing Glade API key", 401);
  }

  let body: JsonRpcRequest;
  try {
    body = await request.json() as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  if (body.jsonrpc !== "2.0" || !body.method) {
    return rpcError(body.id, -32600, "Invalid Request");
  }

  if (body.method === "notifications/initialized") {
    return new Response(null, { status: 202 });
  }

  if (body.method === "initialize") {
    const params = asRecord(body.params);
    return rpc(body.id, {
      protocolVersion: typeof params.protocolVersion === "string"
        ? params.protocolVersion
        : "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "glade", version: "0.2.0" },
    });
  }

  if (body.method === "ping") return rpc(body.id, {});

  if (body.method === "tools/list") {
    return rpc(body.id, { tools });
  }

  if (body.method === "tools/call") {
    const params = asRecord(body.params);
    const name = typeof params.name === "string" ? params.name : "";
    const args = asRecord(params.arguments);
    if (!name) return rpcError(body.id, -32602, "Tool name is required");
    try {
      const result = await callTool(request, name, args, auth);
      return rpc(body.id, {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result,
        isError: false,
      });
    } catch (error) {
      return rpc(body.id, {
        content: [{
          type: "text",
          text: error instanceof Error ? error.message : String(error),
        }],
        isError: true,
      });
    }
  }

  return rpcError(body.id, -32601, "Method not found");
}

export async function GET() {
  return NextResponse.json(
    { error: "Use MCP Streamable HTTP POST requests" },
    { status: 405, headers: { Allow: "POST" } },
  );
}
