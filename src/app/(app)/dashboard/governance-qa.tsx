"use client";

import { useState } from "react";
import { askGovernanceQuestion } from "@/lib/ai-actions";
import { MarkdownContent } from "@/components/markdown-content";
import { Sparkles, Loader2, MessageCircleQuestion } from "lucide-react";

export function GovernanceQa() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const result = await askGovernanceQuestion(question);
      if ("error" in result) {
        setError(result.error as string);
      } else if ("answer" in result) {
        setAnswer(result.answer as string);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <div className="flex items-center gap-1.5 mb-4">
        <h2
          className="text-base font-medium tracking-tight flex items-center gap-1.5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <MessageCircleQuestion size={15} className="text-canopy" />
          Ask about governance
        </h2>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) {
              e.preventDefault();
              handleAsk();
            }
          }}
          placeholder="e.g. What did we decide about the lease?"
          aria-label="Ask a question about your governance"
          className="flex-1 min-w-0 px-3 py-2 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
        />
        <button
          type="button"
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          Ask
        </button>
      </div>

      {error && <p className="text-xs text-earth mt-3">{error}</p>}

      {answer && (
        <div className="mt-3 p-4 bg-paper-warm rounded-xl border border-border">
          <MarkdownContent content={answer} />
          <p className="text-[0.625rem] text-bark-muted/60 mt-3">
            AI-generated from your decisions and documents — verify against the record.
          </p>
        </div>
      )}
    </section>
  );
}
