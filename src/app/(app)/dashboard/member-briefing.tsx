"use client";

import { useState } from "react";
import { generateMemberBriefing, dismissInsight } from "@/lib/ai-actions";
import { Sparkles, Loader2, X, Users } from "lucide-react";

interface BriefingInsight {
  id: string;
  content: string;
}

export function MemberBriefing({
  existing,
}: {
  existing: BriefingInsight | null;
}) {
  const [content, setContent] = useState<string | null>(existing?.content || null);
  const [insightId, setInsightId] = useState<string | null>(existing?.id || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    const result = await generateMemberBriefing();
    if ("error" in result) {
      setError(result.error as string);
    } else if ("content" in result) {
      setContent(result.content as string);
    }
    setLoading(false);
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
          <Users size={15} className="text-bark-muted" />
          Member briefing
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
            Generate briefing
          </button>
        )}
      </div>

      {error && <p className="text-xs text-earth mb-3">{error}</p>}

      {!content && !loading && (
        <p className="text-sm text-bark-muted/60 py-2">
          Generate an AI-powered governance briefing for new members.
        </p>
      )}

      {content && (
        <div className="relative p-4 bg-paper-warm rounded-xl border border-border">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-bark-muted hover:text-earth transition-colors"
            title="Dismiss"
          >
            <X size={14} />
          </button>
          <div className="prose prose-sm max-w-none text-bark [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-[0.8125rem] [&_li]:text-[0.8125rem]">
            {content.split("\n").map((line, i) => {
              if (line.startsWith("# "))
                return <h1 key={i}>{line.slice(2)}</h1>;
              if (line.startsWith("## "))
                return <h2 key={i}>{line.slice(3)}</h2>;
              if (line.startsWith("### "))
                return <h3 key={i}>{line.slice(4)}</h3>;
              if (line.startsWith("- "))
                return (
                  <p key={i} className="ml-4">
                    &bull; {line.slice(2)}
                  </p>
                );
              if (line.trim() === "") return <br key={i} />;
              return <p key={i}>{line}</p>;
            })}
          </div>
        </div>
      )}
    </section>
  );
}
