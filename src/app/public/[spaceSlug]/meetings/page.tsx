import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSpace, getPublicMeetings } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { Calendar } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}): Promise<Metadata> {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  return { title: space ? `${space.name} — Meetings` : "Meetings" };
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-paper-deep text-bark-muted",
  scheduled: "bg-sky/10 text-sky",
  in_progress: "bg-amber/10 text-amber",
  completed: "bg-canopy/10 text-canopy",
};

export default async function PublicMeetingsPage({
  params,
}: {
  params: Promise<{ spaceSlug: string }>;
}) {
  const { spaceSlug } = await params;
  const space = await getPublicSpace(spaceSlug);
  if (!space) notFound();

  const settings = (space.settings as Record<string, unknown>) || {};
  if (settings.publicMeetings !== true) notFound();

  const meetings = await getPublicMeetings(space.id);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-8">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Calendar size={20} className="text-bark-muted" />
          <h2
            className="text-2xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Meeting Records
          </h2>
        </div>
        <p className="text-bark-muted text-sm">
          {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} recorded
        </p>
      </header>

      {meetings.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={40} className="mx-auto mb-4 text-bark-muted/30" />
          <p className="text-bark-muted">No public meetings yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="px-4 py-3.5 rounded-lg border border-border bg-paper-warm hover:bg-paper-warm/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[0.9375rem] font-medium text-bark">
                      {m.title}
                    </span>
                    <span
                      className={`text-[0.625rem] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
                        STATUS_STYLES[m.status] || "bg-paper-deep text-bark-muted"
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-bark-muted flex-wrap">
                    <span>{formatDate(m.date.toISOString())}</span>
                    {m.type && (
                      <>
                        <span className="text-bark-muted/30">·</span>
                        <span>{m.type}</span>
                      </>
                    )}
                    {m.attendeeCount > 0 && (
                      <>
                        <span className="text-bark-muted/30">·</span>
                        <span>{m.attendeeCount} attendee{m.attendeeCount !== 1 ? "s" : ""}</span>
                      </>
                    )}
                    {m.decisionCount > 0 && (
                      <>
                        <span className="text-bark-muted/30">·</span>
                        <span>{m.decisionCount} decision{m.decisionCount !== 1 ? "s" : ""} made</span>
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
