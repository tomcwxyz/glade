import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { getDocumentById } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { id } = await params;
  const document = await getDocumentById(auth.spaceId, id);

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: document },
    { headers: { "Cache-Control": "no-store" } }
  );
}
