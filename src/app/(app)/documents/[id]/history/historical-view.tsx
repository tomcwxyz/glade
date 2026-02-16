"use client";

import { useState } from "react";
import { getHistoricalDocument } from "@/lib/document-actions";
import { TiptapViewer } from "../tiptap-viewer";
import { CalendarSearch, Loader2 } from "lucide-react";

export function HistoricalView({ documentId }: { documentId: string }) {
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    content: unknown;
    versionNumber: number;
    createdAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleView() {
    if (!date) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const res = await getHistoricalDocument(documentId, date);

    if ("error" in res) {
      setError(res.error as string);
    } else {
      setResult(res as { content: unknown; versionNumber: number; createdAt: string });
    }
    setLoading(false);
  }

  const inputClass =
    "px-3 py-1.5 text-sm bg-paper-warm border border-border rounded-lg focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

  return (
    <div className="mt-10">
      <h2
        className="text-lg font-medium tracking-tight mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        View at date
      </h2>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className={inputClass}
        />
        <button
          type="button"
          onClick={handleView}
          disabled={loading || !date}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <CalendarSearch size={14} />
          )}
          View
        </button>
      </div>

      {error && (
        <p className="text-sm text-earth">{error}</p>
      )}

      {result && (
        <div className="bg-paper-warm rounded-xl border border-border p-6">
          <p className="text-xs text-bark-muted mb-4">
            Version {result.versionNumber} from{" "}
            {new Date(result.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {result.content ? (
            <TiptapViewer content={result.content as Record<string, unknown>} />
          ) : (
            <p className="text-bark-muted italic">No content in this version.</p>
          )}
        </div>
      )}
    </div>
  );
}
