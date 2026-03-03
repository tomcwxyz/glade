import { getCurrentSpace } from "@/lib/space";
import { getSpaceMembers } from "@/lib/queries";
import { canUseAi } from "@/lib/billing";
import { isAiEnabled } from "@/lib/ai";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TranscriptImport } from "@/components/transcript-import";

export default async function ImportTranscriptPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const aiAllowed = await canUseAi(space.id);
  if (!aiAllowed || !isAiEnabled(space.settings)) return notFound();

  const members = await getSpaceMembers(space.id);
  const memberNames = members.map((m) => m.name).filter(Boolean) as string[];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <Breadcrumbs
        items={[
          { label: "Meetings", href: "/meetings" },
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
          Paste or upload a meeting transcript and we&apos;ll extract decisions,
          actions, and topics.
        </p>
      </header>

      <TranscriptImport
        spaceId={space.id}
        existingMeeting={null}
        memberNames={memberNames}
      />
    </div>
  );
}
