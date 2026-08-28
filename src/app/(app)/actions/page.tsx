import type { Metadata } from "next";
import { getCurrentSpace, requireUser } from "@/lib/space";
import { getActions, getDecisionsList, getTopics, getProposals, getSpaceMembers, getSpaceTags } from "@/lib/queries";
import { formatDate, tagDotClass } from "@/lib/utils";

export const metadata: Metadata = { title: "Actions" };
import { CheckCircle2, Circle, Clock, ListChecks, MinusCircle, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ActionToggle } from "./action-toggle";
import { ActionVisibilityToggle } from "./action-visibility";
import { EditAction } from "@/components/edit-action";
import { AddActionWithParent } from "@/components/add-action-with-parent";
import { Pagination, PAGE_SIZE, parsePage } from "@/components/pagination";

const STATUS_CONFIG = {
  overdue: { icon: TriangleAlert, label: "Overdue", color: "text-earth", bg: "bg-earth/8" },
  open: { icon: Circle, label: "Open", color: "text-bark-muted", bg: "bg-paper-deep" },
  in_progress: { icon: Clock, label: "In Progress", color: "text-amber", bg: "bg-amber-pale" },
  complete: { icon: CheckCircle2, label: "Complete", color: "text-canopy", bg: "bg-canopy-pale/50" },
  superseded: { icon: MinusCircle, label: "Superseded", color: "text-bark-muted", bg: "bg-paper-deep" },
};

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tag?: string }>;
}) {
  const space = await getCurrentSpace();
  if (!space) return null;
  const user = await requireUser();

  const sp = await searchParams;
  const page = parsePage(sp.page);
  const offset = (page - 1) * PAGE_SIZE;

  const spaceTags = await getSpaceTags(space.id);
  const activeTag = sp.tag && spaceTags.some((t) => t.id === sp.tag) ? sp.tag : undefined;

  // getActions paginated; the topic/proposal picker calls stay unbounded.
  const [actionsPage, allDecisions, allTopics, allProposals, members] = await Promise.all([
    getActions(space.id, { limit: PAGE_SIZE + 1, offset, tagId: activeTag }),
    getDecisionsList(space.id),
    getTopics(space.id),
    getProposals(space.id),
    getSpaceMembers(space.id),
  ]);

  const tagOptions = spaceTags.map((t) => ({ id: t.id, name: t.name, color: t.color }));

  const hasMore = actionsPage.length > PAGE_SIZE;
  const actions = actionsPage.slice(0, PAGE_SIZE);

  // Only members+ can change an action's public visibility.
  const currentMember = members.find((m) => m.userId === user.id || m.email === user.email);
  const canEdit = currentMember?.role !== "observer";

  const parents = [
    ...allDecisions.map((d) => ({
      type: "decision" as const,
      id: d.id,
      label: `#${d.number} ${d.title}`,
    })),
    ...allTopics.map((t) => ({
      type: "topic" as const,
      id: t.id,
      label: t.title,
    })),
    ...allProposals.map((p) => ({
      type: "proposal" as const,
      id: p.id,
      label: p.title,
    })),
  ];

  const ownerMembers = members
    .filter((m) => m.name)
    .map((m) => ({ id: m.userId, name: m.name as string }));

  if (actions.length === 0 && !activeTag) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <header className="mb-10">
          <h1
            className="text-3xl font-light tracking-tight mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Actions
          </h1>
        </header>
        {parents.length > 0 ? (
          <div className="space-y-6">
            <p className="text-bark-muted text-sm">
              No actions yet. Add one to a decision, topic, or proposal.
            </p>
            <AddActionWithParent parents={parents} members={ownerMembers} tags={tagOptions} />
          </div>
        ) : (
          <EmptyState
            icon={ListChecks}
            title="No actions yet"
            description="Actions can be added to decisions, topics, or proposals. Create one of those first, then add follow-up tasks."
          />
        )}
      </div>
    );
  }

  const sorted = [...actions].sort((a, b) => {
    const order = { overdue: 0, in_progress: 1, open: 2, complete: 3, superseded: 4 };
    return order[a.status] - order[b.status];
  });

  const openCount = actions.filter((a) => a.status !== "complete" && a.status !== "superseded").length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10">
        <h1
          className="text-3xl font-light tracking-tight mb-1.5"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Actions
        </h1>
        <p className="text-bark-muted">
          {openCount} open action{openCount !== 1 ? "s" : ""}
          {page > 1 ? ` · page ${page}` : ""}
        </p>
      </header>

      {/* Tag filter */}
      {spaceTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <Link
            href="/actions"
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              !activeTag
                ? "bg-canopy-pale text-canopy border-canopy/30 font-medium"
                : "bg-paper-warm text-bark-muted border-border hover:text-bark hover:border-canopy/30"
            }`}
          >
            All
          </Link>
          {spaceTags.map((tag) => {
            const isActive = activeTag === tag.id;
            return (
              <Link
                key={tag.id}
                href={isActive ? "/actions" : `/actions?tag=${tag.id}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  isActive
                    ? "bg-canopy-pale text-canopy border-canopy/30 font-medium"
                    : "bg-paper-warm text-bark-muted border-border hover:text-bark hover:border-canopy/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${tagDotClass(tag.color)}`} />
                {tag.name}
              </Link>
            );
          })}
        </div>
      )}

      {actions.length === 0 ? (
        <p className="text-bark-muted text-sm py-8 text-center">
          No actions with this tag.{" "}
          <Link href="/actions" className="text-canopy hover:text-canopy-light">
            Clear filter
          </Link>
        </p>
      ) : (
      <div className="space-y-1">
        {sorted.map((action) => {
          const config = STATUS_CONFIG[action.status];

          return (
            <div
              key={action.id}
              className="flex items-start gap-3 sm:gap-4 py-4 border-b border-border last:border-b-0 -mx-3 px-3"
            >
              <ActionToggle actionId={action.id} initialStatus={action.status} />
              <div className="flex-1 min-w-0">
                <p className={`text-[0.9375rem] leading-snug ${action.status === "complete" || action.status === "superseded" ? "text-bark-muted line-through" : "text-bark"}`}>
                  {action.description}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-bark-muted">
                  {action.ownerName && <span>{action.ownerName}</span>}
                  {action.ownerName && <span className="text-border-strong">·</span>}
                  <Link
                    href={action.parentHref}
                    className="hover:text-canopy transition-colors truncate"
                  >
                    {action.parentTitle}
                  </Link>
                  {action.dueDate && (
                    <>
                      <span className="text-border-strong">·</span>
                      <span className={action.status === "overdue" ? "text-earth font-medium" : ""}>
                        {formatDate(action.dueDate?.toISOString() ?? "")}
                      </span>
                    </>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
                {action.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {action.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[0.6875rem] px-1.5 py-0.5 rounded bg-paper-deep text-bark-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-3 pt-0.5">
                  <EditAction actionId={action.id} members={ownerMembers} tags={tagOptions} />
                  <ActionVisibilityToggle actionId={action.id} isPublic={action.isPublic} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      <Pagination
        page={page}
        hasMore={hasMore}
        basePath="/actions"
        params={{ tag: activeTag }}
      />

      {parents.length > 0 && (
        <div className="mt-8">
          <AddActionWithParent parents={parents} members={ownerMembers} tags={tagOptions} />
        </div>
      )}
    </div>
  );
}
