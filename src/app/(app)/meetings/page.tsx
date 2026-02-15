import { formatDate } from "@/lib/utils";
import { BookOpen, Calendar, Plus, Users } from "lucide-react";
import Link from "next/link";
import { getCurrentSpace } from "@/lib/space";
import { getMeetings } from "@/lib/queries";

export default async function MeetingsPage() {
  const space = await getCurrentSpace();
  if (!space) return null;
  const meetings = await getMeetings(space.id);
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10 flex items-end justify-between">
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
        <Link
          href="/meetings/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
        >
          <Plus size={16} />
          New meeting
        </Link>
      </header>

      <div className="space-y-3">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            href={`/meetings/${meeting.id}`}
            className="flex items-center gap-5 py-5 border-b border-border last:border-b-0 -mx-3 px-3 hover:bg-paper-warm rounded-xl transition-colors cursor-pointer"
          >
            {/* Date block */}
            <div className="w-14 h-14 rounded-xl bg-canopy-pale flex flex-col items-center justify-center shrink-0">
              <span className="text-lg font-semibold text-canopy leading-none" style={{ fontFamily: "var(--font-display)" }}>
                {new Date(meeting.date).getDate()}
              </span>
              <span className="text-[0.625rem] uppercase tracking-wider text-canopy/70 mt-0.5">
                {new Date(meeting.date).toLocaleDateString("en-GB", { month: "short" })}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[0.9375rem] font-medium text-bark leading-snug">
                {meeting.title}
              </h3>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-bark-muted">
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

            {/* Type badge */}
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-paper-deep text-bark-muted shrink-0">
              {meeting.type}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
