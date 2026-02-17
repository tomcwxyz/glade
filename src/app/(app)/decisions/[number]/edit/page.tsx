import { getCurrentSpace } from "@/lib/space";
import { getDecisionByNumber, getSpaceTags, getSpaceMembers } from "@/lib/queries";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DecisionForm } from "../../decision-form";
import { notFound } from "next/navigation";

export default async function EditDecisionPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const [decision, allTags, members] = await Promise.all([
    getDecisionByNumber(space.id, parseInt(number, 10)),
    getSpaceTags(space.id),
    getSpaceMembers(space.id),
  ]);

  if (!decision) return notFound();

  // Get the tag IDs for this decision
  const decisionTagIds = allTags
    .filter((t) => decision.tags.includes(t.name))
    .map((t) => t.id);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Decision Log", href: "/decisions" },
        { label: `#${decision.number} ${decision.title}`, href: `/decisions/${decision.number}` },
        { label: "Edit" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Edit decision #{decision.number}
        </h1>
        <p className="text-bark-muted text-sm">{decision.title}</p>
      </header>

      <DecisionForm
        tags={allTags}
        members={members.map((m) => ({ id: m.userId, name: m.name || m.email }))}
        decision={{
          id: decision.id,
          title: decision.title,
          description: decision.description,
          rationale: decision.rationale,
          method: decision.method,
          outcome: decision.outcome,
          status: decision.status,
          participants: (decision.participants as string[]) || [],
          date: decision.date.toISOString(),
          conditions: decision.conditions,
          reviewDate: decision.reviewDate?.toISOString() || null,
          tagIds: decisionTagIds,
        }}
      />
    </div>
  );
}
