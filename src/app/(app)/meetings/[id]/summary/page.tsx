import { getCurrentSpace } from "@/lib/space";
import { getMeetingById } from "@/lib/queries";
import { isAiEnabled } from "@/lib/ai";
import { formatDate } from "@/lib/utils";
import {
  Calendar,
  CheckCircle2,
  CircleDot,
  SkipForward,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MeetingSummary } from "./meeting-summary";
import type { MeetingSessionState, CompletedItem } from "@/lib/meeting-state";

const STATUS_COLORS: Record<string, string> = {
  decided: "bg-status-decided",
  implemented: "bg-status-implemented",
  reviewed: "bg-status-reviewed",
  learned: "bg-status-learned",
};

export default async function MeetingSummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const meeting = await getMeetingById(space.id, id);
  if (!meeting) return notFound();

  const aiEnabled = isAiEnabled(space.settings);
  const sessionState = meeting.sessionState as MeetingSessionState | null;

  const itemsCompleted = sessionState
    ? Object.values(sessionState.completedItems).filter(
        (item) => !(item as CompletedItem).skipped
      ).length
    : 0;
  const itemsSkipped = sessionState
    ? Object.values(sessionState.completedItems).filter(
        (item) => (item as CompletedItem).skipped
      ).length
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: "Meetings", href: "/meetings" },
          { label: meeting.title, href: `/meetings/${meeting.id}` },
          { label: "Summary" },
        ]}
      />

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-canopy-pale text-canopy">
            Completed
          </span>
          <span className="text-sm text-bark-muted flex items-center gap-1.5">
            <Calendar size={13} />
            {formatDate(meeting.date.toISOString())}
          </span>
        </div>
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {meeting.title} — Summary
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10 lg:gap-14">
        {/* Main content */}
        <div className="space-y-10">
          {/* Stats strip */}
          <div className="flex flex-wrap gap-6 pb-6 border-b border-border">
            <div>
              <div className="text-xl font-light text-bark" style={{ fontFamily: "var(--font-display)" }}>
                {meeting.decisions.length}
              </div>
              <div className="text-xs text-bark-muted">decisions made</div>
            </div>
            <div>
              <div className="text-xl font-light text-bark" style={{ fontFamily: "var(--font-display)" }}>
                {itemsCompleted}
              </div>
              <div className="text-xs text-bark-muted">items covered</div>
            </div>
            <div>
              <div className="text-xl font-light text-bark" style={{ fontFamily: "var(--font-display)" }}>
                {itemsSkipped}
              </div>
              <div className="text-xs text-bark-muted">items skipped</div>
            </div>
            <div>
              <div className="text-xl font-light text-bark" style={{ fontFamily: "var(--font-display)" }}>
                {meeting.attendees.length}
              </div>
              <div className="text-xs text-bark-muted">attendees</div>
            </div>
          </div>

          {/* Decisions made */}
          {meeting.decisions.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-4">
                <CircleDot size={13} />
                Decisions made
              </h2>
              <div className="space-y-2">
                {meeting.decisions.map((decision) => (
                  <Link
                    key={decision.id}
                    href={`/decisions/${decision.number}`}
                    className="flex items-center gap-3 py-3 px-3 -mx-3 rounded-lg hover:bg-paper-warm transition-colors group border-b border-border last:border-b-0"
                  >
                    <span className="text-xs text-bark-muted font-medium tabular-nums">
                      #{decision.number}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${STATUS_COLORS[decision.status] || "bg-bark-muted"}`}
                    />
                    <span className="text-sm text-bark group-hover:text-canopy transition-colors flex-1">
                      {decision.title}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Agenda items outcome */}
          {sessionState && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-4">
                Agenda outcomes
              </h2>
              <div className="space-y-2">
                {meeting.agendaItems.map((item, i) => {
                  const completed = sessionState.completedItems[i] as CompletedItem | undefined;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-2"
                    >
                      {completed?.skipped ? (
                        <SkipForward size={14} className="text-bark-muted/40 shrink-0" />
                      ) : completed ? (
                        <CheckCircle2 size={14} className="text-canopy shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-bark-muted/30 shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          completed?.skipped ? "text-bark-muted line-through" : "text-bark"
                        }`}
                      >
                        {item.title}
                      </span>
                      {completed?.outcome && (
                        <span className="text-xs text-bark-muted ml-auto">
                          {completed.outcome}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* AI Summary */}
          {aiEnabled && (
            <MeetingSummary meetingId={meeting.id} />
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-8">
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-3">
              <Users size={13} />
              Attendees ({meeting.attendees.length})
            </h2>
            <div className="space-y-2">
              {meeting.attendees.map((attendee) => (
                <div key={attendee.id} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-paper-deep border border-border flex items-center justify-center text-[0.6875rem] font-medium text-bark-muted shrink-0">
                    {(attendee.name || "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <span className="text-sm text-bark">
                    {attendee.name || attendee.email}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
