"use client";

import { CheckCircle2, Circle, SkipForward, ChevronRight } from "lucide-react";
import type { MeetingSessionState, CompletedItem } from "@/lib/meeting-state";

interface AgendaItem {
  id: string;
  title: string;
  type: string;
  durationMinutes: number | null;
}

const TYPE_COLORS: Record<string, string> = {
  for_decision: "text-canopy",
  for_discussion: "text-amber",
  for_information: "text-sky",
};

export function AgendaNavigator({
  agendaItems,
  state,
  onGoTo,
  readOnly = false,
}: {
  agendaItems: AgendaItem[];
  state: MeetingSessionState;
  onGoTo: (index: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      {agendaItems.map((item, i) => {
        const isCurrent = i === state.currentAgendaItemIndex && state.phase !== "completed";
        const completed = state.completedItems[i] as CompletedItem | undefined;
        const isSkipped = completed?.skipped;
        const isDone = !!completed && !isSkipped;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => !readOnly && onGoTo(i)}
            disabled={readOnly}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
              isCurrent
                ? "bg-canopy-pale border border-canopy/20"
                : "hover:bg-paper-warm"
            } ${readOnly ? "cursor-default" : ""}`}
          >
            {/* Status icon */}
            <span className="shrink-0">
              {isDone ? (
                <CheckCircle2 size={16} className="text-canopy" />
              ) : isSkipped ? (
                <SkipForward size={16} className="text-bark-muted/40" />
              ) : isCurrent ? (
                <ChevronRight size={16} className="text-canopy" />
              ) : (
                <Circle size={16} className="text-bark-muted/30" />
              )}
            </span>

            {/* Item info */}
            <div className="flex-1 min-w-0">
              <span
                className={`text-sm leading-snug block truncate ${
                  isCurrent
                    ? "font-medium text-bark"
                    : isDone || isSkipped
                    ? "text-bark-muted line-through"
                    : "text-bark"
                }`}
              >
                {item.title}
              </span>
            </div>

            {/* Duration */}
            {item.durationMinutes && (
              <span className={`text-xs shrink-0 ${TYPE_COLORS[item.type] || "text-bark-muted"}`}>
                {item.durationMinutes}m
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
