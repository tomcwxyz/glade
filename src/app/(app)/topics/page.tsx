import { getCurrentSpace } from "@/lib/space";
import { getTopics } from "@/lib/queries";
import { Plus, Lightbulb, HelpCircle, Zap, CalendarPlus, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDateRelative } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof HelpCircle; color: string }> = {
  question: { label: "Question", icon: HelpCircle, color: "text-sky" },
  tension: { label: "Tension", icon: Zap, color: "text-amber" },
  agenda_suggestion: { label: "Agenda", icon: CalendarPlus, color: "text-canopy" },
};

export default async function TopicsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;
  const allTopics = await getTopics(space.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-light tracking-tight mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Topics
          </h1>
          <p className="text-bark-muted">
            {allTopics.length} topic{allTopics.length !== 1 ? "s" : ""} raised
          </p>
        </div>
        <Link
          href="/topics/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus size={16} />
          Raise a topic
        </Link>
      </header>

      {allTopics.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb size={40} className="mx-auto mb-4 text-bark-muted/30" />
          <p className="text-bark-muted mb-2">No topics yet</p>
          <p className="text-sm text-bark-muted/70">
            Raise a question, tension, or agenda suggestion for your group.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {allTopics.map((topic) => {
            const config = TYPE_CONFIG[topic.type] || TYPE_CONFIG.question;
            const Icon = config.icon;
            const promoted = !!topic.promotedToProposalId;

            return (
              <Link
                key={topic.id}
                href={promoted ? `/proposals/${topic.promotedToProposalId}` : `/topics/${topic.id}`}
                className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-paper-warm transition-colors group"
              >
                <Icon
                  size={18}
                  className={`${config.color} shrink-0 opacity-60 group-hover:opacity-100 transition-opacity`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.9375rem] font-medium text-bark truncate">
                      {topic.title}
                    </span>
                    <span className={`text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium shrink-0 ${
                      promoted
                        ? "bg-canopy-pale text-canopy"
                        : "bg-paper-deep text-bark-muted"
                    }`}>
                      {promoted ? "Promoted" : config.label}
                    </span>
                  </div>
                  <div className="text-xs text-bark-muted/60 mt-0.5">
                    {topic.createdByName && `${topic.createdByName} · `}
                    {formatDateRelative(topic.createdAt.toISOString())}
                  </div>
                </div>
                {promoted && (
                  <ArrowRight size={14} className="text-canopy shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
