"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { analysePatterns, dismissInsight } from "@/lib/ai-actions";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Loader2,
  X,
  ArrowRight,
  Users,
  Clock,
  ListChecks,
  FileText,
  Scale,
  TriangleAlert,
  CircleDot,
  Lightbulb,
} from "lucide-react";

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  relatedDecisionId: string | null;
  createdAt: string;
  metadata?: unknown;
}

// Category → icon + label. Mirrors the enum in PATTERN_SCHEMA / patternAnalysisPrompt.
const CATEGORIES: Record<string, { label: string; icon: typeof Users }> = {
  participation: { label: "Participation", icon: Users },
  cadence: { label: "Cadence", icon: Clock },
  follow_through: { label: "Follow-through", icon: ListChecks },
  documentation: { label: "Documentation", icon: FileText },
  method_mix: { label: "Method mix", icon: Scale },
  risk: { label: "Risk", icon: TriangleAlert },
  other: { label: "Insight", icon: CircleDot },
};

// Signal → left-accent colour + label, for at-a-glance scanning.
const SIGNALS: Record<string, { label: string; accent: string; text: string }> = {
  positive: { label: "Strength", accent: "border-l-canopy", text: "text-canopy" },
  watch: { label: "Watch", accent: "border-l-amber", text: "text-amber" },
  concern: { label: "Needs attention", accent: "border-l-earth", text: "text-earth" },
};

function readMeta(insight: Insight) {
  const m = (insight.metadata ?? {}) as Record<string, unknown>;
  const category = typeof m.category === "string" && m.category in CATEGORIES ? m.category : "other";
  const signal = typeof m.signal === "string" && m.signal in SIGNALS ? m.signal : "watch";
  const suggestedAction = typeof m.suggestedAction === "string" ? m.suggestedAction : "";
  return { category, signal, suggestedAction };
}

export function InsightsPanel({
  insights,
  relatedDecisions,
}: {
  insights: Insight[];
  relatedDecisions: Record<string, { number: number; title: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patternInsights = insights.filter((i) => i.type === "pattern");

  async function handleAnalyse() {
    setLoading(true);
    setError(null);
    try {
      const result = await analysePatterns();
      if (result?.error) setError(result.error);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss(id: string) {
    await dismissInsight(id);
    router.refresh();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2
          className="text-lg font-medium tracking-tight flex items-center gap-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Lightbulb size={18} className="text-canopy" />
          Patterns
        </h2>
        <button
          type="button"
          onClick={handleAnalyse}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {patternInsights.length > 0 ? "Re-analyse" : "Analyse patterns"}
        </button>
      </div>
      <p className="text-[0.8125rem] text-bark-muted mb-4">
        AI-spotted trends across your decision history, grouped by theme. Re-analysing replaces the current set.
      </p>

      {error && <p className="text-xs text-earth mb-3">{error}</p>}

      {patternInsights.length === 0 && !loading ? (
        <p className="text-sm text-bark-muted/60 py-2">
          No patterns yet. Run analysis to surface trends from your decisions.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {patternInsights.map((insight) => {
            const { category, signal, suggestedAction } = readMeta(insight);
            const cat = CATEGORIES[category];
            const sig = SIGNALS[signal];
            const Icon = cat.icon;
            const related = insight.relatedDecisionId
              ? relatedDecisions[insight.relatedDecisionId]
              : null;

            return (
              <div
                key={insight.id}
                className={cn(
                  "group relative flex flex-col border border-border border-l-[3px] rounded-xl bg-paper-warm p-4",
                  sig.accent
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-paper-deep text-bark-muted shrink-0">
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-bark leading-tight">{cat.label}</p>
                      <p className={cn("text-[0.625rem] uppercase tracking-wide font-semibold", sig.text)}>
                        {sig.label}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismiss(insight.id)}
                    className="text-bark-muted hover:text-earth opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Dismiss"
                    aria-label="Dismiss insight"
                  >
                    <X size={14} />
                  </button>
                </div>

                <h3 className="text-sm font-medium text-bark leading-snug mb-1.5">{insight.title}</h3>
                <p className="text-xs text-bark-muted leading-relaxed mb-3">{insight.content}</p>

                {suggestedAction && (
                  <div className="flex items-start gap-2 text-[0.8125rem] text-bark bg-canopy-pale/40 rounded-lg px-3 py-2 mb-3">
                    <ArrowRight size={14} className="text-canopy mt-0.5 shrink-0" />
                    <span>{suggestedAction}</span>
                  </div>
                )}

                {related && (
                  <Link
                    href={`/decisions/${related.number}`}
                    className="mt-auto inline-flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
                  >
                    #{related.number} {related.title}
                    <ArrowRight size={10} />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
