import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentSpace } from "@/lib/space";
import { getDecisions } from "@/lib/queries";

function escapeCsv(value: string): string {
  // Neutralise spreadsheet formula injection: a leading =, +, -, @ (or a
  // control char) can execute when the CSV is opened in Excel/Sheets.
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const space = await getCurrentSpace();
  if (!space) {
    return NextResponse.json({ error: "No space" }, { status: 400 });
  }

  const decisions = await getDecisions(space.id);
  const format = request.nextUrl.searchParams.get("format");

  // Structured JSON export alongside CSV.
  if (format === "json") {
    const data = decisions.map((d) => ({
      number: d.number,
      title: d.title,
      date: d.date,
      status: d.status,
      method: d.method,
      outcome: d.outcome,
      description: d.description,
      rationale: d.rationale,
      conditions: d.conditions,
      participants: (d.participants as string[]) || [],
      tags: d.tags,
      reviewDate: d.reviewDate,
      actionsTotal: d.actionsCount,
      actionsComplete: d.actionsComplete,
    }));
    const filename = `${space.slug}-decisions-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify({ space: space.slug, decisions: data }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const headers = [
    "Number",
    "Title",
    "Date",
    "Status",
    "Method",
    "Outcome",
    "Description",
    "Rationale",
    "Conditions",
    "Participants",
    "Tags",
    "Review Date",
    "Actions (total)",
    "Actions (complete)",
  ];

  const rows = decisions.map((d) => [
    String(d.number),
    d.title,
    formatDate(d.date),
    d.status,
    d.method.replace("_", " "),
    d.outcome || "",
    d.description || "",
    d.rationale || "",
    d.conditions || "",
    ((d.participants as string[]) || []).join("; "),
    d.tags.join("; "),
    formatDate(d.reviewDate),
    String(d.actionsCount),
    String(d.actionsComplete),
  ]);

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const filename = `${space.slug}-decisions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
