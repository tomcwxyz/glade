"use client";

import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { MeetingTimer as TimerState } from "@/lib/meeting-state";

export function MeetingTimer({
  timer,
  onStart,
  onPause,
  onReset,
  readOnly = false,
}: {
  timer: TimerState;
  onStart: (minutes: number) => void;
  onPause: () => void;
  onReset: () => void;
  readOnly?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timer.startedAt || timer.paused) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.startedAt, timer.paused]);

  const totalSeconds = timer.durationMinutes * 60;
  let elapsed = timer.elapsed;
  if (timer.startedAt && !timer.paused) {
    elapsed += (now - new Date(timer.startedAt).getTime()) / 1000;
  }

  const remaining = Math.max(0, totalSeconds - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);
  const isRunning = !!timer.startedAt && !timer.paused;
  const isOvertime = remaining === 0 && (isRunning || elapsed > 0);

  const progress = totalSeconds > 0 ? Math.min(1, elapsed / totalSeconds) : 0;

  return (
    <div className="flex items-center gap-3">
      {/* Timer display */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${progress * 100.53} 100.53`}
            strokeLinecap="round"
            className={isOvertime ? "text-earth" : "text-canopy"}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-lg font-medium tabular-nums ${
              isOvertime ? "text-earth" : "text-bark"
            }`}
          >
            {isOvertime ? "0:00" : `${minutes}:${seconds.toString().padStart(2, "0")}`}
          </span>
        </div>
      </div>

      {/* Controls */}
      {!readOnly && (
        <div className="flex flex-col gap-1.5">
          {!isRunning ? (
            <button
              type="button"
              onClick={() => onStart(timer.durationMinutes)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
            >
              <Play size={12} />
              {elapsed > 0 ? "Resume" : "Start"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-amber text-paper rounded-lg font-medium hover:bg-amber/90 transition-colors"
            >
              <Pause size={12} />
              Pause
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-border rounded-lg text-bark-muted hover:text-bark transition-colors"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
