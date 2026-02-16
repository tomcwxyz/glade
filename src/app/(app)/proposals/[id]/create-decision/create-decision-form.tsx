"use client";

import { useState } from "react";
import { createDecisionFromProposal } from "@/lib/proposal-actions";
import { Loader2 } from "lucide-react";

const METHODS = [
  { value: "consent", label: "Consent" },
  { value: "majority_vote", label: "Majority Vote" },
  { value: "advice_process", label: "Advice Process" },
  { value: "delegation", label: "Delegation" },
  { value: "consensus", label: "Consensus" },
  { value: "lazy_consensus", label: "Lazy Consensus" },
];

const inputClass =
  "w-full px-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors";

export function CreateDecisionFromProposal({
  proposalId,
  suggestedMethod,
}: {
  proposalId: string;
  suggestedMethod: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createDecisionFromProposal(proposalId, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label htmlFor="method" className="block text-sm font-medium text-bark mb-1.5">
              Decision method
            </label>
            <select
              id="method"
              name="method"
              required
              defaultValue={suggestedMethod || "consent"}
              className={inputClass}
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-bark mb-1.5">
              Decision date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="outcome" className="block text-sm font-medium text-bark mb-1.5">
            Outcome <span className="font-normal text-bark-muted">(optional)</span>
          </label>
          <textarea
            id="outcome"
            name="outcome"
            rows={3}
            placeholder="What was decided?"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label htmlFor="participants" className="block text-sm font-medium text-bark mb-1.5">
            Participants <span className="font-normal text-bark-muted">(comma-separated names)</span>
          </label>
          <input
            id="participants"
            name="participants"
            type="text"
            placeholder="e.g. Alice, Bob, Carol"
            className={inputClass}
          />
        </div>

        <div className="pt-4 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "Create decision"
            )}
          </button>
        </div>
      </form>
    </>
  );
}
