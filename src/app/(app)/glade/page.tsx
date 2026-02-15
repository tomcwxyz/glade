import { getCurrentSpace } from "@/lib/space";
import { getDecisions } from "@/lib/queries";
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
    })),
  }));

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <GladeCanvas decisions={serialized} />
    </div>
  );
}
