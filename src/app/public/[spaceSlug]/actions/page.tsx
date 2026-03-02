import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSpace, getPublicActions } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}): Promise<Metadata> {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  return { title: space ? `${space.name} — Actions` : "Actions" };
}

const STATUS_STYLES: Record<string, string> = {
  open: "bg-sky/10 text-sky",
  in_progress: "bg-amber/10 text-amber",
  complete: "bg-canopy/10 text-canopy",
  overdue: "bg-earth/10 text-earth",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  complete: "Complete",
  overdue: "Overdue",
};

export default async function PublicActionsPage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) notFound();

  const settings = (space.settings as Record<string, unknown>) || {};
  if (settings.publicActions !== true) notFound();

  const actions = await getPublicActions(space.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2.5 mb-1.5">
          <CheckCircle2 size={20} className="text-bark-muted" />
          <h2
            className="text-2xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Actions
          </h2>
        </div>
        <p className="text-bark-muted text-sm">
          {actions.length} action{actions.length !== 1 ? "s" : ""} tracked
        </p>
      </header>

      {actions.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 size={40} className="mx-auto mb-4 text-bark-muted/30" />
          <p className="text-bark-muted">No public actions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((a) => (
            <div
              key={a.id}
              className="px-4 py-3.5 rounded-lg border border-border bg-paper-warm hover:bg-paper-warm/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[0.9375rem] font-medium text-bark">
                      {a.description}
                    </span>
                    <span
                      className={`text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
                        STATUS_STYLES[a.status] || "bg-paper-deep text-bark-muted"
                      }`}
                    >
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-bark-muted flex-wrap">
                    {a.ownerName && <span>{a.ownerName}</span>}
                    {a.ownerName && a.decisionTitle && (
                      <span className="text-bark-muted/30">·</span>
                    )}
                    {a.decisionTitle && (
                      <span>
                        #{a.decisionNumber} {a.decisionTitle}
                      </span>
                    )}
                    {a.dueDate && (
                      <>
                        <span className="text-bark-muted/30">·</span>
                        <span>Due {formatDate(a.dueDate.toISOString())}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
