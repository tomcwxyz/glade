import { getCurrentSpace } from "@/lib/space";
import { isAiEnabled } from "@/lib/ai";
import { getMeetingById, getSpaceMembers, getAvailableTopics, getProposals, getDecisionsList } from "@/lib/queries";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MeetingForm } from "../../meeting-form";

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const [meeting, members, topics, allProposals, decisions] = await Promise.all([
    getMeetingById(space.id, id),
    getSpaceMembers(space.id),
    getAvailableTopics(space.id),
    getProposals(space.id),
    getDecisionsList(space.id),
  ]);

  if (!meeting) return notFound();

  const agendaProposals = allProposals
    .filter((p) => p.status === "draft" || p.status === "open_for_discussion" || p.status === "ready_for_decision")
    .map((p) => ({ id: p.id, title: p.title, status: p.status }));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs items={[
        { label: "Meetings", href: "/meetings" },
        { label: meeting.title, href: `/meetings/${id}` },
        { label: "Edit" },
      ]} />
      <header className="mb-10">
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Edit meeting
        </h1>
        <p className="text-bark-muted text-sm">{meeting.title}</p>
      </header>

      <MeetingForm
        members={members.map((m) => ({ id: m.userId, name: m.name || m.email }))}
        topics={topics}
        proposals={agendaProposals}
        decisions={decisions.map((d) => ({ id: d.id, number: d.number, title: d.title }))}
        publicEnabled={((space.settings as Record<string, unknown>) || {}).publicMeetings === true}
        aiEnabled={isAiEnabled(space.settings)}
        meeting={{
          id: meeting.id,
          title: meeting.title,
          date: meeting.date.toISOString(),
          type: meeting.type,
          status: meeting.status,
          notes: meeting.notes,
          isPublic: meeting.isPublic,
          facilitatorId: meeting.facilitatorId,
          attendeeIds: meeting.attendees.map((a) => a.id),
          agendaItems: meeting.agendaItems.map((a) => ({
            title: a.title,
            description: a.description || "",
            type: a.type,
            durationMinutes: a.durationMinutes?.toString() || "",
            proposalId: a.proposalId || "",
            topicId: a.topicId || "",
          })),
        }}
      />
    </div>
  );
}
