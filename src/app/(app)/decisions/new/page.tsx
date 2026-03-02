import Link from "next/link";
import { getCurrentSpace } from "@/lib/space";
import { getSpaceTags, getSpaceMembers } from "@/lib/queries";
import { canAddDecision } from "@/lib/billing";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DecisionForm } from "../decision-form";

export default async function NewDecisionPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const [tags, members, allowed] = await Promise.all([
    getSpaceTags(space.id),
    getSpaceMembers(space.id),
    canAddDecision(space.id),
  ]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Decision Log", href: "/decisions" },
        { label: "New decision" },
      ]} />

      {!allowed ? (
        <div className="mt-6 p-6 rounded-xl border border-amber/30 bg-amber/5 text-center">
          <h2
            className="text-xl font-medium tracking-tight mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Decision limit reached
          </h2>
          <p className="text-sm text-bark-muted mb-4">
            Free plans are limited to 50 decisions per space. Upgrade to Canopy for unlimited decisions.
          </p>
          <Link
            href="/settings"
            className="inline-flex px-4 py-2.5 text-sm font-medium text-paper bg-canopy rounded-lg hover:bg-canopy-light transition-colors"
          >
            Upgrade to Canopy
          </Link>
        </div>
      ) : (
        <>
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
            publicEnabled={((space.settings as Record<string, unknown>) || {}).publicDecisionLog === true}
          />
        </>
      )}
    </div>
  );
}
