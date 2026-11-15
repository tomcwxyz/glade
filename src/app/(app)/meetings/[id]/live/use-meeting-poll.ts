"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MeetingSessionState } from "@/lib/meeting-state";

/** A member currently in the meeting (polled within the presence window). */
export interface PresentMember {
  userId: string;
  name: string;
  role: string;
}

interface PollResult {
  state: MeetingSessionState | null;
  presence: PresentMember[];
  status: string;
  loading: boolean;
  error: string | null;
  mutate: (newState: MeetingSessionState) => void;
}

export function useMeetingPoll(meetingId: string, intervalMs = 2000): PollResult {
  const [state, setState] = useState<MeetingSessionState | null>(null);
  const [status, setStatus] = useState<string>("draft");
  const [presence, setPresence] = useState<PresentMember[]>([]);
  const presenceKeyRef = useRef("");
  const tickRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);
  // Once the meeting completes there's nothing more to poll for.
  const completedRef = useRef(false);

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings/${meetingId}/state`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) {
          setError("Session expired");
          return;
        }
        return;
      }
      const data = await res.json();
      const serverState = data.state as MeetingSessionState | null;

      if (serverState && serverState.version > versionRef.current) {
        versionRef.current = serverState.version;
        setState(serverState);
      }
      setStatus(data.status);
      const nextPresence = (Array.isArray(data.presence) ? data.presence : []) as PresentMember[];
      const key = nextPresence.map((p) => `${p.userId}:${p.role}`).sort().join(",");
      if (key !== presenceKeyRef.current) {
        presenceKeyRef.current = key;
        setPresence(nextPresence);
      }
      setError(null);
      if (data.status === "completed" || serverState?.phase === "completed") {
        completedRef.current = true;
      }
    } catch {
      // Silently ignore network errors during polling
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(() => {
      // Don't poll once completed. While the tab is hidden, back off to every
      // 7th tick (~14s): enough to stay counted as present (30s window, used
      // for quorum) without full-rate polling from a locked phone.
      if (completedRef.current) return;
      tickRef.current += 1;
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      if (hidden && tickRef.current % 7 !== 0) return;
      fetchState();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [fetchState, intervalMs]);

  const mutate = useCallback((newState: MeetingSessionState) => {
    versionRef.current = newState.version;
    setState(newState);
  }, []);

  return { state, presence, status, loading, error, mutate };
}
