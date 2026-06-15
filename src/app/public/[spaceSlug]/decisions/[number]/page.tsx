import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicSpace, getPublicDecisionByNumber } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, CalendarDays } from "lucide-react";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spaceSlug: string; number: string }>;
}): Promise<Metadata> {
  const { spaceSlug, number } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space || (space.settings as Record<string, unknown>)?.publicDecisionLog !== true) {
    return { title: "Decision" };
  }
  const decision = await getPublicDecisionByNumber(space.id, parseInt(number, 10));
  return {
    title: decision ? `#${decision.number} ${decision.title} — ${space.name}` : "Decision",
    description: decision?.outcome || undefined,
  };
}

export default async function PublicDecisionPage({
  params,
}: {
  params: Promise<{ spaceSlug: string; number: string }>;
}) {
  const { spaceSlug, number } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) notFound();
  const settings = (space.settings as Record<string, unknown>) || {};
  if (settings.publicDecisionLog !== true) notFound();

  const decision = await getPublicDecisionByNumber(space.id, parseInt(number, 10));
  if (!decision) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Link
        href={`/public/${spaceSlug}/decisions`}
        className="inline-flex items-center gap-1 text-sm text-bark-muted hover:text-canopy transition-colors mb-6"
      >
        <ChevronLeft size={15} />
        Decision Log
      </Link>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className="text-sm text-bark-muted font-mono">#{decision.number}</span>
        <span
          className={`text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
            STATUS_STYLES[decision.status] || "bg-paper-deep text-bark-muted"
          }`}
        >
          {decision.status}
        </span>
        {decision.retiredAt && (
          <span className="text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium bg-bark/10 text-bark-muted">
            Retired
          </span>
        )}
      </div>

      <h1
        className="text-2xl font-medium tracking-tight leading-snug mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {decision.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-bark-muted mb-8">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={14} />
          {formatDate(decision.date.toISOString())}
        </span>
        <span>{METHOD_LABELS[decision.method] || decision.method}</span>
        {decision.meetingTitle && <span>· {decision.meetingTitle}</span>}
        {decision.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded bg-paper-deep text-xs">
            {tag}
          </span>
        ))}
      </div>

      <div className="space-y-8">
        {decision.description && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-2">Context</h2>
            <p className="text-[0.9375rem] text-bark leading-relaxed">{decision.description}</p>
          </section>
        )}
        {decision.rationale && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-2">Rationale</h2>
            <div className="border-l-2 border-canopy/30 pl-4">
              <p className="text-[0.9375rem] text-bark leading-relaxed">{decision.rationale}</p>
            </div>
          </section>
        )}
        {decision.outcome && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-2">Outcome</h2>
            <div className="bg-canopy-pale/40 rounded-xl px-5 py-4">
              <p className="text-[0.9375rem] text-bark leading-relaxed">{decision.outcome}</p>
            </div>
          </section>
        )}
        {decision.conditions && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-2">Conditions</h2>
            <p className="text-[0.9375rem] text-bark leading-relaxed">{decision.conditions}</p>
          </section>
        )}
        {decision.linkedDecisions.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-2">Related decisions</h2>
            <ul className="space-y-1.5">
              {decision.linkedDecisions.map((l) => (
                <li key={l.number} className="text-sm">
                  <span className="text-bark-muted">{l.relation.replace("_", " ")} </span>
                  <Link
                    href={`/public/${spaceSlug}/decisions/${l.number}`}
                    className="text-bark hover:text-canopy transition-colors"
                  >
                    #{l.number} {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
