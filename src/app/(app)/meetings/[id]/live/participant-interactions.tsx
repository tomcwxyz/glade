"use client";

import type { MeetingSessionState } from "@/lib/meeting-state";
import { submitResponse } from "@/lib/meeting-live-actions";
import { useState, useCallback } from "react";
import { MessageCircle, Loader2 } from "lucide-react";

export function ParticipantInteractions({
  meetingId,
  state,
  mutate,
}: {
  meetingId: string;
  state: MeetingSessionState;
  mutate: (s: MeetingSessionState) => void;
}) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const flow = state.decisionFlow;

  const handleSubmit = useCallback(
    async (value: string) => {
      setLoading(true);
      const result = await submitResponse(meetingId, value, comment || undefined);
      if ("state" in result && result.state) mutate(result.state);
      setSubmitted(true);
      setLoading(false);
    },
    [meetingId, comment, mutate]
  );

  if (!flow) {
    return (
      <div className="p-4 bg-paper-warm rounded-xl border border-border">
        <p className="text-sm text-bark-muted flex items-center gap-2">
          <MessageCircle size={14} />
          Waiting for the facilitator to begin a decision process.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-4 bg-canopy-pale rounded-xl border border-canopy/20">
        <p className="text-sm text-canopy font-medium">
          Your response has been recorded. Waiting for other participants…
        </p>
      </div>
    );
  }

  // Stage-specific UI
  if (flow.stage === "present" || flow.stage === "clarify") {
    return (
      <div className="p-4 bg-paper-warm rounded-xl border border-border">
        <h3 className="text-sm font-medium text-bark mb-1 capitalize">
          {flow.stage === "present" ? "Proposal being presented" : "Clarifying questions"}
        </h3>
        {flow.proposalText && (
          <p className="text-sm text-bark-muted mb-3">{flow.proposalText}</p>
        )}
        <p className="text-xs text-bark-muted">
          {flow.stage === "present"
            ? "Listen to the proposal. The facilitator will advance when ready."
            : "Raise your hand to ask a clarifying question."}
        </p>
      </div>
    );
  }

  if (flow.stage === "react") {
    const reactions = ["👍 Support", "🤔 Concern", "👎 Against", "😐 Neutral"];
    return (
      <div className="p-4 bg-paper-warm rounded-xl border border-border">
        <h3 className="text-sm font-medium text-bark mb-3">Quick reaction</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {reactions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleSubmit(r)}
              disabled={loading}
              className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-paper-deep transition-colors disabled:opacity-50"
            >
              {r}
            </button>
          ))}
        </div>
        <textarea
          placeholder="Optional comment…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20"
        />
      </div>
    );
  }

  if (flow.stage === "object") {
    return (
      <div className="p-4 bg-paper-warm rounded-xl border border-border">
        <h3 className="text-sm font-medium text-bark mb-3">Objection round</h3>
        <p className="text-xs text-bark-muted mb-3">
          Do you have a reasoned objection to this proposal?
        </p>
        <textarea
          placeholder="Describe your objection (leave blank for no objection)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20 mb-3"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleSubmit("no_objection")}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            No objection
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("objection")}
            disabled={loading || !comment.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-earth text-paper rounded-lg font-medium hover:bg-earth/90 transition-colors disabled:opacity-50"
          >
            Raise objection
          </button>
        </div>
      </div>
    );
  }

  if (flow.stage === "vote") {
    return (
      <div className="p-4 bg-paper-warm rounded-xl border border-border">
        <h3 className="text-sm font-medium text-bark mb-3">Cast your vote</h3>
        {flow.proposalText && (
          <p className="text-sm text-bark-muted mb-3">{flow.proposalText}</p>
        )}
        <div className="flex gap-2">
          {["For", "Against", "Abstain"].map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => handleSubmit(choice.toLowerCase())}
              disabled={loading}
              className="flex-1 px-4 py-3 text-sm border border-border rounded-lg font-medium hover:bg-paper-deep transition-colors disabled:opacity-50"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-paper-warm rounded-xl border border-border">
      <p className="text-sm text-bark-muted">
        Waiting for the facilitator…
      </p>
    </div>
  );
}
