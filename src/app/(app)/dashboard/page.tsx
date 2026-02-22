import type { Metadata } from "next";
import { getCurrentSpace, getSpaceMemberCount } from "@/lib/space";

export const metadata: Metadata = { title: "Dashboard" };
import { getDecisions, getActions, getMeetings, getSpaceStats, getActiveInsights, getGovernanceHealthStats } from "@/lib/queries";
import { isAiEnabled } from "@/lib/ai";
import { getSpacePlan } from "@/lib/billing";
import { PLAN_LIMITS } from "@/lib/plans";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { formatDate, formatDateRelative } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  ListChecks,
  TreePine,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { InsightsPanel } from "./insights-panel";
import { MemberBriefing } from "./member-briefing";
import { GovernanceDigest } from "./governance-digest";

const METHOD_LABELS: Record<string, string> = {
  consent: "Consent",
  majority_vote: "Majority Vote",
  advice_process: "Advice Process",
  delegation: "Delegation",
  consensus: "Consensus",
  lazy_consensus: "Lazy Consensus",
};

const STATUS_LABELS: Record<string, string> = {
  decided: "Decided",
  implemented: "Implemented",
  reviewed: "Reviewed",
  learned: "Learned",
};

function StatValue({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div
        className="text-2xl font-light tracking-tight text-bark"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </div>
      <div className="text-sm text-bark-muted mt-0.5">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    decided: "bg-status-decided",
    implemented: "bg-status-implemented",
    reviewed: "bg-status-reviewed",
    learned: "bg-status-learned",
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-bark-muted"}`} />;
}

function ActionStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 size={14} className="text-canopy" />;
    case "in_progress":
      return <Clock size={14} className="text-amber" />;
    case "overdue":
      return <TriangleAlert size={14} className="text-earth" />;
    default:
      return <Circle size={14} className="text-bark-muted" />;
  }
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const planTier = await getSpacePlan(space.id);
  const planLimits = PLAN_LIMITS[planTier];
  const aiEnabled = planLimits.canUseAi && isAiEnabled(space.settings);

  const [allDecisions, allActions, allMeetings, stats, activeInsights, healthStats] = await Promise.all([
    getDecisions(space.id),
    getActions(space.id),
    getMeetings(space.id),
    getSpaceStats(space.id),
    aiEnabled ? getActiveInsights(space.id) : Promise.resolve([]),
    getGovernanceHealthStats(space.id),
  ]);

  const recentDecisions = allDecisions.slice(0, 4);
  const urgentActions = allActions
    .filter((a) => a.status !== "complete")
    .sort((a, b) => {
      const order: Record<string, number> = { overdue: 0, in_progress: 1, open: 2 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    })
    .slice(0, 4);
  const nextReviews = allDecisions.filter((d) => d.reviewDate).slice(0, 3);

  // Build decision lookup for insights
  const relatedDecisions: Record<string, { number: number; title: string }> = {};
  for (const insight of activeInsights) {
    if (insight.relatedDecisionId) {
      const dec = allDecisions.find((d) => d.id === insight.relatedDecisionId);
      if (dec) {
        relatedDecisions[insight.relatedDecisionId] = {
          number: dec.number,
          title: dec.title,
        };
      }
    }
  }

  const briefingInsight = activeInsights.find(
    (i) => i.type === "briefing" && (i.metadata as Record<string, unknown> | null)?.subtype !== "digest"
  );
  const digestInsight = activeInsights.find(
    (i) => i.type === "briefing" && (i.metadata as Record<string, unknown> | null)?.subtype === "digest"
  );

  if (stats.totalDecisions === 0) {
    const memberCount = await getSpaceMemberCount(space.id);
    const hasMeetings = allMeetings.length > 0;
    const hasMembers = memberCount > 1;

    const steps = [
      { done: true, label: "Create your space", description: `${space.name} is ready`, icon: TreePine, href: null },
      { done: hasMembers, label: "Invite a team member", description: "Governance works best together", icon: Users, href: "/members" },
      { done: false, label: "Log your first decision", description: "The heart of your governance record", icon: BookOpen, href: "/decisions/new" },
      { done: hasMeetings, label: "Record a meeting", description: "Link decisions to where they were made", icon: Calendar, href: "/meetings/new" },
    ];
    const completedCount = steps.filter((s) => s.done).length;

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <header className="mb-10">
          <h1
            className="text-3xl font-light tracking-tight mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {getGreeting()}
          </h1>
          <p className="text-bark-muted text-base">
            Welcome to {space.name}. Let&apos;s get you started.
          </p>
        </header>

        <div className="border border-border rounded-2xl bg-paper-warm overflow-hidden">
          {/* Progress header */}
          <div className="px-6 py-5 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-lg font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Getting started
              </h2>
              <span className="text-xs text-bark-muted font-medium">
                {completedCount} of {steps.length}
              </span>
            </div>
            <div className="h-1.5 bg-paper-deep rounded-full overflow-hidden">
              <div
                className="h-full bg-canopy rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="divide-y divide-border">
            {steps.map((step) => {
              const Icon = step.icon;
              const content = (
                <div className="flex items-center gap-4 px-6 py-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                    step.done ? "bg-canopy-pale" : "bg-paper-deep"
                  }`}>
                    {step.done ? (
                      <CheckCircle2 size={18} className="text-canopy" />
                    ) : (
                      <Icon size={18} className="text-bark-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${step.done ? "text-bark-muted line-through" : "text-bark"}`}>
                      {step.label}
                    </div>
                    <div className="text-xs text-bark-muted mt-0.5">{step.description}</div>
                  </div>
                  {!step.done && step.href && (
                    <ArrowRight size={16} className="text-bark-muted shrink-0" />
                  )}
                </div>
              );

              if (step.done || !step.href) {
                return <div key={step.label}>{content}</div>;
              }
              return (
                <Link
                  key={step.label}
                  href={step.href}
                  className="block hover:bg-paper transition-colors"
                >
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      {/* Page header */}
      <header className="mb-12">
        <h1
          className="text-3xl font-light tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {getGreeting()}
        </h1>
        <p className="text-bark-muted text-base">
          {space.name} has made{" "}
          <span className="text-bark font-medium">{stats.totalDecisions} decisions</span>.
          Here&apos;s what needs your attention.
        </p>
      </header>

      {/* Stats strip */}
      <div className="flex flex-wrap gap-6 sm:gap-12 mb-14 pb-8 border-b border-border">
        <StatValue value={stats.decisionsThisMonth} label="decisions this month" />
        <StatValue value={stats.activeActions} label="open actions" />
        <StatValue value={`${Math.round(stats.actionCompletionRate * 100)}%`} label="follow-through" />
        <StatValue value={`${Math.round(stats.reviewRate * 100)}%`} label="review rate" />
        <StatValue value={stats.upcomingReviews} label="reviews due" />
      </div>

      {/* Governance health */}
      {stats.totalDecisions >= 5 && (
        <section className="mb-14">
          <h2
            className="text-lg font-medium tracking-tight mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Governance health
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border rounded-xl overflow-hidden border border-border">
            <div className="bg-paper-warm px-5 py-4">
              <div
                className="text-2xl font-light tracking-tight text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {healthStats.uniqueParticipants} of {healthStats.totalMembers}
              </div>
              <div className="text-sm text-bark-muted mt-0.5">members participate</div>
            </div>
            <div className="bg-paper-warm px-5 py-4">
              <div
                className="text-2xl font-light tracking-tight text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {healthStats.methodsUsed} of 6
              </div>
              <div className="text-sm text-bark-muted mt-0.5">methods used</div>
            </div>
            <div className="bg-paper-warm px-5 py-4">
              <div
                className="text-2xl font-light tracking-tight text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {Math.round(healthStats.revisionRate * 100)}%
              </div>
              <div className="text-sm text-bark-muted mt-0.5">revised</div>
            </div>
            <div className="bg-paper-warm px-5 py-4">
              <div
                className="text-2xl font-light tracking-tight text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {healthStats.documentCurrency.total > 0
                  ? `${healthStats.documentCurrency.stale} of ${healthStats.documentCurrency.total}`
                  : "—"}
              </div>
              <div className="text-sm text-bark-muted mt-0.5">
                {healthStats.documentCurrency.total > 0 ? "docs need review" : "no documents yet"}
              </div>
            </div>
            <div className="bg-paper-warm px-5 py-4">
              <div
                className="text-2xl font-light tracking-tight text-bark"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {healthStats.medianDaysToDecision !== null
                  ? `~${healthStats.medianDaysToDecision}d`
                  : "—"}
              </div>
              <div className="text-sm text-bark-muted mt-0.5">
                {healthStats.medianDaysToDecision !== null ? "proposal to decision" : "no proposals resolved"}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 lg:gap-16">
        {/* Left: Recent decisions */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl font-medium tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Recent decisions
            </h2>
            <Link
              href="/decisions"
              className="text-sm text-canopy hover:text-canopy-light flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="space-y-0">
            {recentDecisions.map((decision) => (
              <Link
                key={decision.id}
                href={`/decisions/${decision.number}`}
                className="group block py-5 border-b border-border last:border-b-0 hover:bg-paper-warm -mx-4 px-4 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1.5 pt-0.5 shrink-0">
                    <span className="text-xs text-bark-muted font-medium tabular-nums">
                      #{decision.number}
                    </span>
                    <StatusDot status={decision.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.9375rem] font-medium text-bark leading-snug mb-1 group-hover:text-canopy transition-colors">
                      {decision.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-bark-muted">
                      <span>{formatDateRelative(decision.date.toISOString())}</span>
                      <span className="text-border-strong">|</span>
                      <span>{METHOD_LABELS[decision.method] || decision.method}</span>
                      <span className="text-border-strong">|</span>
                      <span>{STATUS_LABELS[decision.status] || decision.status}</span>
                    </div>
                  </div>
                  {decision.actionsCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-bark-muted shrink-0 pt-1">
                      <ListChecks size={13} />
                      <span>
                        {decision.actionsComplete}/{decision.actionsCount}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Right column */}
        <div className="space-y-10">
          {/* Upgrade prompt for free tier */}
          {!planLimits.canUseAi && (
            <UpgradePrompt
              feature="AI Governance Insights"
              description="Get pattern analysis, review questions, and document intelligence powered by AI."
            />
          )}

          {/* AI Insights */}
          {aiEnabled && (
            <InsightsPanel
              insights={activeInsights.map((i) => ({
                ...i,
                createdAt: i.createdAt.toISOString(),
              }))}
              relatedDecisions={relatedDecisions}
            />
          )}

          {/* Open actions */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-base font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Open actions
              </h2>
              <Link
                href="/actions"
                className="text-xs text-canopy hover:text-canopy-light transition-colors"
              >
                All actions
              </Link>
            </div>

            {urgentActions.length === 0 ? (
              <p className="text-[0.8125rem] text-bark-muted py-2">
                No open actions — they&apos;re created when you log decisions.
              </p>
            ) : (
              <div className="space-y-2.5">
                {urgentActions.map((action) => (
                  <div key={action.id} className="flex items-start gap-2.5 py-2">
                    <ActionStatusIcon status={action.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] text-bark leading-snug">
                        {action.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-bark-muted">
                        <span>{action.ownerName?.split(" ")[0] || "Unassigned"}</span>
                        <span className="text-border-strong">·</span>
                        <span className={action.status === "overdue" ? "text-earth font-medium" : ""}>
                          {action.dueDate ? formatDate(action.dueDate.toISOString()) : "No due date"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming reviews */}
          <section>
            <h2
              className="text-base font-medium tracking-tight mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Reviews coming up
            </h2>

            {nextReviews.length === 0 ? (
              <p className="text-[0.8125rem] text-bark-muted py-2">
                No reviews scheduled yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {nextReviews.map((decision) => (
                  <Link
                    key={decision.id}
                    href={`/decisions/${decision.number}`}
                    className="flex items-start gap-2.5 py-2 group"
                  >
                    <CalendarClock size={14} className="text-amber mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] text-bark leading-snug group-hover:text-canopy transition-colors">
                        #{decision.number} {decision.title}
                      </p>
                      <p className="text-xs text-bark-muted mt-0.5">
                        Review by {formatDate(decision.reviewDate!.toISOString())}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent meetings */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-base font-medium tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Recent meetings
              </h2>
              <Link
                href="/meetings"
                className="text-xs text-canopy hover:text-canopy-light transition-colors"
              >
                All meetings
              </Link>
            </div>

            {allMeetings.length === 0 ? (
              <p className="text-[0.8125rem] text-bark-muted py-2">
                No meetings recorded yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {allMeetings.slice(0, 3).map((meeting) => (
                  <div key={meeting.id} className="flex items-start gap-2.5 py-2">
                    <BookOpen size={14} className="text-bark-muted mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[0.8125rem] text-bark leading-snug">
                        {meeting.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-bark-muted">
                        <span>{formatDate(meeting.date.toISOString())}</span>
                        <span className="text-border-strong">·</span>
                        <span>{meeting.decisionsCount} decisions</span>
                        <span className="text-border-strong">·</span>
                        <span>{meeting.attendees.length} present</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Governance digest */}
          {aiEnabled && (
            <GovernanceDigest
              existing={digestInsight ? {
                id: digestInsight.id,
                content: digestInsight.content,
              } : null}
            />
          )}

          {/* Member briefing */}
          {aiEnabled && (
            <MemberBriefing
              existing={briefingInsight ? {
                id: briefingInsight.id,
                content: briefingInsight.content,
              } : null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
