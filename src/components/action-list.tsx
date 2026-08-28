import { CheckCircle2, Circle, Clock, ListChecks, MinusCircle, TriangleAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ActionToggle } from "@/app/(app)/actions/action-toggle";
import { DeleteAction } from "@/components/delete-action";

type ActionStatus = "open" | "in_progress" | "complete" | "overdue" | "superseded";

interface ActionItem {
  id: string;
  description: string;
  ownerName: string | null;
  dueDate: Date | null;
  status: ActionStatus;
}

export function ActionList({ actions }: { actions: ActionItem[] }) {
  if (actions.length === 0) return null;

  const completeCount = actions.filter((a) => a.status === "complete").length;

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-4">
        <ListChecks size={14} />
        Actions ({completeCount}/{actions.length} complete)
      </h2>
      <div>
        {actions.map((action) => (
          <ActionRow key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}

function ActionRow({ action }: { action: ActionItem }) {
  const icons: Record<ActionStatus, React.ReactNode> = {
    complete: <CheckCircle2 size={16} className="text-canopy" />,
    in_progress: <Clock size={16} className="text-amber" />,
    overdue: <TriangleAlert size={16} className="text-earth" />,
    open: <Circle size={16} className="text-bark-muted" />,
    superseded: <MinusCircle size={16} className="text-bark-muted" />,
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <div className="mt-0.5">
        <ActionToggle actionId={action.id} initialStatus={action.status} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${action.status === "complete" || action.status === "superseded" ? "text-bark-muted line-through" : "text-bark"}`}>
          {action.description}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-bark-muted">
          {action.ownerName && <span>{action.ownerName}</span>}
          {action.ownerName && action.dueDate && <span className="text-border-strong">·</span>}
          {action.dueDate && (
            <span className={action.status === "overdue" ? "text-earth font-medium" : ""}>
              Due {formatDate(action.dueDate.toISOString())}
            </span>
          )}
        </div>
      </div>
      <div className="mt-0.5 shrink-0">
        <DeleteAction actionId={action.id} />
      </div>
    </div>
  );
}
