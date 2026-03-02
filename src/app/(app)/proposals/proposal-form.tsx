"use client";

import { useState } from "react";
import { createProposal, updateProposal } from "@/lib/proposal-actions";
import { inputClass, textareaClass } from "@/lib/utils";
import { Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { FormError } from "@/components/form-error";

const METHODS = [
  { value: "", label: "No suggestion" },
  { value: "consent", label: "Consent" },
  { value: "majority_vote", label: "Majority Vote" },
  { value: "advice_process", label: "Advice Process" },
  { value: "delegation", label: "Delegation" },
  { value: "consensus", label: "Consensus" },
  { value: "lazy_consensus", label: "Lazy Consensus" },
] as const;

interface ProposalData {
  id: string;
  title: string;
  description: string | null;
  rationale: string | null;
  suggestedMethod: string | null;
  isPublic: boolean;
}


export function ProposalForm({ proposal }: { proposal?: ProposalData }) {
  const isEditing = !!proposal;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = isEditing
      ? await updateProposal(proposal!.id, formData)
      : await createProposal(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <>
      <FormError message={error} />

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-bark mb-1.5">
            Title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            aria-required="true"
            defaultValue={proposal?.title || ""}
            placeholder="What are you proposing?"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-bark mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={proposal?.description || ""}
            placeholder="Describe the proposal in detail…"
            className={textareaClass}
          />
        </div>

        <div>
          <label htmlFor="rationale" className="block text-sm font-medium text-bark mb-1.5">
            Rationale <span className="font-normal text-bark-muted">(optional)</span>
          </label>
          <textarea
            id="rationale"
            name="rationale"
            rows={3}
            defaultValue={proposal?.rationale || ""}
            placeholder="Why should the organisation adopt this?"
            className={textareaClass}
          />
        </div>

        <div>
          <label htmlFor="suggestedMethod" className="block text-sm font-medium text-bark mb-1.5">
            Suggested decision method <span className="font-normal text-bark-muted">(optional)</span>
          </label>
          <select
            id="suggestedMethod"
            name="suggestedMethod"
            defaultValue={proposal?.suggestedMethod || ""}
            className={inputClass}
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Public visibility */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={proposal?.isPublic ?? false}
              className="w-4 h-4 rounded border-border text-canopy focus:ring-canopy"
            />
            <Globe size={14} className="text-bark-muted" />
            <span className="text-sm text-bark">Make this proposal publicly visible</span>
          </label>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEditing ? (
              "Save changes"
            ) : (
              "Submit proposal"
            )}
          </button>
          <Link
            href="/proposals"
            className="text-sm text-bark-muted hover:text-bark transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
