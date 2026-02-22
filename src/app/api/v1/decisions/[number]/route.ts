import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { getDecisionByNumber } from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or missing API key" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { number } = await params;
  const num = parseInt(number, 10);

  if (isNaN(num)) {
    return NextResponse.json(
      { error: "Invalid decision number" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const decision = await getDecisionByNumber(auth.spaceId, num);

  if (!decision) {
    return NextResponse.json(
      { error: "Decision not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { data: decision },
    { headers: { "Cache-Control": "no-store" } }
  );
}
