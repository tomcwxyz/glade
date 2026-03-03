import type { Metadata } from "next";
import { formatDate } from "@/lib/utils";
import { BookOpen, Calendar, FileUp, Plus, Users } from "lucide-react";

export const metadata: Metadata = { title: "Meetings" };
import Link from "next/link";
import { getCurrentSpace } from "@/lib/space";
import { getMeetings } from "@/lib/queries";
import { canUseAi } from "@/lib/billing";
import { isAiEnabled } from "@/lib/ai";
import { EmptyState } from "@/components/empty-state";

export default async function MeetingsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;
  const [meetings, aiCanUse] = await Promise.all([
    getMeetings(space.id),
    canUseAi(space.id),
  ]);
  const aiAvailable = aiCanUse && isAiEnabled(space.settings);

  if (meetings.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <header className="mb-10">
          <h1
            className="text-3xl font-light tracking-tight mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Meetings
          </h1>
        </header>
        <EmptyState
          icon={Calendar}
          title="No meetings recorded"
          description="Record your board meetings and committee sessions to link decisions to their context."
          action={{ label: "New meeting", href: "/meetings/new" }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-light tracking-tight mb-1.5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Meetings
          </h1>
          <p className="text-bark-muted">
            {meetings.length} meetings recorded
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {aiAvailable && (
            <Link
              href="/meetings/import"
              className="flex items-center gap-2 px-4 py-2.5 bg-paper-deep border border-border rounded-lg text-sm font-medium text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
            >
              <FileUp size={16} />
              Import transcript
            </Link>
          )}
          <Link
            href="/meetings/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
          >
            <Plus size={16} />
            New meeting
          </Link>
        </div>
      </header>

      <div className="space-y-3">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/meetings/${meeting.id}`}
            className="flex items-start sm:items-center gap-3 sm:gap-5 py-4 sm:py-5 border-b border-border last:border-b-0 -mx-3 px-3 hover:bg-paper-warm rounded-xl transition-colors cursor-pointer"
          >
            {/* Date block */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-canopy-pale flex flex-col items-center justify-center shrink-0">
              <span className="text-base sm:text-lg font-semibold text-canopy leading-none" style={{ fontFamily: "var(--font-display)" }}>
                {new Date(meeting.date).getDate()}
              </span>
              <span className="text-[0.5625rem] sm:text-[0.625rem] uppercase tracking-wider text-canopy/70 mt-0.5">
                {new Date(meeting.date).toLocaleDateString("en-GB", { month: "short" })}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start sm:items-center gap-2">
                <h3 className="text-[0.9375rem] font-medium text-bark leading-snug flex-1 min-w-0">
                  {meeting.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-paper-deep text-bark-muted shrink-0">
                  {meeting.type}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-bark-muted">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(meeting.date.toISOString())}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {meeting.attendees.length} attendees
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen size={12} />
                  {meeting.decisionsCount} decision{meeting.decisionsCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
