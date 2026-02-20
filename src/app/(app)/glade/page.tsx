import type { Metadata } from "next";
import { getCurrentSpace } from "@/lib/space";
import { getDecisions } from "@/lib/queries";
import { TreePine } from "lucide-react";

export const metadata: Metadata = { title: "The Glade" };
import { EmptyState } from "@/components/empty-state";
import { GladeCanvas } from "./glade-canvas";

export default async function GladePage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const decisions = await getDecisions(space.id);

  // Serialize dates for client component
  const serialized = decisions.map((d) => ({
    id: d.id,
    number: d.number,
    title: d.title,
    description: d.description || "",
    rationale: d.rationale || "",
    method: d.method,
    outcome: d.outcome || "",
    status: d.status,
    participants: (d.participants as string[]) || [],
    date: d.date.toISOString(),
    tags: d.tags,
    reviewDate: d.reviewDate?.toISOString() || null,
    actionsCount: d.actionsCount,
    actionsComplete: d.actionsComplete,
    linkedDecisions: d.linkedDecisions.map((l) => ({
      id: l.id,
      number: l.number,
      title: l.title,
      relation: l.relation,
      direction: l.direction as "forward" | "reverse",
    })),
  }));

  if (decisions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <EmptyState
          icon={TreePine}
          title="Your glade awaits"
          description="Once you log decisions they'll appear here as an interactive visual map of your governance landscape."
          action={{ label: "Log a decision", href: "/decisions/new" }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GladeCanvas decisions={serialized} />
    </div>
  );
}
