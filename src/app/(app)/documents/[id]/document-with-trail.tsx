"use client";

import { useMemo, useState } from "react";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Scale, X } from "lucide-react";
import Link from "next/link";
import type { JSONContent } from "@tiptap/react";

interface SectionLink {
  id: string;
  sectionId: string;
  decisionId: string;
  decisionNumber: number;
  decisionTitle: string;
}

export function DocumentWithTrail({
  content,
  sectionLinks,
}: {
  content: Record<string, unknown>;
  sectionLinks: SectionLink[];
}) {
  const [activePopover, setActivePopover] = useState<string | null>(null);

  // Build sectionId → decisions map
  const sectionMap = useMemo(() => {
    const map: Record<string, SectionLink[]> = {};
    for (const link of sectionLinks) {
      if (!map[link.sectionId]) map[link.sectionId] = [];
      map[link.sectionId].push(link);
    }
    return map;
  }, [sectionLinks]);

  // Extract headings from content
  const headings = useMemo(() => {
    const doc = content as JSONContent;
    if (!doc.content) return [];
    return doc.content
      .filter((node) => node.type === "heading")
      .map((node) => {
        const text = (node.content || [])
          .map((c) => c.text || "")
          .join("");
        return text;
      });
  }, [content]);

  const linkedHeadings = headings.filter((h) => sectionMap[h]);

  return (
    <div>
      {/* Linked headings badges */}
      {linkedHeadings.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {linkedHeadings.map((heading) => (
            <div key={heading} className="relative">
              <button
                type="button"
                onClick={() => setActivePopover(activePopover === heading ? null : heading)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-sky/10 text-sky rounded-md border border-sky/20 hover:bg-sky/15 transition-colors"
              >
                <Scale size={11} />
                {heading}
                <span className="ml-0.5 bg-sky/20 rounded px-1">
                  {sectionMap[heading].length}
                </span>
              </button>

              {activePopover === heading && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-paper border border-border rounded-lg shadow-lg z-20 py-2">
                  <div className="flex items-center justify-between px-3 pb-1.5 border-b border-border mb-1">
                    <span className="text-xs font-medium text-bark-muted uppercase tracking-wider">
                      Linked decisions
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      className="text-bark-muted hover:text-bark"
                      aria-label="Close linked decisions"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {sectionMap[heading].map((link) => (
                    <Link
                      key={link.id}
                      href={`/decisions/${link.decisionNumber}`}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-paper-warm transition-colors text-sm"
                    >
                      <span className="text-xs text-bark-muted font-mono">
                        #{link.decisionNumber}
                      </span>
                      <span className="text-bark truncate">{link.decisionTitle}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document content */}
      <div className="bg-paper-warm rounded-xl border border-border p-8">
        <TiptapEditor content={content as JSONContent} editable={false} />
      </div>
    </div>
  );
}
