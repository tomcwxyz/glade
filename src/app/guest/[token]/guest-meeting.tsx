"use client";

import { useEffect } from "react";
import { LiveRegionProvider } from "@/components/live-region";
import { ParticipantView } from "@/app/(app)/meetings/[id]/live/participant-view";
import { GuestLiveActionsProvider } from "@/app/(app)/meetings/[id]/live/live-actions";
import { guestJoin } from "@/lib/guest-actions";

type AgendaItem = Parameters<typeof ParticipantView>[0]["agendaItems"][number];

/** A guest's live meeting: the participant view, acting through their token. */
export function GuestMeeting({
  token,
  meetingId,
  meetingTitle,
  agendaItems,
  voteThreshold,
  participantId,
}: {
  token: string;
  meetingId: string;
  meetingTitle: string;
  agendaItems: AgendaItem[];
  voteThreshold: number;
  participantId: string;
}) {
  // Show up in the facilitator's participant list.
  useEffect(() => {
    guestJoin(token).catch(() => {});
  }, [token]);

  return (
    <LiveRegionProvider>
      <GuestLiveActionsProvider token={token}>
        <ParticipantView
          meetingId={meetingId}
          meetingTitle={meetingTitle}
          agendaItems={agendaItems}
          voteThreshold={voteThreshold}
          currentUserId={participantId}
          pollUrl={`/api/guest/${token}/state`}
          isGuest
        />
      </GuestLiveActionsProvider>
    </LiveRegionProvider>
  );
}
