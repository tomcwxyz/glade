import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentSpace } from "@/lib/space";
import { getDecisions } from "@/lib/queries";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const space = await getCurrentSpace();
  if (!space) {
    return NextResponse.json({ error: "No space" }, { status: 400 });
  }

  const decisions = await getDecisions(space.id);

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
