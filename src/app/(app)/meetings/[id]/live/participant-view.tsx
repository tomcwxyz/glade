"use client";

import { useMeetingPoll } from "./use-meeting-poll";
import { AgendaNavigator } from "./agenda-navigator";
import { MeetingTimer } from "./meeting-timer";
import { DecisionFlowContainer } from "./decision-flow-container";
import { ParticipantInteractions } from "./participant-interactions";
import {
  Loader2,
  CheckCircle2,
  Users,
  Hand,
} from "lucide-react";
import { requestToSpeak, withdrawSpeaker } from "@/lib/meeting-live-actions";
import { useCallback } from "react";

const AGENDA_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  for_decision: { label: "For decision", color: "text-canopy bg-canopy-pale" },
  for_discussion: { label: "For discussion", color: "text-amber bg-amber/10" },
  for_information: { label: "For information", color: "text-sky bg-sky/10" },
};

interface AgendaItem {
  id: string;
  title: string;
  description: string | null;
  type: string;
  durationMinutes: number | null;
}

export function ParticipantView({
  meetingId,
  meetingTitle,
  agendaItems,
}: {
  meetingId: string;
  meetingTitle: string;
  agendaItems: AgendaItem[];
}) {
  const { state, loading, mutate } = useMeetingPoll(meetingId);

  const handleRequestToSpeak = useCallback(async () => {
    const result = await requestToSpeak(meetingId);
    if ("state" in result && result.state) mutate(result.state);
  }, [meetingId, mutate]);

  const handleWithdraw = useCallback(async () => {
    const result = await withdrawSpeaker(meetingId);
    if ("state" in result && result.state) mutate(result.state);
  }, [meetingId, mutate]);

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="animate-spin text-bark-muted" />
      </div>
    );
  }

  if (state.phase === "completed") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <CheckCircle2 size={48} className="mx-auto mb-4 text-canopy" />
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Meeting complete
        </h1>
        <p className="text-bark-muted">
          Thank you for participating.
        </p>
      </div>
    );
  }

  const currentItem = agendaItems[state.currentAgendaItemIndex];
  const typeConfig = AGENDA_TYPE_LABELS[currentItem?.type] || AGENDA_TYPE_LABELS.for_discussion;
  const participantCount = Object.keys(state.participants).length;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left sidebar */}
      <aside className="w-72 border-r border-border bg-paper-warm p-4 overflow-y-auto shrink-0">
        <div className="mb-4">
          <h2
            className="text-sm font-medium text-bark truncate"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {meetingTitle}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-xs text-bark-muted">
            <span className="flex items-center gap-1">
              <Users size={11} />
              {participantCount}
            </span>
            <span>·</span>
            <span>
              {state.currentAgendaItemIndex + 1}/{agendaItems.length}
            </span>
          </div>
        </div>

        <AgendaNavigator
          agendaItems={agendaItems}
          state={state}
          onGoTo={() => {}}
          readOnly
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {currentItem && (
          <div className="max-w-2xl">
            {/* Current item */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-bark-muted font-medium">
                  Item {state.currentAgendaItemIndex + 1} of {agendaItems.length}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${typeConfig.color}`}
                >
                  {typeConfig.label}
                </span>
              </div>
              <h1
                className="text-2xl font-medium tracking-tight mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {currentItem.title}
              </h1>
              {currentItem.description && (
                <p className="text-[0.9375rem] text-bark-muted leading-relaxed">
                  {currentItem.description}
                </p>
              )}
            </div>

            {/* Timer (read-only) */}
            <div className="mb-8">
              <MeetingTimer
                timer={{
                  ...state.timer,
                  durationMinutes: currentItem.durationMinutes || state.timer.durationMinutes,
                }}
                onStart={() => {}}
                onPause={() => {}}
                onReset={() => {}}
                readOnly
              />
            </div>

            {/* Speaker stack + request to speak */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs uppercase tracking-wider text-bark-muted font-medium">
                  Speaker stack ({state.speakerStack.length})
                </h3>
                <button
                  type="button"
                  onClick={handleRequestToSpeak}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
                >
                  <Hand size={12} />
                  Raise hand
                </button>
              </div>
              {state.speakerStack.length > 0 ? (
                <div className="space-y-1">
                  {state.speakerStack.map((s, i) => (
                    <div
                      key={s.participantId}
                      className="flex items-center gap-2 px-3 py-2 bg-paper-warm rounded-lg text-sm"
                    >
                      <span className="text-xs text-bark-muted font-medium w-5">
                        {i + 1}.
                      </span>
                      <span className="text-bark flex-1">{s.name}</span>
                      {/* Show withdraw button for own entry */}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-bark-muted/60">No speakers in queue</p>
              )}
              <button
                type="button"
                onClick={handleWithdraw}
                className="mt-2 text-xs text-bark-muted hover:text-bark transition-colors"
              >
                Lower hand
              </button>
            </div>

            {/* Decision flow interactions */}
            {state.phase === "decision_flow" && state.decisionFlow ? (
              <DecisionFlowContainer
                meetingId={meetingId}
                state={state}
                mutate={mutate}
                isFacilitator={false}
              />
            ) : (
              <ParticipantInteractions
                meetingId={meetingId}
                state={state}
                mutate={mutate}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
