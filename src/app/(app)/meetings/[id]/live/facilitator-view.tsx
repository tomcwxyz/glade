"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useMeetingPoll } from "./use-meeting-poll";
import { AgendaNavigator } from "./agenda-navigator";
import { MeetingTimer } from "./meeting-timer";
import { DecisionControls } from "./decision-controls";
import { DecisionFlowContainer } from "./decision-flow-container";
import {
  advanceAgendaItem,
  skipAgendaItem,
  goToAgendaItem,
  startTimer,
  pauseTimer,
  resetTimer,
  beginDecisionFlow,
  recordMeetingDecision,
  endMeeting,
} from "@/lib/meeting-live-actions";
import {
  ChevronRight,
  SkipForward,
  Users,
  Square,
  Loader2,
  CheckCircle2,
  List,
  X,
} from "lucide-react";

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

export function FacilitatorView({
  meetingId,
  meetingTitle,
  agendaItems,
}: {
  meetingId: string;
  meetingTitle: string;
  agendaItems: AgendaItem[];
}) {
  const router = useRouter();
  const { state, loading, mutate } = useMeetingPoll(meetingId);
  const [mobileAgendaOpen, setMobileAgendaOpen] = useState(false);

  const handleGoTo = useCallback(
    async (index: number) => {
      const result = await goToAgendaItem(meetingId, index);
      if ("state" in result && result.state) mutate(result.state);
      setMobileAgendaOpen(false);
    },
    [meetingId, mutate]
  );

  const handleAdvance = useCallback(async () => {
    const result = await advanceAgendaItem(meetingId);
    if ("state" in result && result.state) mutate(result.state);
  }, [meetingId, mutate]);

  const handleSkip = useCallback(async () => {
    const result = await skipAgendaItem(meetingId);
    if ("state" in result && result.state) mutate(result.state);
  }, [meetingId, mutate]);

  const handleStartTimer = useCallback(
    async (minutes: number) => {
      const result = await startTimer(meetingId, minutes);
      if ("state" in result && result.state) mutate(result.state);
    },
    [meetingId, mutate]
  );

  const handlePauseTimer = useCallback(async () => {
    const result = await pauseTimer(meetingId);
    if ("state" in result && result.state) mutate(result.state);
  }, [meetingId, mutate]);

  const handleResetTimer = useCallback(async () => {
    const result = await resetTimer(meetingId);
    if ("state" in result && result.state) mutate(result.state);
  }, [meetingId, mutate]);

  const handleStartDecisionFlow = useCallback(
    async (method: string) => {
      const result = await beginDecisionFlow(meetingId, method);
      if ("state" in result && result.state) mutate(result.state);
    },
    [meetingId, mutate]
  );

  const handleRecordDecision = useCallback(
    async (title: string, method: string, outcome?: string) => {
      const result = await recordMeetingDecision(meetingId, title, method, outcome);
      if ("decisionId" in result) {
        // Advance with the decision linked
        const advResult = await advanceAgendaItem(meetingId, outcome, result.decisionId);
        if ("state" in advResult && advResult.state) mutate(advResult.state);
      }
    },
    [meetingId, mutate]
  );

  const handleEndMeeting = useCallback(async () => {
    await endMeeting(meetingId);
    router.push(`/meetings/${meetingId}/summary`);
  }, [meetingId, router]);

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
        <p className="text-bark-muted mb-6">
          {Object.keys(state.completedItems).length} agenda items covered.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/meetings/${meetingId}/summary`)}
          className="px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
        >
          View summary
        </button>
      </div>
    );
  }

  const currentItem = agendaItems[state.currentAgendaItemIndex];
  const typeConfig = AGENDA_TYPE_LABELS[currentItem?.type] || AGENDA_TYPE_LABELS.for_discussion;
  const participantCount = Object.keys(state.participants).length;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)]">
      {/* Mobile: compact agenda bar + collapsible panel */}
      <div className="md:hidden border-b border-border bg-paper-warm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1 min-w-0">
            <h2
              className="text-sm font-medium text-bark truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {meetingTitle}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-bark-muted">
              <span className="flex items-center gap-1">
                <Users size={11} />
                {participantCount}
              </span>
              <span>·</span>
              <span>
                Item {state.currentAgendaItemIndex + 1}/{agendaItems.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleEndMeeting}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-earth/30 text-earth rounded-lg hover:bg-earth/5 transition-colors"
            >
              <Square size={12} />
              End
            </button>
            <button
              type="button"
              onClick={() => setMobileAgendaOpen(!mobileAgendaOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-bark-muted hover:text-bark hover:bg-paper-deep transition-colors"
              aria-label={mobileAgendaOpen ? "Close agenda" : "View agenda"}
            >
              {mobileAgendaOpen ? <X size={18} /> : <List size={18} />}
            </button>
          </div>
        </div>

        {mobileAgendaOpen && (
          <div className="px-4 pb-3 border-t border-border/50">
            <AgendaNavigator
              agendaItems={agendaItems}
              state={state}
              onGoTo={handleGoTo}
            />
          </div>
        )}
      </div>

      {/* Desktop: sidebar */}
      <aside className="hidden md:flex md:flex-col w-72 border-r border-border bg-paper-warm p-4 overflow-y-auto shrink-0">
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
          onGoTo={handleGoTo}
        />

        <div className="mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleEndMeeting}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-earth/30 text-earth rounded-lg hover:bg-earth/5 transition-colors"
          >
            <Square size={14} />
            End meeting
          </button>
        </div>
      </aside>

      {/* Main content: current item */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {currentItem && (
          <div className="max-w-2xl">
            {/* Current item header */}
            <div className="mb-6 md:mb-8">
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
                className="text-xl md:text-2xl font-medium tracking-tight mb-2"
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

            {/* Timer */}
            <div className="mb-6 md:mb-8">
              <MeetingTimer
                timer={{
                  ...state.timer,
                  durationMinutes: currentItem.durationMinutes || state.timer.durationMinutes,
                }}
                onStart={handleStartTimer}
                onPause={handlePauseTimer}
                onReset={handleResetTimer}
              />
            </div>

            {/* Speaker stack */}
            {state.speakerStack.length > 0 && (
              <div className="mb-6 md:mb-8">
                <h3 className="text-xs uppercase tracking-wider text-bark-muted font-medium mb-2">
                  Speaker stack
                </h3>
                <div className="space-y-1">
                  {state.speakerStack.map((s, i) => (
                    <div
                      key={s.participantId}
                      className="flex items-center gap-2 px-3 py-2 bg-paper-warm rounded-lg text-sm"
                    >
                      <span className="text-xs text-bark-muted font-medium w-5">
                        {i + 1}.
                      </span>
                      <span className="text-bark">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision flow or controls */}
            {state.phase === "decision_flow" && state.decisionFlow ? (
              <DecisionFlowContainer
                meetingId={meetingId}
                state={state}
                mutate={mutate}
                isFacilitator
              />
            ) : (
              <div className="space-y-4">
                {currentItem.type === "for_decision" && (
                  <DecisionControls
                    onRecord={handleRecordDecision}
                    onStartFlow={handleStartDecisionFlow}
                  />
                )}

                {/* Navigation */}
                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleAdvance}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors"
                  >
                    Next item
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-bark-muted border border-border rounded-lg hover:bg-paper-warm transition-colors"
                  >
                    <SkipForward size={14} />
                    Skip
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
