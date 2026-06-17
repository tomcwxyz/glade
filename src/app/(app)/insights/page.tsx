import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import { getCurrentSpace } from "@/lib/space";
import { isAiEnabled } from "@/lib/ai";
import { getSpacePlan } from "@/lib/billing";
import { PLAN_LIMITS } from "@/lib/plans";
import { getActiveInsights, getDecisions } from "@/lib/queries";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { InsightsPanel } from "./insights-panel";
import { InsightArchive, type ArchiveItem } from "./insight-archive";

export const metadata: Metadata = { title: "Insights" };

type InsightMeta = Record<string, unknown> | null;

export default async function InsightsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const planTier = await getSpacePlan(space.id);
  const planLimits = PLAN_LIMITS[planTier];
  const aiEnabled = planLimits.canUseAi && isAiEnabled(space.settings);

  const [activeInsights, allDecisions] = await Promise.all([
    aiEnabled ? getActiveInsights(space.id) : Promise.resolve([]),
    getDecisions(space.id),
  ]);

  // Decision lookup so pattern cards can link to their related decision.
  const relatedDecisions: Record<string, { number: number; title: string }> = {};
  for (const insight of activeInsights) {
    if (insight.relatedDecisionId) {
      const dec = allDecisions.find((d) => d.id === insight.relatedDecisionId);
      if (dec) {
        relatedDecisions[insight.relatedDecisionId] = { number: dec.number, title: dec.title };
      }
    }
  }

  const isDigest = (m: InsightMeta) => (m as InsightMeta)?.subtype === "digest";

  const digests: ArchiveItem[] = activeInsights
    .filter((i) => i.type === "briefing" && isDigest(i.metadata as InsightMeta))
    .map((i) => ({ id: i.id, title: i.title, content: i.content, createdAt: i.createdAt.toISOString() }));

  const briefings: ArchiveItem[] = activeInsights
    .filter((i) => i.type === "briefing" && !isDigest(i.metadata as InsightMeta))
    .map((i) => ({ id: i.id, title: i.title, content: i.content, createdAt: i.createdAt.toISOString() }));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-bark-muted hover:text-bark transition-colors mb-3"
        >
          <ArrowLeft size={13} /> Dashboard
        </Link>
        <h1
          className="text-3xl font-light tracking-tight mb-2 flex items-center gap-2.5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Sparkles size={24} className="text-canopy" />
          Insights
        </h1>
        <p className="text-bark-muted text-base">
          AI-generated intelligence from your governance record — patterns, digests, and member briefings.
        </p>
      </header>

      {!planLimits.canUseAi ? (
        <UpgradePrompt
          feature="AI Governance Insights"
          description="Get pattern analysis, monthly digests, and member briefings powered by AI."
        />
      ) : !isAiEnabled(space.settings) ? (
        <div className="border border-border rounded-2xl bg-paper-warm px-6 py-10 text-center">
          <p className="text-sm text-bark-muted">
            AI features are turned off for this space.{" "}
            <Link href="/settings" className="text-canopy hover:text-canopy-light">
              Enable them in Settings
            </Link>{" "}
            to generate insights.
          </p>
        </div>
      ) : (
        <div className="space-y-14">
          <InsightsPanel
            insights={activeInsights.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))}
            relatedDecisions={relatedDecisions}
          />

          <InsightArchive kind="digest" items={digests} />

          <InsightArchive kind="briefing" items={briefings} />
        </div>
      )}
    </div>
  );
}
