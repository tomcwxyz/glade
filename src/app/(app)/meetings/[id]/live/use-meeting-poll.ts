"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MeetingSessionState } from "@/lib/meeting-state";

interface PollResult {
  state: MeetingSessionState | null;
  status: string;
  loading: boolean;
  error: string | null;
  mutate: (newState: MeetingSessionState) => void;
}

export function useMeetingPoll(meetingId: string, intervalMs = 2000): PollResult {
  const [state, setState] = useState<MeetingSessionState | null>(null);
  const [status, setStatus] = useState<string>("draft");
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
      // Don't poll once completed, or while the tab is hidden (saves the server
      // and the client; review noted polling never stopped or backed off).
      if (completedRef.current) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      fetchState();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [fetchState, intervalMs]);

  const mutate = useCallback((newState: MeetingSessionState) => {
    versionRef.current = newState.version;
    setState(newState);
  }, []);

  return { state, status, loading, error, mutate };
}
