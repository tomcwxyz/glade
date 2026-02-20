import type { Metadata } from "next";
import { getCurrentSpace } from "@/lib/space";
import { getProposals } from "@/lib/queries";
import { Plus, MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Proposals" };
import Link from "next/link";
import { formatDateRelative } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-paper-deep text-bark-muted" },
  open_for_discussion: { label: "Open for Discussion", color: "bg-sky/10 text-sky" },
  ready_for_decision: { label: "Ready for Decision", color: "bg-amber-pale text-amber" },
  decided: { label: "Decided", color: "bg-canopy-pale text-canopy" },
  implemented: { label: "Implemented", color: "bg-canopy-pale text-canopy" },
};

const STATUS_ORDER = [
  "open_for_discussion",
  "ready_for_decision",
  "draft",
  "decided",
  "implemented",
];

export default async function ProposalsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;
  const allProposals = await getProposals(space.id);

  // Group by status
  const grouped = allProposals.reduce<Record<string, typeof allProposals>>(
    (acc, p) => {
      const key = p.status;
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-light tracking-tight mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Proposals
          </h1>
          <p className="text-bark-muted">
            {allProposals.length} proposal{allProposals.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/proposals/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus size={16} />
          New proposal
        </Link>
      </header>

      {allProposals.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare size={40} className="mx-auto mb-4 text-bark-muted/30" />
          <p className="text-bark-muted mb-2">No proposals yet</p>
          <p className="text-sm text-bark-muted/70">
            Create a proposal to start the decision-making process.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {STATUS_ORDER.map((status) => {
            const items = grouped[status];
            if (!items || items.length === 0) return null;
            const config = STATUS_CONFIG[status];
            return (
              <section key={status}>
                <h2 className="text-sm font-semibold text-bark-muted uppercase tracking-wider mb-3">
                  {config?.label || status}
                </h2>
                <div className="space-y-1">
                  {items.map((proposal) => (
                    <Link
                      key={proposal.id}
                      href={`/proposals/${proposal.id}`}
                      className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-paper-warm transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.9375rem] font-medium text-bark truncate">
                            {proposal.title}
                          </span>
                          <span className={`text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium shrink-0 ${config?.color}`}>
                            {config?.label}
                          </span>
                        </div>
                        {proposal.description && (
                          <p className="text-sm text-bark-muted mt-0.5 truncate">
                            {proposal.description}
                          </p>
                        )}
                        <div className="text-xs text-bark-muted/60 mt-1">
                          {proposal.createdByName && `${proposal.createdByName} · `}
                          {formatDateRelative(proposal.updatedAt.toISOString())}
                          {proposal.commentCount > 0 && (
                            <span className="ml-2 inline-flex items-center gap-0.5">
                              <MessageSquare size={11} />
                              {proposal.commentCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
