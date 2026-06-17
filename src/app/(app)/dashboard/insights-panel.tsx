"use client";

import { useState } from "react";
import { analysePatterns, dismissInsight } from "@/lib/ai-actions";
import { Sparkles, Loader2, X, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Insight {
  id: string;
  type: string;
  title: string;
  content: string;
  relatedDecisionId: string | null;
  createdAt: string;
}

export function InsightsPanel({
  insights,
  relatedDecisions,
}: {
  insights: Insight[];
  relatedDecisions: Record<string, { number: number; title: string }>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patternInsights = insights.filter((i) => i.type === "pattern");

  async function handleAnalyse() {
    setLoading(true);
    setError(null);
    try {
      const result = await analysePatterns();
      if (result?.error) setError(result.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss(id: string) {
    await dismissInsight(id);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base font-medium tracking-tight flex items-center gap-1.5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Sparkles size={15} className="text-canopy" />
          AI Insights
        </h2>
        <button
          type="button"
          onClick={handleAnalyse}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          Analyse patterns
        </button>
      </div>

      {error && (
        <p className="text-xs text-earth mb-3">{error}</p>
      )}

      {patternInsights.length === 0 && !loading && (
        <p className="text-sm text-bark-muted/60 py-2">
          No insights yet. Run pattern analysis to generate insights from your decision history.
        </p>
      )}

      <div className="space-y-3">
        {patternInsights.map((insight) => {
          const related = insight.relatedDecisionId
            ? relatedDecisions[insight.relatedDecisionId]
            : null;

          return (
            <div
              key={insight.id}
              className="p-3 bg-paper-warm rounded-lg border border-border group"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-medium text-bark leading-snug">
                  {insight.title}
                </h3>
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
              <p className="text-xs text-bark-muted leading-relaxed mb-2">
                {insight.content.length > 200
                  ? insight.content.slice(0, 200) + "…"
                  : insight.content}
              </p>
              {related && (
                <Link
                  href={`/decisions/${related.number}`}
                  className="inline-flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
                >
                  #{related.number} {related.title}
                  <ArrowRight size={10} />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
