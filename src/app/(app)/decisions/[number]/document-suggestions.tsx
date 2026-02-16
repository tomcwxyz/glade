"use client";

import { useState } from "react";
import { suggestDocumentUpdates } from "@/lib/ai-actions";
import { Sparkles, FileText, Loader2 } from "lucide-react";

export function DocumentSuggestions({
  decisionId,
}: {
  decisionId: string;
}) {
  const [suggestions, setSuggestions] = useState<
    Array<{ documentTitle: string; reason: string }> | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    setLoading(true);
    setError(null);
    const result = await suggestDocumentUpdates(decisionId);
    if ("error" in result) {
      setError(result.error as string);
    } else if ("suggestions" in result) {
      setSuggestions(result.suggestions as Array<{ documentTitle: string; reason: string }>);
    }
    setLoading(false);
  }

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-1.5 mb-3">
        <Sparkles size={13} className="text-canopy" />
        Document impact
      </h2>

      {!suggestions && (
        <button
          type="button"
          onClick={handleCheck}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-canopy/10 text-canopy rounded-lg font-medium hover:bg-canopy/15 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <FileText size={12} />
          )}
          Check document impact
        </button>
      )}

      {error && <p className="text-xs text-earth mt-2">{error}</p>}

      {suggestions && suggestions.length === 0 && (
        <p className="text-xs text-bark-muted mt-2">
          No documents appear to need updating from this decision.
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="space-y-2 mt-2">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-2.5 bg-paper-warm rounded-lg border border-border"
            >
              <FileText size={13} className="text-amber mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-bark">{s.documentTitle}</p>
                <p className="text-xs text-bark-muted">{s.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
