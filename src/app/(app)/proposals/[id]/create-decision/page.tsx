import { getCurrentSpace } from "@/lib/space";
import { getProposalById } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateDecisionFromProposal } from "./create-decision-form";

export default async function CreateDecisionFromProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const proposal = await getProposalById(space.id, id);
  if (!proposal) notFound();

  // If already linked to a decision, redirect
  if (proposal.linkedDecisionNumber) {
    redirect(`/decisions/${proposal.linkedDecisionNumber}`);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Link
        href={`/proposals/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-bark-muted hover:text-canopy transition-colors mb-8"
      >
        <ArrowLeft size={14} />
        Back to proposal
      </Link>

      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Create decision from proposal
        </h1>
        <p className="text-bark-muted text-sm">
          Record the formal decision for &ldquo;{proposal.title}&rdquo;.
        </p>
      </header>

      <CreateDecisionFromProposal
        proposalId={proposal.id}
        suggestedMethod={proposal.suggestedMethod}
      />
    </div>
  );
}
