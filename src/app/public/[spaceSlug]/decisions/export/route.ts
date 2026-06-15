import { getPublicSpace, getPublicDecisions } from "@/lib/queries";

function escapeCsv(value: string): string {
  // Neutralise spreadsheet formula injection.
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Public CSV export of a space's public decisions. Gated on publicDecisionLog. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ spaceSlug: string }> }
) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space || (space.settings as Record<string, unknown>)?.publicDecisionLog !== true) {
    return new Response("Not found", { status: 404 });
  }

  const decisions = await getPublicDecisions(space.id);
  const headers = ["Number", "Title", "Date", "Status", "Method", "Outcome", "Tags"];
  const rows = decisions.map((d) => [
    String(d.number),
    d.title,
    formatDate(d.date),
    d.status,
    d.method.replace("_", " "),
    d.outcome || "",
    d.tags.join("; "),
  ]);

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const filename = `${space.slug}-decisions-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
