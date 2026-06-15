import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicSpace, getPublicDecisions } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { BookOpen } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}): Promise<Metadata> {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  return {
    title: space ? `${space.name} — Decision Log` : "Decision Log",
    alternates: {
      types: {
        "application/rss+xml": [
          { url: `/public/${spaceSlug}/feed.xml`, title: `${space?.name ?? "Glade"} decisions` },
        ],
      },
    },
  };
}

const STATUS_STYLES: Record<string, string> = {
  decided: "bg-sky/10 text-sky",
  implemented: "bg-canopy/10 text-canopy",
  reviewed: "bg-amber/10 text-amber",
  learned: "bg-earth/10 text-earth",
};

const METHOD_LABELS: Record<string, string> = {
  consent: "Consent",
  majority_vote: "Majority vote",
  advice_process: "Advice process",
  delegation: "Delegation",
  consensus: "Consensus",
  lazy_consensus: "Lazy consensus",
};

export default async function PublicDecisionsPage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) notFound();

  const settings = (space.settings as Record<string, unknown>) || {};
  if (settings.publicDecisionLog !== true) notFound();

  const decisions = await getPublicDecisions(space.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2.5 mb-1.5">
          <BookOpen size={20} className="text-bark-muted" />
          <h2
            className="text-2xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Decision Log
          </h2>
        </div>
        <p className="text-bark-muted text-sm">
          {decisions.length} decision{decisions.length !== 1 ? "s" : ""} recorded
        </p>
      </header>

      {decisions.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={40} className="mx-auto mb-4 text-bark-muted/30" />
          <p className="text-bark-muted">No decisions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => (
            <Link
              key={d.id}
              href={`/public/${spaceSlug}/decisions/${d.number}`}
              className="block px-4 py-3.5 rounded-lg border border-border bg-paper-warm hover:bg-paper-warm/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs text-bark-muted/60 font-mono mt-0.5 shrink-0">
                  #{d.number}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[0.9375rem] font-medium text-bark">
                      {d.title}
                    </span>
                    <span
                      className={`text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
                        STATUS_STYLES[d.status] || "bg-paper-deep text-bark-muted"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-bark-muted flex-wrap">
                    <span>{formatDate(d.date.toISOString())}</span>
                    {d.method && (
                      <>
                        <span className="text-bark-muted/30">·</span>
                        <span>{METHOD_LABELS[d.method] || d.method}</span>
                      </>
                    )}
                    {d.tags.length > 0 && (
                      <>
                        <span className="text-bark-muted/30">·</span>
                        {d.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded bg-paper-deep text-bark-muted text-[0.625rem]"
                          >
                            {tag}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                  {d.outcome && (
                    <p className="text-sm text-bark mt-2">{d.outcome}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
