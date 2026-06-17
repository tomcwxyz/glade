import { notFound } from "next/navigation";
import { getCurrentSpace } from "@/lib/space";
import { getInsightById } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { MarkdownContent } from "@/components/markdown-content";
import { PrintButton } from "@/components/print-button";

type InsightMeta = Record<string, unknown> | null;

/** Clean, printable view of a single digest or briefing — browser print → PDF. */
export default async function InsightPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const insight = await getInsightById(space.id, id);
  if (!insight) return notFound();

  const kind =
    (insight.metadata as InsightMeta)?.subtype === "digest"
      ? "Governance digest"
      : insight.type === "briefing"
        ? "Member briefing"
        : "Insight";

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 print:px-0 print:py-0 print:max-w-none">
      {/* Controls — hidden in print */}
      <div className="print:hidden mb-6 flex items-center gap-3">
        <PrintButton />
        <span className="text-sm text-bark-muted">
          Use your browser&apos;s print dialog to save as PDF
        </span>
      </div>

      <header className="mb-8 pb-6 border-b border-bark/20">
        <p className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-1">{kind}</p>
        <h1
          className="text-2xl font-semibold text-bark mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {insight.title}
        </h1>
        <div className="text-sm text-bark-muted space-x-3">
          <span>{formatDate(insight.createdAt.toISOString())}</span>
          <span>·</span>
          <span>{space.name}</span>
        </div>
      </header>

      <MarkdownContent content={insight.content} />
    </div>
  );
}
