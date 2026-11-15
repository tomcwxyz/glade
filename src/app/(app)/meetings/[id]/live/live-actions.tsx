"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { MeetingSessionState } from "@/lib/meeting-state";
import { submitResponse, withdrawResponse, requestToSpeak, withdrawSpeaker } from "@/lib/meeting-live-actions";
import {
  guestSubmitResponse,
  guestWithdrawResponse,
  guestRequestToSpeak,
  guestWithdrawSpeaker,
} from "@/lib/guest-actions";

type Result = { state?: MeetingSessionState } | { error: string };

/**
 * The taking-part actions (respond, withdraw, queue to speak). Members use
 * their session; invited guests use their secret token. The flows and speaker
 * stack call these through context so the same UI serves both.
 */
export type LiveActions = {
  submitResponse: (meetingId: string, value: string, comment?: string) => Promise<Result>;
  withdrawResponse: (meetingId: string) => Promise<Result>;
  requestToSpeak: (meetingId: string) => Promise<Result>;
  withdrawSpeaker: (meetingId: string, participantId?: string) => Promise<Result>;
};

const memberActions: LiveActions = { submitResponse, withdrawResponse, requestToSpeak, withdrawSpeaker };

const LiveActionsContext = createContext<LiveActions>(memberActions);

export function useLiveActions(): LiveActions {
  return useContext(LiveActionsContext);
}

export function GuestLiveActionsProvider({ token, children }: { token: string; children: ReactNode }) {
  const value = useMemo<LiveActions>(
    () => ({
      submitResponse: (_meetingId, v, comment) => guestSubmitResponse(token, v, comment),
      withdrawResponse: () => guestWithdrawResponse(token),
      requestToSpeak: () => guestRequestToSpeak(token),
      // Guests can only take themselves off the stack.
      withdrawSpeaker: () => guestWithdrawSpeaker(token),
    }),
    [token]
  );
  return <LiveActionsContext.Provider value={value}>{children}</LiveActionsContext.Provider>;
}
