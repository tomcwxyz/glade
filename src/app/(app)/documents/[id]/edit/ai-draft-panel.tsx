"use client";

import { useState } from "react";
import { draftDocumentUpdate } from "@/lib/ai-actions";
import { Sparkles, Loader2, ChevronDown } from "lucide-react";

interface DecisionOption {
  id: string;
  number: number;
  title: string;
}

export function AiDraftPanel({
  documentId,
  decisions,
}: {
  documentId: string;
  decisions: DecisionOption[];
}) {
  const [selectedDecisionId, setSelectedDecisionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);

  async function handleDraft() {
    if (!selectedDecisionId) return;
    setLoading(true);
    setError(null);
    const result = await draftDocumentUpdate(selectedDecisionId, documentId);
    if ("error" in result) {
      setError(result.error as string);
    } else if ("content" in result) {
      setContent(result.content as string);
    }
    setLoading(false);
  }

  return (
    <div className="mt-8 border-t border-border pt-8">
      <h3
        className="text-base font-medium tracking-tight flex items-center gap-1.5 mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <Sparkles size={15} className="text-canopy" />
        AI-suggested changes
      </h3>
      <p className="text-xs text-bark-muted mb-4">
        Select a decision and generate suggested edits for this document.
      </p>

      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1 relative">
          <label className="block text-xs text-bark-muted mb-1.5">
            Based on decision
          </label>
          <div className="relative">
            <select
              value={selectedDecisionId}
              onChange={(e) => {
                setSelectedDecisionId(e.target.value);
                setContent(null);
              }}
              className="w-full appearance-none px-3 py-2 pr-8 text-sm border border-border rounded-lg bg-paper text-bark focus:outline-none focus:ring-2 focus:ring-canopy/20 focus:border-canopy"
            >
              <option value="">Choose a decision…</option>
              {decisions.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.number} {d.title}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-bark-muted pointer-events-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleDraft}
          disabled={loading || !selectedDecisionId}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          Draft changes
        </button>
      </div>

      {error && <p className="text-xs text-earth mb-3">{error}</p>}

      {content && (
        <div className="p-4 bg-paper-warm rounded-xl border border-border">
          <div className="prose prose-sm max-w-none text-bark [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-[0.8125rem] [&_li]:text-[0.8125rem] [&_blockquote]:border-l-2 [&_blockquote]:border-amber [&_blockquote]:pl-3 [&_blockquote]:text-bark-muted [&_blockquote]:italic">
            {content.split("\n").map((line, i) => {
              if (line.startsWith("# "))
                return <h1 key={i}>{line.slice(2)}</h1>;
              if (line.startsWith("## "))
                return <h2 key={i}>{line.slice(3)}</h2>;
              if (line.startsWith("### "))
                return <h3 key={i}>{line.slice(4)}</h3>;
              if (line.startsWith("> "))
                return <blockquote key={i}><p>{line.slice(2)}</p></blockquote>;
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
          <p className="text-xs text-bark-muted/60 mt-4 pt-3 border-t border-border">
            Review these suggestions and apply changes manually in the editor above.
          </p>
        </div>
      )}
    </div>
  );
}
