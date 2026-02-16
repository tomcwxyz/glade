"use client";

import { useState } from "react";
import { generateReviewQuestions } from "@/lib/ai-actions";
import { Sparkles, Loader2 } from "lucide-react";

export function ReviewQuestions({
  decisionId,
  cachedContent,
}: {
  decisionId: string;
  cachedContent: string | null;
}) {
  const [content, setContent] = useState<string | null>(cachedContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const result = await generateReviewQuestions(decisionId);
    if ("error" in result) {
      setError(result.error as string);
    } else if ("content" in result) {
      setContent(result.content as string);
    }
    setLoading(false);
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-1.5 mb-3">
        <Sparkles size={13} className="text-canopy" />
        Review questions
      </h2>

      {!content && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-canopy/10 text-canopy rounded-lg font-medium hover:bg-canopy/15 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          Generate review questions
        </button>
      )}

      {error && <p className="text-xs text-earth mt-2">{error}</p>}

      {content && (
        <div className="bg-paper-warm rounded-lg border border-border p-4 mt-2">
          <div className="text-sm text-bark leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      )}
    </section>
  );
}
