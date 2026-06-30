import { getMeetingByShareToken } from "@/lib/queries";
import { notFound } from "next/navigation";
import { ObserverView } from "./observer-view";

export default async function SharedLiveMeetingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const meeting = await getMeetingByShareToken(token);
  if (!meeting) return notFound();

  if (meeting.status !== "in_progress") {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-medium text-gray-900 mb-2">
            Meeting not in progress
          </h1>
          <p className="text-sm text-gray-500">
            This meeting {meeting.status === "completed" ? "has ended" : "hasn't started yet"}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ObserverView
      token={token}
      meetingTitle={meeting.title}
      agendaItems={meeting.agendaItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        durationMinutes: item.durationMinutes,
      }))}
    />
  );
}
