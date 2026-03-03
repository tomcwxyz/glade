import { getCurrentSpace, requireUser } from "@/lib/space";
import { getMeetingById } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import { FacilitatorView } from "./facilitator-view";
import { ParticipantView } from "./participant-view";
import { initializeMeetingState } from "@/lib/meeting-actions";

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

  // If meeting hasn't started yet, or is in_progress but missing session state, initialise it
  if (meeting.status === "draft" || meeting.status === "scheduled" || !meeting.sessionState) {
    await initializeMeetingState(meeting.id, space.id, user.id, user.name || "Facilitator");
    redirect(`/meetings/${meeting.id}/live`);
  }

  const isFacilitator = (meeting.facilitatorId || meeting.createdBy) === user.id;
  const settings = (space.settings as Record<string, unknown>) || {};
  const voteThreshold = typeof settings.votePassThreshold === "number" ? settings.votePassThreshold : 0.5;

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
        voteThreshold={voteThreshold}
      />
    );
  }

  return (
    <ParticipantView
      meetingId={meeting.id}
      meetingTitle={meeting.title}
      agendaItems={agendaItems}
      voteThreshold={voteThreshold}
    />
  );
}
