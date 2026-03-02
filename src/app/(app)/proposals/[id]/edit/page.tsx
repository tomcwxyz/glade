import { getCurrentSpace } from "@/lib/space";
import { getProposalById } from "@/lib/queries";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProposalForm } from "../../proposal-form";

export default async function EditProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const proposal = await getProposalById(space.id, id);
  if (!proposal) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Proposals", href: "/proposals" },
        { label: proposal.title, href: `/proposals/${proposal.id}` },
        { label: "Edit" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Edit proposal
        </h1>
      </header>

      <ProposalForm
        publicEnabled={((space.settings as Record<string, unknown>) || {}).publicProposals === true}
        proposal={{
          id: proposal.id,
          title: proposal.title,
          description: proposal.description,
          rationale: proposal.rationale,
          suggestedMethod: proposal.suggestedMethod,
          isPublic: proposal.isPublic,
        }}
      />
    </div>
  );
}
