import type { Metadata } from "next";
import { getCurrentSpace } from "@/lib/space";
import { getActions } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Actions" };
import { CheckCircle2, Circle, Clock, ListChecks, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { ActionToggle } from "./action-toggle";

const STATUS_CONFIG = {
  overdue: { icon: TriangleAlert, label: "Overdue", color: "text-earth", bg: "bg-earth/8" },
  open: { icon: Circle, label: "Open", color: "text-bark-muted", bg: "bg-paper-deep" },
  in_progress: { icon: Clock, label: "In Progress", color: "text-amber", bg: "bg-amber-pale" },
  complete: { icon: CheckCircle2, label: "Complete", color: "text-canopy", bg: "bg-canopy-pale/50" },
};

export default async function ActionsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const actions = await getActions(space.id);

  if (actions.length === 0) {
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
        <EmptyState
          icon={ListChecks}
          title="No actions yet"
          description="Actions are created when you log decisions. Each decision can have follow-up tasks assigned to team members."
          action={{ label: "Log a decision", href: "/decisions/new" }}
        />
      </div>
    );
  }

  const sorted = [...actions].sort((a, b) => {
    const order = { overdue: 0, in_progress: 1, open: 2, complete: 3 };
    return order[a.status] - order[b.status];
  });

  const openCount = actions.filter((a) => a.status !== "complete").length;

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
          {openCount} open action{openCount !== 1 ? "s" : ""} across {actions.length} total
        </p>
      </header>

      <div className="space-y-1">
        {sorted.map((action) => {
          const config = STATUS_CONFIG[action.status];
          const Icon = config.icon;

          return (
            <div
              key={action.id}
              className="flex items-start gap-3 sm:gap-4 py-4 border-b border-border last:border-b-0 -mx-3 px-3"
            >
              <ActionToggle actionId={action.id} initialStatus={action.status} />
              <div className="flex-1 min-w-0">
                <p className={`text-[0.9375rem] leading-snug ${action.status === "complete" ? "text-bark-muted line-through" : "text-bark"}`}>
                  {action.description}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-bark-muted">
                  <span>{action.ownerName}</span>
                  <span className="text-border-strong">·</span>
                  <Link
                    href={`/decisions/${action.decisionNumber}`}
                    className="hover:text-canopy transition-colors truncate"
                  >
                    #{action.decisionNumber} {action.decisionTitle}
                  </Link>
                  <span className="text-border-strong">·</span>
                  <span className={action.status === "overdue" ? "text-earth font-medium" : ""}>
                    {formatDate(action.dueDate?.toISOString() ?? "")}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
