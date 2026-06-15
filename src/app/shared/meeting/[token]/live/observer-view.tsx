"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { MeetingSessionState } from "@/lib/meeting-state";
import { speakerStatus } from "@/lib/meeting-state";
import {
  TreePine,
  Users,
  CheckCircle2,
  Circle,
  ChevronRight,
  SkipForward,
  Clock,
  Hand,
  Mic,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

// Human labels for raw response values across the decision methods.
const VALUE_LABELS: Record<string, string> = {
  for: "For",
  against: "Against",
  abstain: "Abstain",
  support: "👍 Support",
  concern: "🤔 Concern",
  neutral: "😐 Neutral",
  objection: "Objection",
  no_objection: "No objection",
  advice: "Advice",
  hot: "🔥 Hot",
  warm: "👍 Warm",
  lukewarm: "🤔 Lukewarm",
  cold: "❄️ Cold",
};

const METHOD_LABELS: Record<string, string> = {
  consent: "Consent",
  majority_vote: "Majority vote",
  advice_process: "Advice process",
  lazy_consensus: "Lazy consensus",
  delegation: "Delegation",
  temperature_check: "Temperature check",
};

function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const s = Math.abs(Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${sign}${m}:${r.toString().padStart(2, "0")}`;
}

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
  token,
  meetingTitle,
  agendaItems,
}: {
  token: string;
  meetingTitle: string;
  agendaItems: AgendaItem[];
}) {
  const [state, setState] = useState<MeetingSessionState | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now()); // ticks for a smooth timer
  const versionRef = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      // Public observer polls the token-scoped endpoint (no auth required).
      const res = await fetch(`/api/shared/meeting/${token}/state`, {
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
  }, [token]);

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

  // Timer remaining (re-derived each render; `nowMs` ticks every second).
  const timer = state.timer;
  const elapsedSeconds = timer.startedAt
    ? timer.elapsed + (nowMs - new Date(timer.startedAt).getTime()) / 1000
    : timer.elapsed;
  const remainingSeconds = timer.durationMinutes * 60 - elapsedSeconds;
  const timerActive = !!timer.startedAt || timer.elapsed > 0;

  // Aggregate response tally for the active decision flow (counts only — no names).
  const flow = state.decisionFlow;
  const tally: { value: string; count: number }[] = [];
  if (flow) {
    const counts = new Map<string, number>();
    for (const r of flow.responses) {
      if (r.stage === "clarify") continue; // questions, not votes
      counts.set(r.value, (counts.get(r.value) ?? 0) + 1);
    }
    for (const [value, count] of counts) tally.push({ value, count });
  }
  const objectionCount = flow
    ? flow.responses.filter((r) => r.value === "objection").length
    : 0;

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

            {/* Timer */}
            {timerActive && (
              <div className="mb-6 flex items-center gap-2 text-sm">
                <Clock size={15} className={remainingSeconds < 0 ? "text-red-600" : "text-gray-500"} />
                <span
                  className={`tabular-nums font-medium ${
                    remainingSeconds < 0 ? "text-red-600" : "text-gray-700"
                  }`}
                >
                  {formatClock(remainingSeconds)}
                </span>
                <span className="text-xs text-gray-400">
                  {timer.paused ? "paused" : remainingSeconds < 0 ? "over time" : "remaining"}
                </span>
              </div>
            )}

            {/* Speaker stack */}
            {state.speakerStack.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2">
                  Speaker stack
                </h2>
                <div className="space-y-1">
                  {state.speakerStack.map((s, i) => {
                    const status = speakerStatus(s);
                    return (
                      <div
                        key={s.participantId}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                          status === "speaking" ? "bg-green-50" : "bg-white border border-gray-100"
                        }`}
                      >
                        <span className="text-xs text-gray-400 font-medium w-5">{i + 1}.</span>
                        <span className={`flex-1 ${status === "spoke" ? "text-gray-400" : "text-gray-700"}`}>
                          {s.name}
                        </span>
                        {status === "speaking" && (
                          <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                            <Mic size={11} /> Speaking
                          </span>
                        )}
                        {status === "waiting" && <Hand size={12} className="text-gray-300" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Live decision flow (aggregate, no individual attribution) */}
            {state.phase === "decision_flow" && flow && (
              <div className="mb-8 bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={15} className="text-green-700" />
                  <span className="text-sm font-medium text-gray-900">
                    {METHOD_LABELS[flow.method] || flow.method}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">· {flow.stage}</span>
                </div>
                {flow.responses.length === 0 ? (
                  <p className="text-xs text-gray-400">Awaiting responses…</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tally.map((t) => (
                      <span
                        key={t.value}
                        className="px-2.5 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border border-gray-100"
                      >
                        {VALUE_LABELS[t.value] || t.value}: <span className="font-medium">{t.count}</span>
                      </span>
                    ))}
                  </div>
                )}
                {objectionCount > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertTriangle size={13} />
                    {objectionCount} objection{objectionCount === 1 ? "" : "s"} raised
                  </div>
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
                    <div className="flex-1 min-w-0">
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
                      {isDone && completed?.outcome && (
                        <p className="text-xs text-gray-500 mt-0.5 no-underline">
                          → {completed.outcome}
                        </p>
                      )}
                    </div>
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
