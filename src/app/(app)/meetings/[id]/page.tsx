import { getCurrentSpace } from "@/lib/space";
import { getMeetingById } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  CircleDot,
  FileText,
  MessageSquare,
  Pencil,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";

const TYPE_LABELS: Record<string, string> = {
  board: "Board Meeting",
  team: "Team Meeting",
  agm: "AGM",
  egm: "EGM",
  committee: "Committee",
  working_group: "Working Group",
  other: "Other",
};

const AGENDA_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  for_decision: { label: "For decision", color: "text-canopy bg-canopy-pale" },
  for_discussion: { label: "For discussion", color: "text-amber bg-amber/10" },
  for_information: { label: "For information", color: "text-sky bg-sky/10" },
};

const MEETING_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-paper-deep text-bark-muted" },
  scheduled: { label: "Scheduled", color: "bg-sky/10 text-sky" },
  in_progress: { label: "In Progress", color: "bg-amber-pale text-amber" },
  completed: { label: "Completed", color: "bg-canopy-pale text-canopy" },
};

const STATUS_COLORS: Record<string, string> = {
  decided: "bg-status-decided",
  implemented: "bg-status-implemented",
  reviewed: "bg-status-reviewed",
  learned: "bg-status-learned",
};

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;
  const meeting = await getMeetingById(space.id, id);
  if (!meeting) return notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Meetings", href: "/meetings" },
        { label: meeting.title },
      ]} />

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-paper-deep text-bark-muted">
                {TYPE_LABELS[meeting.type || "other"] || meeting.type}
              </span>
              {(() => {
                const sc = MEETING_STATUS_CONFIG[meeting.status] || MEETING_STATUS_CONFIG.draft;
                return (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                    {sc.label}
                  </span>
                );
              })()}
              <span className="text-sm text-bark-muted flex items-center gap-1.5">
                <Calendar size={13} />
                {formatDate(meeting.date.toISOString())}
              </span>
            </div>

            <h1
              className="text-2xl font-medium tracking-tight leading-snug mb-2 max-w-2xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {meeting.title}
            </h1>
          </div>

          <Link
            href={`/meetings/${meeting.id}/edit`}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors shrink-0"
          >
            <Pencil size={14} />
            Edit
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-10 lg:gap-14">
        {/* Main content */}
        <div className="space-y-10">
          {/* Notes */}
          {meeting.notes && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-3">
                <FileText size={13} />
                Notes
              </h2>
              <div className="text-[0.9375rem] text-bark leading-relaxed whitespace-pre-wrap">
                {meeting.notes}
              </div>
            </section>
          )}

          {/* Agenda items */}
          {meeting.agendaItems.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-4">
                <MessageSquare size={13} />
                Agenda ({meeting.agendaItems.length} items)
              </h2>
              <div className="space-y-3">
                {meeting.agendaItems.map((item, i) => {
                  const typeConfig = AGENDA_TYPE_LABELS[item.type] || AGENDA_TYPE_LABELS.for_discussion;
                  return (
                    <div
                      key={item.id}
                      className="flex gap-4 py-3 border-b border-border last:border-b-0"
                    >
                      <span className="text-sm text-bark-muted font-medium tabular-nums w-6 shrink-0 pt-0.5">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[0.9375rem] font-medium text-bark">
                            {item.title}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${typeConfig.color}`}
                          >
                            {typeConfig.label}
                          </span>
                          {item.durationMinutes && (
                            <span className="text-xs text-bark-muted">
                              {item.durationMinutes} min
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm text-bark-muted leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Linked decisions */}
          {meeting.decisions.length > 0 && (
            <section>
              <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium flex items-center gap-2 mb-4">
                <CircleDot size={13} />
                Decisions made ({meeting.decisions.length})
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
        </div>

        {/* Right sidebar */}
        <aside className="space-y-8">
          {/* Attendees */}
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

          {/* Summary stats */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-3">
              Summary
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-bark-muted flex items-center gap-1.5">
                  <BookOpen size={13} />
                  Agenda items
                </span>
                <span className="font-medium text-bark">{meeting.agendaItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-bark-muted flex items-center gap-1.5">
                  <CircleDot size={13} />
                  Decisions
                </span>
                <span className="font-medium text-bark">{meeting.decisions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-bark-muted flex items-center gap-1.5">
                  <Users size={13} />
                  Present
                </span>
                <span className="font-medium text-bark">{meeting.attendees.length}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
