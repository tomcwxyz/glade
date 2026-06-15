"use client";

import type { MeetingSessionState, DecisionFlow } from "@/lib/meeting-state";
import { Thermometer, X } from "lucide-react";

const TEMP_OPTIONS = [
  { value: "hot", label: "Hot", emoji: "🔥", description: "Fully supportive" },
  { value: "warm", label: "Warm", emoji: "👍", description: "Mostly good" },
  { value: "lukewarm", label: "Lukewarm", emoji: "🤔", description: "Some concerns" },
  { value: "cold", label: "Cold", emoji: "❄️", description: "Major concerns" },
];

export function TemperatureCheckFlow({
  flow,
  state,
  isFacilitator,
  currentUserId,
  onSubmit,
  onWithdraw,
  onClose,
}: {
  flow: DecisionFlow;
  state: MeetingSessionState;
  isFacilitator: boolean;
  currentUserId?: string;
  onSubmit: (value: string) => void;
  onWithdraw?: () => void;
  onClose: () => void;
}) {
  const participantCount = Object.keys(state.participants).length;
  const responseCount = flow.responses.length;
  // The caller's own response (if any) — drives the "you can change it" state.
  const myVote = flow.responses.find((r) => r.participantId === currentUserId)?.value;
  const hasVoted = !isFacilitator && !!myVote;

  // Tally results
  const tally = TEMP_OPTIONS.map((opt) => ({
    ...opt,
    count: flow.responses.filter((r) => r.value === opt.value).length,
  }));
  const maxCount = Math.max(1, ...tally.map((t) => t.count));

  return (
    <div className="p-5 bg-amber/5 rounded-xl border border-amber/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-bark flex items-center gap-2">
          <Thermometer size={16} className="text-amber" />
          Temperature check
        </h3>
        {isFacilitator && (
          <button
            type="button"
            onClick={onClose}
            className="text-bark-muted hover:text-bark transition-colors"
            aria-label="Close temperature check"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <p className="text-xs text-bark-muted mb-4">
        Quick sentiment pulse — {responseCount} of {participantCount} responded
      </p>

      {/* Results bar (always visible to facilitator, visible after voting to participants) */}
      {(isFacilitator || hasVoted) && responseCount > 0 ? (
        <div className="space-y-2 mb-4">
          {tally.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <span className="text-sm w-24 shrink-0">
                {opt.emoji} {opt.label}
              </span>
              <div className="flex-1 h-6 bg-paper rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber/30 rounded-full transition-all duration-300"
                  style={{ width: `${(opt.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-bark-muted w-6 text-right tabular-nums">
                {opt.count}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Voting buttons — stay live so participants can change their pulse */}
      {!isFacilitator && (
        <div className="grid grid-cols-2 gap-2">
          {TEMP_OPTIONS.map((opt) => {
            const selected = myVote === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onSubmit(opt.value)}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-colors ${
                  selected
                    ? "border border-amber bg-amber/10"
                    : "border border-border hover:bg-paper-deep"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-sm font-medium text-bark">{opt.label}</span>
                <span className="text-[0.6875rem] text-bark-muted">{opt.description}</span>
              </button>
            );
          })}
        </div>
      )}

      {!isFacilitator && hasVoted && (
        <div className="flex items-center gap-3 mt-2">
          <p className="text-xs text-bark-muted">
            Recorded: <span className="font-medium">{myVote}</span> — you can change it.
          </p>
          {onWithdraw && (
            <button
              type="button"
              onClick={onWithdraw}
              className="text-xs text-bark-muted hover:text-earth transition-colors"
            >
              Withdraw
            </button>
          )}
        </div>
      )}

      {isFacilitator && (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 px-4 py-2 text-sm bg-paper border border-border rounded-lg text-bark hover:bg-paper-warm transition-colors"
        >
          Close check & continue
        </button>
      )}
    </div>
  );
}
