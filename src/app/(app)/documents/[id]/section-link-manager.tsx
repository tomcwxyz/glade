"use client";

import { useState, useMemo } from "react";
import { addSectionLink, removeSectionLink } from "@/lib/document-actions";
import { Link2, Plus, Trash2, Loader2 } from "lucide-react";
import type { JSONContent } from "@tiptap/react";

interface SectionLink {
  id: string;
  sectionId: string;
  decisionId: string;
  decisionNumber: number;
  decisionTitle: string;
}

interface Decision {
  id: string;
  number: number;
  title: string;
}

const selectClass =
  "w-full px-3 py-2 text-sm bg-paper-warm border border-border rounded-lg focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

export function SectionLinkManager({
  documentId,
  content,
  sectionLinks,
  decisions,
}: {
  documentId: string;
  content: Record<string, unknown>;
  sectionLinks: SectionLink[];
  decisions: Decision[];
}) {
  const [selectedHeading, setSelectedHeading] = useState("");
  const [selectedDecisionId, setSelectedDecisionId] = useState("");
  const [loading, setLoading] = useState(false);

  // Extract headings from content
  const headings = useMemo(() => {
    const doc = content as JSONContent;
    if (!doc.content) return [];
    return doc.content
      .filter((node) => node.type === "heading")
      .map((node) => {
        return (node.content || []).map((c) => c.text || "").join("");
      })
      .filter(Boolean);
  }, [content]);

  async function handleAdd() {
    if (!selectedHeading || !selectedDecisionId) return;
    setLoading(true);
    await addSectionLink(documentId, selectedHeading, selectedDecisionId);
    setSelectedHeading("");
    setSelectedDecisionId("");
    setLoading(false);
  }

  async function handleRemove(linkId: string) {
    await removeSectionLink(linkId);
  }

  return (
    <div className="mt-8">
      <h2
        className="text-lg font-medium tracking-tight mb-4"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Decision trail
      </h2>

      {/* Existing links */}
      {sectionLinks.length > 0 && (
        <div className="space-y-1.5 mb-4">
          {sectionLinks.map((link) => (
            <div
              key={link.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-paper-warm border border-border group"
            >
              <Link2 size={13} className="text-bark-muted shrink-0" />
              <span className="text-sm text-bark-muted font-medium truncate">
                {link.sectionId}
              </span>
              <span className="text-bark-muted">→</span>
              <span className="text-sm text-bark truncate flex-1">
                #{link.decisionNumber} {link.decisionTitle}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(link.id)}
                className="text-bark-muted hover:text-earth opacity-0 group-hover:opacity-100 transition-all shrink-0"
                aria-label="Remove section link"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new link */}
      {headings.length > 0 && decisions.length > 0 && (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs text-bark-muted mb-1">Section</label>
            <select
              value={selectedHeading}
              onChange={(e) => setSelectedHeading(e.target.value)}
              className={selectClass}
            >
              <option value="">Select heading…</option>
              {headings.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-bark-muted mb-1">Decision</label>
            <select
              value={selectedDecisionId}
              onChange={(e) => setSelectedDecisionId(e.target.value)}
              className={selectClass}
            >
              <option value="">Select decision…</option>
              {decisions.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.number} {d.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={loading || !selectedHeading || !selectedDecisionId}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Link
          </button>
        </div>
      )}
    </div>
  );
}
