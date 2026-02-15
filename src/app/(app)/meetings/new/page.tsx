import { getCurrentSpace } from "@/lib/space";
import { getSpaceMembers } from "@/lib/queries";
import { MeetingForm } from "../meeting-form";

export default async function NewMeetingPage() {
  const space = await getCurrentSpace();
  if (!space) return null;

  const members = await getSpaceMembers(space.id);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
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
      />
    </div>
  );
}
