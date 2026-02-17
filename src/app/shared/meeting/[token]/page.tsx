import { getMeetingByShareToken } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, TreePine, Users } from "lucide-react";
import { notFound } from "next/navigation";

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
  for_decision: { label: "For decision", color: "text-green-700 bg-green-50" },
  for_discussion: { label: "For discussion", color: "text-amber-700 bg-amber-50" },
  for_information: { label: "For information", color: "text-sky-700 bg-sky-50" },
};

export default async function SharedMeetingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const meeting = await getMeetingByShareToken(token);
  if (!meeting) return notFound();

  const totalDuration = meeting.agendaItems.reduce(
    (sum, item) => sum + (item.durationMinutes || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <TreePine size={20} className="text-green-700" />
          <span className="text-sm font-medium text-gray-600">
            Shared meeting agenda
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Meeting info */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {TYPE_LABELS[meeting.type || "other"] || meeting.type}
            </span>
            <span className="text-sm text-gray-500 flex items-center gap-1.5">
              <Calendar size={13} />
              {formatDate(meeting.date.toISOString())}
            </span>
            {totalDuration > 0 && (
              <span className="text-sm text-gray-500 flex items-center gap-1.5">
                <Clock size={13} />
                {totalDuration} min
              </span>
            )}
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-gray-900 mb-2">
            {meeting.title}
          </h1>
        </div>

        {/* Attendees */}
        {meeting.attendees.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-medium flex items-center gap-2 mb-3">
              <Users size={13} />
              Attendees ({meeting.attendees.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {meeting.attendees.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                >
                  <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[0.625rem] font-medium text-gray-500">
                    {(a.name || "?")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  {a.name || "Unknown"}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Agenda */}
        {meeting.agendaItems.length > 0 && (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-4">
              Agenda ({meeting.agendaItems.length} items)
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {meeting.agendaItems.map((item, i) => {
                const typeConfig =
                  AGENDA_TYPE_LABELS[item.type] || AGENDA_TYPE_LABELS.for_discussion;
                return (
                  <div key={item.id} className="flex gap-4 p-4">
                    <span className="text-sm text-gray-400 font-medium tabular-nums w-6 shrink-0 pt-0.5">
                      {i + 1}.
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[0.9375rem] font-medium text-gray-900">
                          {item.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${typeConfig.color}`}
                        >
                          {typeConfig.label}
                        </span>
                        {item.durationMinutes && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={11} />
                            {item.durationMinutes} min
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 leading-relaxed">
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

        {/* Footer */}
        <footer className="mt-16 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Powered by Glade — governance made visible
          </p>
        </footer>
      </main>
    </div>
  );
}
