"use client";

import { useState } from "react";
import { CircleDot, Loader2, Plus, Check } from "lucide-react";

const METHOD_OPTIONS = [
  { value: "consent", label: "Consent" },
  { value: "majority_vote", label: "Majority Vote" },
  { value: "advice_process", label: "Advice Process" },
  { value: "lazy_consensus", label: "Lazy Consensus" },
  { value: "delegation", label: "Delegation" },
  { value: "consensus", label: "Consensus" },
];

export function DecisionControls({
  onRecord,
  onStartFlow,
}: {
  onRecord: (title: string, method: string, outcome?: string) => Promise<void>;
  onStartFlow: (method: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [method, setMethod] = useState("consent");
  const [outcome, setOutcome] = useState("");
  const [loading, setLoading] = useState(false);
  const [recorded, setRecorded] = useState(false);

  async function handleRecord() {
    if (!title.trim()) return;
    setLoading(true);
    await onRecord(title.trim(), method, outcome.trim() || undefined);
    setLoading(false);
    setRecorded(true);
    setTimeout(() => {
      setRecorded(false);
      setShowForm(false);
      setTitle("");
      setOutcome("");
    }, 1500);
  }

  if (recorded) {
    return (
      <div className="flex items-center gap-2 p-3 bg-canopy-pale rounded-lg text-canopy text-sm font-medium">
        <Check size={16} />
        Decision recorded
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark hover:bg-paper-warm transition-colors"
        >
          <Plus size={14} />
          Record decision
        </button>
        <button
          type="button"
          onClick={() => onStartFlow("consent")}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors"
        >
          <CircleDot size={14} />
          Start decision flow
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-paper-warm rounded-xl border border-border space-y-3">
      <h3 className="text-sm font-medium text-bark flex items-center gap-1.5">
        <CircleDot size={14} className="text-canopy" />
        Record a decision
      </h3>

      <input
        type="text"
        placeholder="Decision title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20 focus:border-canopy"
      />

      <div className="flex gap-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
        >
          {METHOD_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        placeholder="Outcome (optional)"
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20 focus:border-canopy"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleRecord}
          disabled={loading || !title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-canopy text-paper rounded-lg font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Record
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="px-3 py-2 text-sm text-bark-muted hover:text-bark transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
