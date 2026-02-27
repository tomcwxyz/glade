"use client";

import { useState } from "react";
import { addProposalReference, removeProposalReference } from "@/lib/proposal-actions";
import { ExternalLink, Plus, X, Loader2 } from "lucide-react";

interface Reference {
  id: string;
  title: string;
  url: string;
}

const inputClass =
  "w-full px-3 py-2 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

export function ProposalReferences({
  proposalId,
  references,
}: {
  proposalId: string;
  references: Reference[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!title.trim() || !url.trim()) return;
    setLoading(true);
    await addProposalReference(proposalId, title, url);
    setTitle("");
    setUrl("");
    setShowForm(false);
    setLoading(false);
  }

  async function handleRemove(refId: string) {
    await removeProposalReference(refId);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-bark-muted uppercase tracking-wider">
          References
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs text-canopy hover:text-canopy-light transition-colors"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {references.length === 0 && !showForm && (
        <p className="text-sm text-bark-muted/60">No references added.</p>
      )}

      <div className="space-y-2">
        {references.map((ref) => (
          <div
            key={ref.id}
            className="flex items-center gap-2 group"
          >
            <ExternalLink size={13} className="text-bark-muted shrink-0" />
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-canopy hover:underline truncate flex-1"
            >
              {ref.title}
            </a>
            <button
              type="button"
              onClick={() => handleRemove(ref.id)}
              className="text-bark-muted hover:text-earth opacity-0 group-hover:opacity-100 transition-all shrink-0"
              aria-label="Remove reference"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="mt-3 p-3 bg-paper-warm rounded-lg border border-border space-y-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reference title"
            className={inputClass}
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !title.trim() || !url.trim()}
              className="px-3 py-1.5 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : "Add reference"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setTitle(""); setUrl(""); }}
              className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
