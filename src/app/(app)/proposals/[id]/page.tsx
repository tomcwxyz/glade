import { getCurrentSpace } from "@/lib/space";
import { getProposalById, getActionsByProposal, getSpaceMembers, getProposalMeetings, getMeetingsList, getSpaceTags } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Edit, Clock } from "lucide-react";
import { formatDate, formatDateRelative } from "@/lib/utils";
import { ProposalStatusAdvance } from "./proposal-status-advance";
import { ProposalDiscussion } from "./proposal-discussion";
import { ProposalReferences } from "./proposal-references";
import { ActionList } from "@/components/action-list";
import { AddAction } from "@/components/add-action";
import { MeetingLinks } from "@/components/meeting-links";
import { AddToAgenda } from "./add-to-agenda";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-paper-deep text-bark-muted" },
  open_for_discussion: { label: "Open for Discussion", color: "bg-sky/10 text-sky" },
  ready_for_decision: { label: "Ready for Decision", color: "bg-amber-pale text-amber" },
  decided: { label: "Decided", color: "bg-canopy-pale text-canopy" },
  implemented: { label: "Implemented", color: "bg-canopy-pale text-canopy" },
};

const METHOD_LABELS: Record<string, string> = {
  consent: "Consent",
  majority_vote: "Majority Vote",
  advice_process: "Advice Process",
  delegation: "Delegation",
  consensus: "Consensus",
  lazy_consensus: "Lazy Consensus",
};

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const proposal = await getProposalById(space.id, id);
  if (!proposal) notFound();

  const [proposalActions, members, proposalMeetings, allMeetings, spaceTags] = await Promise.all([
    getActionsByProposal(proposal.id),
    getSpaceMembers(space.id),
    getProposalMeetings(proposal.id),
    getMeetingsList(space.id),
    getSpaceTags(space.id),
  ]);
  const ownerMembers = members
    .filter((m) => m.name)
    .map((m) => ({ id: m.userId, name: m.name as string }));
  const tagOptions = spaceTags.map((t) => ({ id: t.id, name: t.name, color: t.color }));

  const upcomingMeetings = allMeetings
    .filter((m) => m.status === "draft" || m.status === "scheduled" || m.status === "in_progress")
    .map((m) => ({ id: m.id, title: m.title, date: m.date.toISOString() }));

  const config = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;

  // Build threaded comments
  const rootComments = proposal.comments.filter((c) => !c.parentId);
  const replies = proposal.comments.filter((c) => c.parentId);

  const serializedComments = rootComments.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    replies: replies
      .filter((r) => r.parentId === c.id)
      .map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Proposals", href: "/proposals" },
        { label: proposal.title },
      ]} />

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${config.color}`}>
                {config.label}
              </span>
              {proposal.suggestedMethod && (
                <span className="text-xs text-bark-muted">
                  Suggested: {METHOD_LABELS[proposal.suggestedMethod] || proposal.suggestedMethod}
                </span>
              )}
            </div>
            <h1
              className="text-3xl font-light tracking-tight mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {proposal.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-bark-muted">
              {proposal.createdByName && (
                <span>by {proposal.createdByName}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {formatDate(proposal.createdAt.toISOString())}
              </span>
            </div>
            {proposal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {proposal.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-paper-deep text-bark-muted text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ProposalStatusAdvance
              proposalId={proposal.id}
              currentStatus={proposal.status}
            />
            <Link
              href={`/proposals/${proposal.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
            >
              <Edit size={14} />
              Edit
            </Link>
            <AddToAgenda proposalId={proposal.id} meetings={upcomingMeetings} />
          </div>
        </div>
      </header>

      {/* Proposal content */}
      <div className="space-y-6 mb-10">
        {proposal.description && (
          <div>
            <h2 className="text-sm font-semibold text-bark-muted uppercase tracking-wider mb-2">
              Description
            </h2>
            <div className="bg-paper-warm rounded-xl border border-border p-6">
              <p className="text-[0.9375rem] leading-relaxed text-bark whitespace-pre-wrap">
                {proposal.description}
              </p>
            </div>
          </div>
        )}

        {proposal.rationale && (
          <div>
            <h2 className="text-sm font-semibold text-bark-muted uppercase tracking-wider mb-2">
              Rationale
            </h2>
            <div className="bg-paper-warm rounded-xl border border-border p-6">
              <p className="text-[0.9375rem] leading-relaxed text-bark whitespace-pre-wrap">
                {proposal.rationale}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* References */}
      <div className="mb-10">
        <ProposalReferences
          proposalId={proposal.id}
          references={proposal.references}
        />
      </div>

      {/* Actions */}
      <div className="mb-10 space-y-4">
        <ActionList actions={proposalActions} />
        <AddAction parentType="proposal" parentId={proposal.id} members={ownerMembers} tags={tagOptions} />
      </div>

      {/* Decision link */}
      {proposal.status === "decided" && !proposal.linkedDecisionNumber && (
        <div className="mb-10 p-4 bg-canopy-pale/40 rounded-xl border border-canopy/20">
          <p className="text-sm text-bark mb-2">
            This proposal has been decided. Create a formal decision record?
          </p>
          <Link
            href={`/proposals/${proposal.id}/create-decision`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
          >
            Create decision
          </Link>
        </div>
      )}

      {proposal.linkedDecisionNumber && (
        <div className="mb-10 p-4 bg-paper-warm rounded-xl border border-border">
          <p className="text-sm text-bark">
            Recorded as{" "}
            <Link
              href={`/decisions/${proposal.linkedDecisionNumber}`}
              className="text-canopy font-medium hover:underline"
            >
              Decision #{proposal.linkedDecisionNumber}
            </Link>
          </p>
        </div>
      )}

      {/* Meeting links */}
      <div className="mb-10">
        <MeetingLinks
          entityType="proposal"
          entityId={proposal.id}
          linkedMeetings={proposalMeetings.map((m) => ({
            ...m,
            date: m.date.toISOString(),
          }))}
          allMeetings={allMeetings.map((m) => ({
            ...m,
            date: m.date.toISOString(),
          }))}
        />
      </div>

      {/* Discussion */}
      <ProposalDiscussion
        proposalId={proposal.id}
        comments={serializedComments}
      />
    </div>
  );
}
