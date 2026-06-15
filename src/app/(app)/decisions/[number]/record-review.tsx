"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { recordDecisionReview } from "@/lib/decision-actions";
import { ClipboardCheck } from "lucide-react";

type Outcome = "keep" | "amend" | "supersede" | "retire";

const OUTCOMES: { key: Outcome; label: string; desc: string }[] = [
  { key: "keep", label: "Keep", desc: "Still valid as-is" },
  { key: "amend", label: "Amend", desc: "Needs changes" },
  { key: "supersede", label: "Supersede", desc: "Replaced by another decision" },
  { key: "retire", label: "Retire", desc: "No longer in force" },
];

export function RecordReview({
  decisionId,
  decisions,
}: {
  decisionId: string;
  decisions: { id: string; number: number; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>("keep");
  const [note, setNote] = useState("");
  const [learnings, setLearnings] = useState("");
  const [linkedId, setLinkedId] = useState("");
  const [saving, setSaving] = useState(false);

  const needsLink = outcome === "amend" || outcome === "supersede";

  async function submit() {
    setSaving(true);
    await recordDecisionReview(
      decisionId,
      outcome,
      note || undefined,
      learnings || undefined,
      needsLink && linkedId ? linkedId : undefined
    );
    setSaving(false);
    setOpen(false);
    setNote("");
    setLearnings("");
    setLinkedId("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm border border-border rounded-lg text-bark-muted hover:text-canopy hover:border-canopy/30 transition-colors"
      >
        <ClipboardCheck size={14} />
        Record review
      </button>
    );
  }

  return (
    <div className="border border-border rounded-lg p-3 space-y-3 bg-paper-warm">
      <div className="grid grid-cols-2 gap-1.5">
        {OUTCOMES.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={outcome === o.key}
            onClick={() => setOutcome(o.key)}
            className={`text-left px-2.5 py-1.5 rounded-md border text-xs transition-colors ${
              outcome === o.key
                ? "bg-canopy text-paper border-canopy"
                : "border-border text-bark hover:bg-paper-deep"
            }`}
          >
            <span className="font-medium">{o.label}</span>
            <span className={`block ${outcome === o.key ? "text-paper/80" : "text-bark-muted"}`}>
              {o.desc}
            </span>
          </button>
        ))}
      </div>

      {needsLink && (
        <select
          value={linkedId}
          onChange={(e) => setLinkedId(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-paper focus:outline-none focus:ring-2 focus:ring-canopy/20"
        >
          <option value="">
            {outcome === "supersede" ? "Superseded by…" : "Amended by…"} (optional)
          </option>
          {decisions
            .filter((d) => d.id !== decisionId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                #{d.number} {d.title}
              </option>
            ))}
        </select>
      )}

      <textarea
        placeholder="Review note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20"
      />
      <textarea
        placeholder="What did we learn? (optional)"
        value={learnings}
        onChange={(e) => setLearnings(e.target.value)}
        rows={2}
        className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-paper resize-none focus:outline-none focus:ring-2 focus:ring-canopy/20"
      />

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="px-3 py-1.5 text-xs bg-canopy text-paper rounded-md font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
        >
          Save review
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
