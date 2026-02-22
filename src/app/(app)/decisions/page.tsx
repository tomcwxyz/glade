import type { Metadata } from "next";
import { getCurrentSpace } from "@/lib/space";
import { getDecisions, getSpaceTags } from "@/lib/queries";

export const metadata: Metadata = { title: "Decisions" };
import { BookOpen, Download, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { DecisionList } from "./decision-list";

export default async function DecisionsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;
  const [allDecisions, spaceTags] = await Promise.all([
    getDecisions(space.id),
    getSpaceTags(space.id),
  ]);

  // Serialize for client component
  const serialized = allDecisions.map((d) => ({
    id: d.id,
    number: d.number,
    title: d.title,
    description: d.description || "",
    outcome: d.outcome || "",
    method: d.method,
    status: d.status,
    participants: (d.participants as string[]) || [],
    date: d.date.toISOString(),
    tags: d.tags,
    actionsCount: d.actionsCount,
    actionsComplete: d.actionsComplete,
  }));

  // Extract unique participant names across all decisions
  const allParticipants = Array.from(
    new Set(serialized.flatMap((d) => d.participants))
  ).sort();

  const tagNames = spaceTags.map((t) => t.name);

  if (allDecisions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <header className="mb-10">
          <h1
            className="text-3xl font-light tracking-tight mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Decision Log
          </h1>
        </header>
        <EmptyState
          icon={BookOpen}
          title="No decisions yet"
          description="Decisions are the heart of your governance record. Log your first one to get started."
          action={{ label: "Log a decision", href: "/decisions/new" }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      {/* Header */}
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-light tracking-tight mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Decision Log
          </h1>
          <p className="text-bark-muted">
            {allDecisions.length} decisions recorded
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <a
            href="/api/decisions/export"
            download
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
          >
            <Download size={14} />
            Export CSV
          </a>
          <Link
            href="/decisions/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
          >
            <Plus size={16} />
            Log a decision
          </Link>
        </div>
      </header>

      <DecisionList decisions={serialized} tags={tagNames} participants={allParticipants} />
    </div>
  );
}
