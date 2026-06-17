"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateGovernanceDigest,
  generateMemberBriefing,
  dismissInsight,
} from "@/lib/ai-actions";
import { MarkdownContent } from "@/components/markdown-content";
import { DownloadButton } from "@/components/download-button";
import { formatDate } from "@/lib/utils";
import { Sparkles, Loader2, X, Newspaper, Users } from "lucide-react";

export interface ArchiveItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const KINDS = {
  digest: {
    icon: Newspaper,
    heading: "Monthly digest",
    description: "A periodic summary of governance activity. Each digest is kept, so you can look back over time — and the AI compares each one to the previous period.",
    generateLabel: "Generate digest",
    empty: "No digests yet. Generate one to start the archive.",
    fileSlug: "governance-digest",
    action: generateGovernanceDigest,
  },
  briefing: {
    icon: Users,
    heading: "Member briefings",
    description: "An onboarding briefing for new members. Past briefings are kept here for reference.",
    generateLabel: "Generate briefing",
    empty: "No briefings yet. Generate one to brief new members.",
    fileSlug: "member-briefing",
    action: generateMemberBriefing,
  },
} as const;

export function InsightArchive({
  kind,
  items,
}: {
  kind: keyof typeof KINDS;
  items: ArchiveItem[];
}) {
  const router = useRouter();
  const config = KINDS[kind];
  const Icon = config.icon;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const result = await config.action();
      if ("error" in result) {
        setError(result.error as string);
      } else {
        // The server action revalidates /insights; refresh to pull the new entry.
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss(id: string) {
    await dismissInsight(id);
    router.refresh();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2
          className="text-lg font-medium tracking-tight flex items-center gap-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <Icon size={18} className="text-bark-muted" />
          {config.heading}
        </h2>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {config.generateLabel}
        </button>
      </div>
      <p className="text-[0.8125rem] text-bark-muted mb-4">{config.description}</p>

      {error && <p className="text-xs text-earth mb-3">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-bark-muted/60 py-2">{config.empty}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <details
              key={item.id}
              open={i === 0}
              className="group bg-paper-warm rounded-xl border border-border overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none select-none hover:bg-paper-deep/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-bark truncate">{item.title}</p>
                  <p className="text-xs text-bark-muted mt-0.5">
                    {formatDate(item.createdAt)}
                    {i === 0 && (
                      <span className="ml-2 text-canopy">· Latest</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <DownloadButton
                    content={item.content}
                    filename={`${config.fileSlug}-${item.createdAt.split("T")[0]}.md`}
                    label="Download"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDismiss(item.id);
                    }}
                    className="text-bark-muted hover:text-earth opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove from archive"
                    aria-label={`Remove ${item.title} from archive`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </summary>
              <div className="px-4 pb-4 pt-3 border-t border-border">
                <MarkdownContent content={item.content} />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
