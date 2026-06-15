"use client";

import { useState } from "react";
import type { MeetingSessionState, SpeakerEntry } from "@/lib/meeting-state";
import { speakerStatus } from "@/lib/meeting-state";
import {
  requestToSpeak,
  withdrawSpeaker,
  callSpeaker,
  markSpeakerDone,
  setSpeakerNote,
} from "@/lib/meeting-live-actions";
import { Hand, Mic, Check, X } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting",
  speaking: "Speaking",
  spoke: "Spoke",
};

export function SpeakerStack({
  meetingId,
  state,
  mutate,
  mode,
  currentUserId,
}: {
  meetingId: string;
  state: MeetingSessionState;
  mutate: (s: MeetingSessionState) => void;
  mode: "facilitator" | "participant";
  currentUserId?: string;
}) {
  const stack = state.speakerStack;
  const isFacilitator = mode === "facilitator";
  const meInStack = stack.some((s) => s.participantId === currentUserId);

  function apply(result: unknown) {
    if (result && typeof result === "object" && "state" in result) {
      const next = (result as { state?: MeetingSessionState }).state;
      if (next) mutate(next);
    }
  }

  return (
    <div className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs uppercase tracking-wider text-bark-muted font-medium">
          Speaker stack ({stack.length})
        </h3>
        {mode === "participant" && (
          <button
            type="button"
            onClick={async () => apply(await (meInStack ? withdrawSpeaker(meetingId) : requestToSpeak(meetingId)))}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              meInStack
                ? "border border-border text-bark-muted hover:bg-paper-deep"
                : "bg-canopy text-paper hover:bg-canopy-light"
            }`}
          >
            <Hand size={12} />
            {meInStack ? "Lower hand" : "Raise hand"}
          </button>
        )}
      </div>

      {stack.length === 0 ? (
        <p className="text-xs text-bark-muted/60">No speakers in queue</p>
      ) : (
        <div className="space-y-1">
          {stack.map((entry, i) => (
            <SpeakerRow
              key={entry.participantId}
              entry={entry}
              index={i}
              isMe={entry.participantId === currentUserId}
              isFacilitator={isFacilitator}
              meetingId={meetingId}
              onResult={apply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SpeakerRow({
  entry,
  index,
  isMe,
  isFacilitator,
  meetingId,
  onResult,
}: {
  entry: SpeakerEntry;
  index: number;
  isMe: boolean;
  isFacilitator: boolean;
  meetingId: string;
  onResult: (result: unknown) => void;
}) {
  const status = speakerStatus(entry);
  const [note, setNote] = useState(entry.note ?? "");
  const [editingNote, setEditingNote] = useState(false);

  const statusStyle =
    status === "speaking"
      ? "bg-canopy-pale border border-canopy/30"
      : status === "spoke"
      ? "bg-paper-warm opacity-60"
      : "bg-paper-warm";

  return (
    <div className={`px-3 py-2 rounded-lg text-sm ${statusStyle}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs text-bark-muted font-medium w-5">{index + 1}.</span>
        <span className="text-bark flex-1">
          {entry.name}
          {isMe && <span className="text-bark-muted"> (you)</span>}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-[0.625rem] font-medium ${
            status === "speaking"
              ? "bg-canopy text-paper"
              : status === "spoke"
              ? "bg-paper-deep text-bark-muted"
              : "bg-amber/10 text-amber"
          }`}
        >
          {status === "speaking" && <Mic size={9} className="inline mr-0.5 -mt-0.5" />}
          {STATUS_LABEL[status]}
        </span>

        {isFacilitator && (
          <div className="flex items-center gap-1">
            {status !== "speaking" && status !== "spoke" && (
              <button
                type="button"
                onClick={async () => onResult(await callSpeaker(meetingId, entry.participantId))}
                className="px-2 py-1 text-[0.6875rem] bg-canopy text-paper rounded-md font-medium hover:bg-canopy-light transition-colors"
              >
                Call
              </button>
            )}
            {status === "speaking" && (
              <button
                type="button"
                onClick={async () => onResult(await markSpeakerDone(meetingId, entry.participantId))}
                className="flex items-center gap-1 px-2 py-1 text-[0.6875rem] border border-border text-bark-muted rounded-md hover:bg-paper-deep transition-colors"
              >
                <Check size={11} />
                Done
              </button>
            )}
            <button
              type="button"
              onClick={async () => onResult(await withdrawSpeaker(meetingId, entry.participantId))}
              aria-label={`Remove ${entry.name} from the stack`}
              className="p-1 text-bark-muted hover:text-earth transition-colors"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Note / clarifying question */}
      {isFacilitator ? (
        editingNote || note ? (
          <div className="mt-1.5 pl-7">
            <input
              type="text"
              value={note}
              placeholder="Note / clarifying question raised…"
              onFocus={() => setEditingNote(true)}
              onChange={(e) => setNote(e.target.value)}
              onBlur={async () => {
                setEditingNote(false);
                if ((entry.note ?? "") !== note) {
                  onResult(await setSpeakerNote(meetingId, entry.participantId, note));
                }
              }}
              className="w-full px-2 py-1 text-xs border border-border rounded-md bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="mt-1 ml-7 text-[0.6875rem] text-bark-muted/70 hover:text-bark-muted transition-colors"
          >
            + Add note
          </button>
        )
      ) : (
        entry.note && (
          <p className="mt-1 pl-7 text-xs text-bark-muted italic">{entry.note}</p>
        )
      )}
    </div>
  );
}
