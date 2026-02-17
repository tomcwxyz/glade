"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MeetingSessionState } from "@/lib/meeting-state";
import {
  TreePine,
  Users,
  CheckCircle2,
  Circle,
  ChevronRight,
  SkipForward,
} from "lucide-react";

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  durationMinutes: number | null;
}

const AGENDA_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  for_decision: { label: "For decision", color: "text-green-700 bg-green-50" },
  for_discussion: { label: "For discussion", color: "text-amber-700 bg-amber-50" },
  for_information: { label: "For information", color: "text-sky-700 bg-sky-50" },
};

export function ObserverView({
  meetingId,
  meetingTitle,
  agendaItems,
}: {
  meetingId: string;
  meetingTitle: string;
  agendaItems: AgendaItem[];
}) {
  const [state, setState] = useState<MeetingSessionState | null>(null);
  const versionRef = useRef(0);

  const fetchState = useCallback(async () => {
    try {
      // Public observer uses unauthenticated poll — reuse the same API but handle 401
      const res = await fetch(`/api/meetings/${meetingId}/state`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const serverState = data.state as MeetingSessionState | null;
      if (serverState && serverState.version > versionRef.current) {
        versionRef.current = serverState.version;
        setState(serverState);
      }
    } catch {
      // Ignore
    }
  }, [meetingId]);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, [fetchState]);

  if (!state) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading meeting state…</p>
      </div>
    );
  }

  const currentItem = agendaItems[state.currentAgendaItemIndex];
  const typeConfig = currentItem
    ? AGENDA_TYPE_LABELS[currentItem.type] || AGENDA_TYPE_LABELS.for_discussion
    : null;

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TreePine size={20} className="text-green-700" />
            <span className="text-sm font-medium text-gray-900">{meetingTitle}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users size={12} />
            {Object.keys(state.participants).length} participants
            <span className="ml-2 px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
              Live
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {state.phase === "completed" ? (
          <div className="text-center py-16">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-600" />
            <h1 className="text-xl font-medium text-gray-900 mb-2">
              Meeting complete
            </h1>
          </div>
        ) : (
          <>
            {/* Current item */}
            {currentItem && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500 font-medium">
                    Item {state.currentAgendaItemIndex + 1} of {agendaItems.length}
                  </span>
                  {typeConfig && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${typeConfig.color}`}
                    >
                      {typeConfig.label}
                    </span>
                  )}
                  {state.phase === "decision_flow" && (
                    <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-medium bg-green-50 text-green-700">
                      Decision in progress
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-medium tracking-tight text-gray-900 mb-2">
                  {currentItem.title}
                </h1>
                {currentItem.description && (
                  <p className="text-gray-500 leading-relaxed">
                    {currentItem.description}
                  </p>
                )}
              </div>
            )}

            {/* Agenda progress */}
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {agendaItems.map((item, i) => {
                const isCurrent = i === state.currentAgendaItemIndex;
                const completed = state.completedItems[i];
                const isSkipped = completed?.skipped;
                const isDone = !!completed && !isSkipped;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      isCurrent ? "bg-green-50/50" : ""
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                    ) : isSkipped ? (
                      <SkipForward size={16} className="text-gray-300 shrink-0" />
                    ) : isCurrent ? (
                      <ChevronRight size={16} className="text-green-600 shrink-0" />
                    ) : (
                      <Circle size={16} className="text-gray-300 shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        isCurrent
                          ? "font-medium text-gray-900"
                          : isDone || isSkipped
                          ? "text-gray-400 line-through"
                          : "text-gray-700"
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <footer className="mt-16 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            Observer view — Powered by Glade
          </p>
        </footer>
      </main>
    </div>
  );
}
