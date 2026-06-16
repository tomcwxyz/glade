"use client";

import { useState } from "react";
import { askGovernanceQuestion } from "@/lib/ai-actions";
import { Sparkles, Loader2, MessageCircleQuestion } from "lucide-react";

/** Render a small subset of markdown (headings, bullets) like the other AI cards. */
function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("# ")) return <h1 key={i}>{line.slice(2)}</h1>;
    if (line.startsWith("## ")) return <h2 key={i}>{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i}>{line.slice(4)}</h3>;
    if (line.startsWith("- "))
      return (
        <p key={i} className="ml-4">
          &bull; {line.slice(2)}
        </p>
      );
    if (line.trim() === "") return <br key={i} />;
    return <p key={i}>{line}</p>;
  });
}

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
          <div className="prose prose-sm max-w-none text-bark [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-[0.8125rem] [&_li]:text-[0.8125rem]">
            {renderMarkdown(answer)}
          </div>
          <p className="text-[0.625rem] text-bark-muted/60 mt-3">
            AI-generated from your decisions and documents — verify against the record.
          </p>
        </div>
      )}
    </section>
  );
}
