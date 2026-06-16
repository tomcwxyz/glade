"use client";

import { useState } from "react";
import { flagStaleDocuments } from "@/lib/ai-actions";
import { Sparkles, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface StaleResult {
  documentTitle: string;
  documentId: string;
  reason: string;
  relatedDecisionNumbers: number[];
}

interface StaleInsight {
  id: string;
  title: string;
  content: string;
  relatedDocumentId: string | null;
  metadata: { subtype?: string; relatedDecisionNumbers?: number[] } | null;
}

export function StaleDocumentChecker({
  existingInsights,
}: {
  existingInsights: StaleInsight[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<StaleResult[] | null>(
    existingInsights.length > 0
      ? existingInsights.map((i) => ({
          documentTitle: i.title.replace(" may need review", ""),
          documentId: i.relatedDocumentId || "",
          reason: i.content,
          relatedDecisionNumbers:
            (i.metadata as { relatedDecisionNumbers?: number[] })
              ?.relatedDecisionNumbers || [],
        }))
      : null
  );

  async function handleCheck() {
    setLoading(true);
    setError(null);
    try {
      const result = await flagStaleDocuments();
      if ("error" in result) {
        setError(result.error as string);
      } else if ("results" in result) {
        setResults(result.results as StaleResult[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-sm font-semibold text-bark-muted uppercase tracking-wider flex items-center gap-1.5"
        >
          <Sparkles size={13} className="text-canopy" />
          Document Review
        </h2>
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          Check for stale documents
        </button>
      </div>

      {error && <p className="text-xs text-earth mb-3">{error}</p>}

      {results && results.length === 0 && (
        <p className="text-sm text-bark-muted/60 py-2">
          All documents appear up to date with recent decisions.
        </p>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2">
          {results.map((item) => (
            <div
              key={item.documentId}
              className="p-3 bg-amber-pale/30 rounded-lg border border-amber/20"
            >
              <div className="flex items-start gap-2 mb-1">
                <AlertTriangle size={14} className="text-amber mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/documents/${item.documentId}`}
                    className="text-sm font-medium text-bark hover:text-canopy transition-colors"
                  >
                    {item.documentTitle}
                  </Link>
                  <p className="text-xs text-bark-muted leading-relaxed mt-0.5">
                    {item.reason}
                  </p>
                  {item.relatedDecisionNumbers.length > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      {item.relatedDecisionNumbers.map((num) => (
                        <Link
                          key={num}
                          href={`/decisions/${num}`}
                          className="inline-flex items-center gap-0.5 text-xs text-canopy hover:text-canopy-light transition-colors"
                        >
                          #{num}
                          <ArrowRight size={10} />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
