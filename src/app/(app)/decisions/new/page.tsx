import { getCurrentSpace } from "@/lib/space";
import { getSpaceTags, getSpaceMembers } from "@/lib/queries";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DecisionForm } from "../decision-form";

export default async function NewDecisionPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const [tags, members] = await Promise.all([
    getSpaceTags(space.id),
    getSpaceMembers(space.id),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Decision Log", href: "/decisions" },
        { label: "New decision" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Log a decision
        </h1>
        <p className="text-bark-muted text-sm">
          Record a decision so your organisation can learn from it.
        </p>
      </header>

      <DecisionForm
        tags={tags}
        members={members.map((m) => ({ id: m.userId, name: m.name || m.email }))}
      />
    </div>
  );
}
