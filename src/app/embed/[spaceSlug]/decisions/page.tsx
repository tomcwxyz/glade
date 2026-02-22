import { notFound } from "next/navigation";
import { getPublicSpace, getPublicDecisions } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  decided: "bg-sky/10 text-sky",
  implemented: "bg-canopy/10 text-canopy",
  reviewed: "bg-amber/10 text-amber",
  learned: "bg-earth/10 text-earth",
};

export default async function EmbedDecisionsPage({
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
    <div className="p-4 bg-paper min-h-screen font-sans text-bark">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">{space.name} — Decision Log</h2>
        <span className="text-[0.625rem] text-bark-muted">
          {decisions.length} decision{decisions.length !== 1 ? "s" : ""}
        </span>
      </div>
      {decisions.length === 0 ? (
        <p className="text-sm text-bark-muted text-center py-8">No decisions recorded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {decisions.map((d) => (
            <div key={d.id} className="px-3 py-2.5 rounded border border-border bg-paper-warm text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[0.625rem] text-bark-muted/60">#{d.number}</span>
                <span className="font-medium text-bark flex-1 truncate">{d.title}</span>
                <span
                  className={`text-[0.5625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium shrink-0 ${
                    STATUS_STYLES[d.status] || "bg-paper-deep text-bark-muted"
                  }`}
                >
                  {d.status}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[0.6875rem] text-bark-muted">
                <span>{formatDate(d.date.toISOString())}</span>
                {d.outcome && (
                  <>
                    <span className="text-bark-muted/30">·</span>
                    <span className="truncate">{d.outcome}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 text-center">
        <a
          href={`/public/${spaceSlug}/decisions`}
          target="_blank"
          rel="noopener"
          className="text-[0.625rem] text-canopy hover:underline"
        >
          View full decision log →
        </a>
      </div>
    </div>
  );
}
