import { getCurrentSpace } from "@/lib/space";
import { getDecisions } from "@/lib/queries";
import { Plus } from "lucide-react";
import Link from "next/link";
import { DecisionList } from "./decision-list";

export default async function DecisionsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;
  const allDecisions = await getDecisions(space.id);

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      {/* Header */}
      <header className="mb-10 flex items-end justify-between">
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
        <Link
          href="/decisions/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
        >
          <Plus size={16} />
          Log a decision
        </Link>
      </header>

      <DecisionList decisions={serialized} />
    </div>
  );
}
