"use client";

import { useState } from "react";
import { generateGovernanceDigest, dismissInsight } from "@/lib/ai-actions";
import { MarkdownContent } from "@/components/markdown-content";
import { Sparkles, Loader2, X, Newspaper } from "lucide-react";

interface DigestInsight {
  id: string;
  content: string;
}

export function GovernanceDigest({
  existing,
}: {
  existing: DigestInsight | null;
}) {
  const [content, setContent] = useState<string | null>(existing?.content || null);
  const [insightId, setInsightId] = useState<string | null>(existing?.id || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateGovernanceDigest();
      if ("error" in result) {
        setError(result.error as string);
      } else if ("content" in result) {
        setContent(result.content as string);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    if (insightId) {
      await dismissInsight(insightId);
      setContent(null);
      setInsightId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-base font-medium tracking-tight flex items-center gap-1.5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Newspaper size={15} className="text-bark-muted" />
          Monthly digest
        </h2>
        {!content && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            Generate digest
          </button>
        )}
      </div>

      {error && <p className="text-xs text-earth mb-3">{error}</p>}

      {!content && !loading && (
        <p className="text-sm text-bark-muted/60 py-2">
          Generate a monthly summary of governance activity.
        </p>
      )}

      {content && (
        <div className="relative p-4 bg-paper-warm rounded-xl border border-border">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-bark-muted hover:text-earth transition-colors"
            title="Dismiss"
            aria-label="Dismiss digest"
          >
            <X size={14} />
          </button>
          <MarkdownContent content={content} />
          <p className="text-xs text-bark-muted/60 mt-4 pt-3 border-t border-border">
            Email delivery coming soon.
          </p>
        </div>
      )}
    </section>
  );
}
