import { getCurrentSpace } from "@/lib/space";
import {
  getDecisionByNumber,
  getDecisionLinksWithIds,
  getDecisionMeetings,
  getDecisionsList,
  getMeetingsList,
  getDecisionReviewInsight,
} from "@/lib/queries";
import { isAiEnabled } from "@/lib/ai";
import { formatDate } from "@/lib/utils";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  EyeOff,
  ListChecks,
  Pencil,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { StatusAdvance } from "./status-advance";
import { DeleteDecision } from "./delete-decision";
import { DeleteAction } from "./delete-action";
import { DecisionLinksEditor } from "./decision-links-editor";
import { ReviewQuestions } from "./review-questions";
import { DocumentSuggestions } from "./document-suggestions";

type DecisionStatus = "decided" | "implemented" | "reviewed" | "learned";
type DecisionMethod =
  | "consent"
  | "majority_vote"
  | "advice_process"
  | "delegation"
  | "consensus"
  | "lazy_consensus";
type ActionStatus = "open" | "in_progress" | "complete" | "overdue";

const METHOD_LABELS: Record<DecisionMethod, string> = {
  consent: "Consent",
  majority_vote: "Majority Vote",
  advice_process: "Advice Process",
  delegation: "Delegation",
  consensus: "Consensus",
  lazy_consensus: "Lazy Consensus",
};

const STATUS_LABELS: Record<DecisionStatus, string> = {
  decided: "Decided",
  implemented: "Implemented",
  reviewed: "Reviewed",
  learned: "Learned",
};

function StatusBadge({ status }: { status: DecisionStatus }) {
  const config: Record<DecisionStatus, { bg: string; text: string; border: string }> = {
    decided: { bg: "bg-status-decided/8", text: "text-status-decided", border: "border-status-decided/20" },
    implemented: { bg: "bg-status-implemented/8", text: "text-status-implemented", border: "border-status-implemented/20" },
    reviewed: { bg: "bg-status-reviewed/8", text: "text-status-reviewed", border: "border-status-reviewed/20" },
    learned: { bg: "bg-status-learned/8", text: "text-status-learned", border: "border-status-learned/20" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.text.replace("text-", "bg-")}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

function ActionRow({ action }: { action: { id: string; description: string; ownerName: string | null; dueDate: Date | null; status: ActionStatus } }) {
  const icons = {
    complete: <CheckCircle2 size={16} className="text-canopy" />,
    in_progress: <Clock size={16} className="text-amber" />,
    overdue: <TriangleAlert size={16} className="text-earth" />,
    open: <Circle size={16} className="text-bark-muted" />,
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <div className="mt-0.5">{icons[action.status]}</div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${action.status === "complete" ? "text-bark-muted line-through" : "text-bark"}`}>
          {action.description}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-bark-muted">
          <span>{action.ownerName}</span>
          <span className="text-border-strong">·</span>
          <span className={action.status === "overdue" ? "text-earth font-medium" : ""}>
            Due {action.dueDate ? formatDate(action.dueDate.toISOString()) : "N/A"}
          </span>
        </div>
      </div>
      <div className="mt-0.5 shrink-0">
        <DeleteAction actionId={action.id} />
      </div>
    </div>
  );
}

function LifecycleTrack({ status }: { status: DecisionStatus }) {
  const stages: DecisionStatus[] = ["decided", "implemented", "reviewed", "learned"];
  const currentIndex = stages.indexOf(status);

  return (
    <div className="flex items-center gap-0">
      {stages.map((stage, i) => {
        const isComplete = i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={stage} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  isCurrent
                    ? "border-canopy bg-canopy"
                    : isComplete
                      ? "border-canopy bg-canopy/30"
                      : "border-border bg-paper"
                }`}
              />
              <span
                className={`text-[0.625rem] mt-1.5 uppercase tracking-wider ${
                  isCurrent ? "text-canopy font-semibold" : isComplete ? "text-bark-muted" : "text-bark-muted/50"
                }`}
              >
                {STATUS_LABELS[stage]}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={`w-10 h-0.5 mx-1 -mt-4 ${
                  i < currentIndex ? "bg-canopy/30" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;
  const decision = await getDecisionByNumber(space.id, parseInt(number, 10));
  if (!decision) return notFound();

  const aiOn = isAiEnabled(space.settings);

  const [linksWithIds, decisionMeetings, allDecisions, allMeetings, reviewInsight] = await Promise.all([
    getDecisionLinksWithIds(decision.id),
    getDecisionMeetings(decision.id),
    getDecisionsList(space.id),
    getMeetingsList(space.id),
    aiOn && decision.reviewDate ? getDecisionReviewInsight(decision.id) : Promise.resolve(null),
  ]);

  const participants = decision.participants as string[];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Decision Log", href: "/decisions" },
        { label: `#${decision.number} ${decision.title}` },
      ]} />

      {/* Header section */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span
              className="text-sm text-bark-muted font-medium tabular-nums"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Decision #{decision.number}
            </span>
            <StatusBadge status={decision.status as DecisionStatus} />
            {!decision.isPublic && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.625rem] font-medium bg-bark/8 text-bark-muted border border-bark/20">
                <EyeOff size={10} />
                Hidden
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusAdvance decisionId={decision.id} currentStatus={decision.status} />
            <Link
              href={`/decisions/${decision.number}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-bark-muted hover:text-canopy border border-border rounded-lg hover:border-canopy/30 transition-colors"
            >
              <Pencil size={14} />
              Edit
            </Link>
            <DeleteDecision decisionId={decision.id} decisionNumber={decision.number} />
          </div>
        </div>

        <h1
          className="text-2xl font-medium tracking-tight leading-snug mb-4 max-w-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {decision.title}
        </h1>

        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-bark-muted">
          <span>{formatDate(decision.date.toISOString())}</span>
          <span className="text-border-strong">|</span>
          <span>{METHOD_LABELS[decision.method as DecisionMethod]}</span>
          {decision.meetingTitle && (
            <>
              <span className="text-border-strong">|</span>
              <Link href="#" className="hover:text-canopy transition-colors">
                {decision.meetingTitle}
              </Link>
            </>
          )}
          {decision.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded bg-paper-deep text-xs text-bark-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10 lg:gap-14">
        {/* Main content */}
        <div className="space-y-10">
          {/* Description */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-3">
              Context
            </h2>
            <p className="text-[0.9375rem] text-bark leading-relaxed">
              {decision.description}
            </p>
          </section>

          {/* Rationale */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-3">
              Rationale
            </h2>
            <div className="border-l-2 border-canopy/30 pl-4">
              <p className="text-[0.9375rem] text-bark leading-relaxed">
                {decision.rationale}
              </p>
            </div>
          </section>

          {/* Outcome */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-3">
              Outcome
            </h2>
            <div className="bg-canopy-pale/40 rounded-xl px-5 py-4">
              <p className="text-[0.9375rem] text-bark leading-relaxed">
                {decision.outcome}
              </p>
            </div>
          </section>

          {/* Actions */}
          {decision.actions.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2">
                  <ListChecks size={14} />
                  Actions ({decision.actions.filter((a) => a.status === "complete").length}/
                  {decision.actions.length} complete)
                </h2>
              </div>
              <div>
                {decision.actions.map((action) => (
                  <ActionRow key={action.id} action={action} />
                ))}
              </div>
            </section>
          )}

          {/* Linked decisions & meetings */}
          <DecisionLinksEditor
            decisionId={decision.id}
            links={linksWithIds.map((l) => ({
              ...l,
              number: l.number,
              title: l.title,
              relation: l.relation,
              direction: l.direction,
            }))}
            meetings={decisionMeetings.map((m) => ({
              meetingId: m.meetingId,
              title: m.title,
              date: m.date.toISOString(),
            }))}
            allDecisions={allDecisions}
            allMeetings={allMeetings.map((m) => ({
              ...m,
              date: m.date.toISOString(),
            }))}
          />
        </div>

        {/* Right sidebar */}
        <aside className="space-y-8">
          {/* Lifecycle */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-4">
              Lifecycle
            </h2>
            <LifecycleTrack status={decision.status as DecisionStatus} />
          </section>

          {/* Review date */}
          {decision.reviewDate && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-3">
                Scheduled review
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock size={15} className="text-amber" />
                <span className="text-bark">{formatDate(decision.reviewDate.toISOString())}</span>
              </div>
            </section>
          )}

          {/* Participants */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-3">
              <Users size={13} />
              Participants ({participants.length})
            </h2>
            <div className="space-y-2">
              {participants.map((name) => (
                <div key={name} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-paper-deep border border-border flex items-center justify-center text-[0.6875rem] font-medium text-bark-muted shrink-0">
                    {name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="text-sm text-bark">{name}</span>
                </div>
              ))}
            </div>
          </section>

          {/* AI: Review questions */}
          {aiOn && decision.reviewDate && (
            <ReviewQuestions
              decisionId={decision.id}
              cachedContent={reviewInsight?.content ?? null}
            />
          )}

          {/* AI: Document suggestions */}
          {aiOn && (
            <DocumentSuggestions decisionId={decision.id} />
          )}

          {/* Decision method detail */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-3">
              Method
            </h2>
            <div className="bg-paper-warm rounded-lg px-4 py-3 border border-border">
              <span className="text-sm font-medium text-bark">
                {METHOD_LABELS[decision.method as DecisionMethod]}
              </span>
              <p className="text-xs text-bark-muted mt-1 leading-relaxed">
                {decision.method === "consent" &&
                  "Adopted unless a paramount objection is raised. Objections must demonstrate harm or conflict with purpose."}
                {decision.method === "advice_process" &&
                  "Decision-maker consulted affected parties before deciding. Input received, final authority rests with proposer."}
                {decision.method === "majority_vote" &&
                  "Passed by majority of those present and voting."}
                {decision.method === "delegation" &&
                  "Authority delegated with defined scope, constraints, and reporting requirements."}
                {decision.method === "consensus" &&
                  "Full agreement reached by all participants. No blocking concerns raised."}
                {decision.method === "lazy_consensus" &&
                  "Adopted after objection window closed with no objections raised."}
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
