import { getCurrentSpace } from "@/lib/space";
import {
  getMeetingById,
  getDecisionsList,
  getActionsList,
  getDocumentsList,
  getProposalsList,
} from "@/lib/queries";
import { canUseLiveMeetings, canUseAi } from "@/lib/billing";
import { isAiEnabled } from "@/lib/ai";
import { formatDate } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  CircleDot,
  FileText,
  FileUp,
  Lightbulb,
  MessageSquare,
  Pencil,
  Play,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ShareAgendaButton } from "./share-agenda-button";
import { DeleteMeeting } from "./delete-meeting";
import { MeetingLinksEditor } from "./meeting-links-editor";

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
  const [liveMeetingsAllowed, aiCanUse, allDecisions, allActions, allDocuments, allProposals] =
    await Promise.all([
      canUseLiveMeetings(space.id),
      canUseAi(space.id),
      getDecisionsList(space.id),
      getActionsList(space.id),
      getDocumentsList(space.id),
      getProposalsList(space.id),
    ]);
  const aiAvailable = aiCanUse && isAiEnabled(space.settings);

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

          <div className="flex items-center gap-2 shrink-0">
            <ShareAgendaButton
              meetingId={meeting.id}
              existingToken={meeting.shareToken || null}
            />
            {liveMeetingsAllowed && (meeting.status === "draft" || meeting.status === "scheduled") && (
              <Link
                href={`/meetings/${meeting.id}/live`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
              >
                <Play size={14} />
                Start meeting
              </Link>
            )}
            {liveMeetingsAllowed && meeting.status === "in_progress" && (
              <Link
                href={`/meetings/${meeting.id}/live`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber text-paper rounded-lg font-medium hover:bg-amber/90 transition-colors"
              >
                <Play size={14} />
                Resume meeting
              </Link>
            )}
            {!liveMeetingsAllowed && (meeting.status === "draft" || meeting.status === "scheduled") && (
              <span className="flex items-center gap-1.5 px-3 py-2 text-sm border border-amber/30 bg-amber/5 text-bark-muted rounded-lg">
                <Play size={14} />
                Live meetings require Canopy
              </span>
            )}
            {meeting.status === "completed" && !!meeting.sessionState && (
              <Link
                href={`/meetings/${meeting.id}/summary`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
              >
                View summary
              </Link>
            )}
            {aiAvailable && (
              <Link
                href={`/meetings/${meeting.id}/import`}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
              >
                <FileUp size={14} />
                Import transcript
              </Link>
            )}
            <Link
              href={`/meetings/${meeting.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
            >
              <Pencil size={14} />
              Edit
            </Link>
            <DeleteMeeting meetingId={meeting.id} />
          </div>
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

          {/* Linked entities */}
          <MeetingLinksEditor
            meetingId={meeting.id}
            decisions={meeting.decisions}
            actions={meeting.actions}
            documents={meeting.documents}
            proposals={meeting.proposals}
            allDecisions={allDecisions}
            allActions={allActions}
            allDocuments={allDocuments}
            allProposals={allProposals}
          />
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
                  <CheckSquare size={13} />
                  Actions
                </span>
                <span className="font-medium text-bark">{meeting.actions.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-bark-muted flex items-center gap-1.5">
                  <FileText size={13} />
                  Documents
                </span>
                <span className="font-medium text-bark">{meeting.documents.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-bark-muted flex items-center gap-1.5">
                  <Lightbulb size={13} />
                  Proposals
                </span>
                <span className="font-medium text-bark">{meeting.proposals.length}</span>
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
