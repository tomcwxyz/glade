import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { limitApi, rateLimitedResponse } from "@/lib/rate-limit";
import { getDocuments } from "@/lib/queries";

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

  const rows = await getDocuments(auth.spaceId);

  const data = rows.map((d) => ({
    id: d.id,
    title: d.title,
    type: d.type,
    status: d.status,
    currentVersion: d.currentVersion,
    updatedAt: d.updatedAt,
  }));

  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": "no-store" } }
  );
}
