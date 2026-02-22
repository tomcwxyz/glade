import { getCurrentSpace } from "@/lib/space";
import { getMeetingById } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import type { MeetingSessionState, CompletedItem } from "@/lib/meeting-state";
import { PrintButton } from "./print-button";

const METHOD_LABELS: Record<string, string> = {
  consent: "Consent",
  majority_vote: "Majority Vote",
  advice_process: "Advice Process",
  delegation: "Delegation",
  consensus: "Consensus",
  lazy_consensus: "Lazy Consensus",
};

export default async function MeetingPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const meeting = await getMeetingById(space.id, id);
  if (!meeting) return notFound();

  const sessionState = meeting.sessionState as MeetingSessionState | null;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10 print:px-0 print:py-0 print:max-w-none">
      {/* Print button — hidden in print */}
      <div className="print:hidden mb-6 flex items-center gap-3">
        <PrintButton />
        <span className="text-sm text-bark-muted">
          Use your browser&apos;s print dialog to save as PDF
        </span>
      </div>

      {/* Header */}
      <header className="mb-8 pb-6 border-b border-bark/20">
        <h1 className="text-2xl font-semibold text-bark mb-1" style={{ fontFamily: "var(--font-display)" }}>
          {meeting.title}
        </h1>
        <div className="text-sm text-bark-muted space-x-3">
          <span>{formatDate(meeting.date.toISOString())}</span>
          <span>·</span>
          <span>{space.name}</span>
          {meeting.type && (
            <>
              <span>·</span>
              <span className="capitalize">{meeting.type.replace("_", " ")}</span>
            </>
          )}
        </div>
      </header>

      {/* Attendees */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-bark uppercase tracking-wider mb-2">
          Attendees ({meeting.attendees.length})
        </h2>
        <p className="text-sm text-bark">
          {meeting.attendees.map((a) => a.name || a.email).join(", ")}
        </p>
      </section>

      {/* Agenda Items */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-bark uppercase tracking-wider mb-3">
          Agenda
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-bark/20">
              <th className="text-left py-1.5 pr-4 text-bark-muted font-medium">#</th>
              <th className="text-left py-1.5 pr-4 text-bark-muted font-medium">Item</th>
              <th className="text-left py-1.5 pr-4 text-bark-muted font-medium">Type</th>
              <th className="text-left py-1.5 text-bark-muted font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {meeting.agendaItems.map((item, i) => {
              const completed = sessionState?.completedItems[i] as CompletedItem | undefined;
              return (
                <tr key={item.id} className="border-b border-bark/10">
                  <td className="py-2 pr-4 text-bark-muted">{i + 1}</td>
                  <td className="py-2 pr-4 text-bark">
                    {item.title}
                    {completed?.skipped && (
                      <span className="text-bark-muted ml-1">(skipped)</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-bark-muted capitalize">
                    {item.type.replace("for_", "")}
                  </td>
                  <td className="py-2 text-bark-muted">
                    {completed?.outcome || "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Decisions */}
      {meeting.decisions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-bark uppercase tracking-wider mb-3">
            Decisions ({meeting.decisions.length})
          </h2>
          <div className="space-y-4">
            {meeting.decisions.map((d) => (
              <div key={d.id} className="border border-bark/15 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-bark-muted font-mono">#{d.number}</span>
                  <span className="text-sm font-medium text-bark">{d.title}</span>
                </div>
                <div className="text-xs text-bark-muted space-x-2">
                  <span className="capitalize">{d.status}</span>
                  <span>·</span>
                  <span>{METHOD_LABELS[d.method] || d.method}</span>
                </div>
                {d.outcome && (
                  <p className="text-sm text-bark mt-2">{d.outcome}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {meeting.notes && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-bark uppercase tracking-wider mb-2">
            Notes
          </h2>
          <p className="text-sm text-bark whitespace-pre-wrap">{meeting.notes}</p>
        </section>
      )}

      {/* Footer */}
      <footer className="pt-6 border-t border-bark/20 text-xs text-bark-muted">
        Generated from {space.name} on Glade · {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
      </footer>
    </div>
  );
}
