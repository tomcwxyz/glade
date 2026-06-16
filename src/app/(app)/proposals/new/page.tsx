import { getCurrentSpace } from "@/lib/space";
import { getSpaceTags } from "@/lib/queries";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProposalForm } from "../proposal-form";

export default async function NewProposalPage() {
  const space = await getCurrentSpace();
  if (!space) return null;
  const tags = await getSpaceTags(space.id);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Proposals", href: "/proposals" },
        { label: "New proposal" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New proposal
        </h1>
        <p className="text-bark-muted text-sm">
          Propose a change for your organisation to consider.
        </p>
      </header>

      <ProposalForm
        publicEnabled={((space.settings as Record<string, unknown>) || {}).publicProposals === true}
        tags={tags}
      />
    </div>
  );
}
