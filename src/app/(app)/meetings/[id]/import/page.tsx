import { getCurrentSpace } from "@/lib/space";
import { getMeetingById, getSpaceMembers } from "@/lib/queries";
import { canUseAi } from "@/lib/billing";
import { isAiEnabled } from "@/lib/ai";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TranscriptImport } from "@/components/transcript-import";

export default async function ImportTranscriptForMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await getCurrentSpace();
  if (!space) return null;

  const aiAllowed = await canUseAi(space.id);
  if (!aiAllowed || !isAiEnabled(space.settings)) return notFound();

  const meeting = await getMeetingById(space.id, id);
  if (!meeting) return notFound();

  const members = await getSpaceMembers(space.id);
  const memberNames = members.map((m) => m.name).filter(Boolean) as string[];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: "Meetings", href: "/meetings" },
          { label: meeting.title, href: `/meetings/${meeting.id}` },
          { label: "Import transcript" },
        ]}
      />

      <header className="mb-8">
        <h1
          className="text-2xl font-medium tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Import transcript
        </h1>
        <p className="text-sm text-bark-muted mt-2">
          Add a transcript to <strong>{meeting.title}</strong> and extract
          decisions, actions, and topics.
        </p>
      </header>

      <TranscriptImport
        spaceId={space.id}
        existingMeeting={{
          id: meeting.id,
          title: meeting.title,
          date: meeting.date.toISOString(),
          type: meeting.type,
        }}
        memberNames={memberNames}
      />
    </div>
  );
}
