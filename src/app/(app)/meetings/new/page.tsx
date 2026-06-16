import { getCurrentSpace } from "@/lib/space";
import { getSpaceMembers, getAvailableTopics, getProposals, getDecisionsList } from "@/lib/queries";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MeetingForm } from "../meeting-form";

export default async function NewMeetingPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const [members, topics, allProposals, decisions] = await Promise.all([
    getSpaceMembers(space.id),
    getAvailableTopics(space.id),
    getProposals(space.id),
    getDecisionsList(space.id),
  ]);

  const agendaProposals = allProposals
    .filter((p) => p.status === "draft" || p.status === "open_for_discussion" || p.status === "ready_for_decision")
    .map((p) => ({ id: p.id, title: p.title, status: p.status }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Meetings", href: "/meetings" },
        { label: "New meeting" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          New meeting
        </h1>
        <p className="text-bark-muted text-sm">
          Record a meeting and its attendees.
        </p>
      </header>

      <MeetingForm
        members={members.map((m) => ({ id: m.userId, name: m.name || m.email }))}
        topics={topics}
        proposals={agendaProposals}
        decisions={decisions.map((d) => ({ id: d.id, number: d.number, title: d.title }))}
        publicEnabled={((space.settings as Record<string, unknown>) || {}).publicMeetings === true}
      />
    </div>
  );
}
