import { getCurrentSpace } from "@/lib/space";
import { getTopicById } from "@/lib/queries";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Clock, HelpCircle, Zap, CalendarPlus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PromoteTopicButton } from "./promote-topic-button";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof HelpCircle; color: string }> = {
  question: { label: "Question", icon: HelpCircle, color: "text-sky" },
  tension: { label: "Tension", icon: Zap, color: "text-amber" },
  agenda_suggestion: { label: "Agenda Suggestion", icon: CalendarPlus, color: "text-canopy" },
};

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const topic = await getTopicById(space.id, id);
  if (!topic) notFound();

  const config = TYPE_CONFIG[topic.type] || TYPE_CONFIG.question;
  const Icon = config.icon;
  const promoted = !!topic.promotedToProposalId;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Topics", href: "/topics" },
        { label: topic.title },
      ]} />

      <header className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={config.color} />
              <span className="text-xs uppercase tracking-wider text-bark-muted font-medium">
                {config.label}
              </span>
              {promoted && (
                <span className="text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-canopy-pale text-canopy font-medium">
                  Promoted to proposal
                </span>
              )}
            </div>
            <h1
              className="text-3xl font-light tracking-tight mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {topic.title}
            </h1>
            <div className="flex items-center gap-3 text-sm text-bark-muted">
              {topic.createdByName && (
                <span>by {topic.createdByName}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {formatDate(topic.createdAt.toISOString())}
              </span>
            </div>
          </div>

          {!promoted && (
            <div className="shrink-0">
              <PromoteTopicButton topicId={topic.id} />
            </div>
          )}
        </div>
      </header>

      {topic.description && (
        <div className="bg-paper-warm rounded-xl border border-border p-6">
          <p className="text-[0.9375rem] leading-relaxed text-bark whitespace-pre-wrap">
            {topic.description}
          </p>
        </div>
      )}

      {promoted && topic.promotedToProposalId && (
        <div className="mt-6 px-4 py-3 rounded-lg bg-canopy-pale/30 border border-canopy/20">
          <p className="text-sm text-bark">
            This topic has been promoted to a proposal.{" "}
            <Link
              href={`/proposals/${topic.promotedToProposalId}`}
              className="text-canopy font-medium hover:underline"
            >
              View proposal →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
