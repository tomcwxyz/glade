import type { Metadata } from "next";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { proposals, spaces } from "@/db/schema";
import { getMeetingById, resolveGuestToken } from "@/lib/queries";
import { guestParticipantId } from "@/lib/guests";
import { GuestMeeting } from "./guest-meeting";

export const metadata: Metadata = {
  title: "Join meeting · Glade",
  robots: { index: false, follow: false },
};

/**
 * Invited guests (co-opted members, staff, advisers) join a live meeting here
 * without an account. The link is personal: it's their identity in the room.
 */
export default async function GuestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await resolveGuestToken(token);

  if (!guest) {
    return (
      <main className="max-w-md mx-auto px-4 py-24 text-center">
        <h1 className="text-xl font-medium text-bark mb-2" style={{ fontFamily: "var(--font-display)" }}>
          This link isn&apos;t valid
        </h1>
        <p className="text-sm text-bark-muted">
          It may have been withdrawn. Ask the meeting&apos;s facilitator for a new one.
        </p>
      </main>
    );
  }

  const meeting = await getMeetingById(guest.spaceId, guest.meetingId);
  if (!meeting) return null;

  const [space] = await db.select({ settings: spaces.settings }).from(spaces).where(eq(spaces.id, guest.spaceId));
  const settings = (space?.settings as Record<string, unknown>) || {};
  const voteThreshold = typeof settings.votePassThreshold === "number" ? settings.votePassThreshold : 0.5;

  const proposalIds = meeting.agendaItems.map((a) => a.proposalId).filter((id): id is string => !!id);
  const proposalRows = proposalIds.length
    ? await db
        .select({
          id: proposals.id,
          description: proposals.description,
          rationale: proposals.rationale,
          suggestedMethod: proposals.suggestedMethod,
        })
        .from(proposals)
        .where(inArray(proposals.id, proposalIds))
    : [];
  const proposalMap = new Map(proposalRows.map((p) => [p.id, p]));

  return (
    <main className="min-h-screen bg-paper">
      <div className="border-b border-border px-4 py-2 text-xs text-bark-muted">
        Joined as <span className="font-medium text-bark">{guest.name}</span>
        {guest.label ? ` (${guest.label})` : ""}
        {guest.canVote ? "" : " · you can ask questions, react, give advice and speak"}
      </div>
      <GuestMeeting
        token={token}
        meetingId={meeting.id}
        meetingTitle={meeting.title}
        voteThreshold={voteThreshold}
        participantId={guestParticipantId(guest.id)}
        agendaItems={meeting.agendaItems.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          type: item.type,
          durationMinutes: item.durationMinutes,
          proposalId: item.proposalId || null,
          proposal: item.proposalId ? proposalMap.get(item.proposalId) ?? null : null,
        }))}
      />
    </main>
  );
}
