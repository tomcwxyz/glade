import { getCurrentSpace, requireUser } from "@/lib/space";
import { getMeetingById } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import { FacilitatorView } from "./facilitator-view";
import { ParticipantView } from "./participant-view";
import { startMeeting } from "@/lib/meeting-actions";

export default async function LiveMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return null;

  const meeting = await getMeetingById(space.id, id);
  if (!meeting) return notFound();

  // If meeting hasn't started yet, initialise session state
  if (meeting.status === "draft" || meeting.status === "scheduled") {
    await startMeeting(meeting.id);
    redirect(`/meetings/${meeting.id}/live`);
  }

  const isFacilitator = meeting.createdBy === user.id;

  const agendaItems = meeting.agendaItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type,
    durationMinutes: item.durationMinutes,
  }));

  if (isFacilitator) {
    return (
      <FacilitatorView
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        agendaItems={agendaItems}
      />
    );
  }

  return (
    <ParticipantView
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      agendaItems={agendaItems}
    />
  );
}
