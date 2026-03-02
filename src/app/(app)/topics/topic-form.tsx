"use client";

import { useState } from "react";
import { createTopic } from "@/lib/topic-actions";
import { inputClass, textareaClass } from "@/lib/utils";
import { Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { FormError } from "@/components/form-error";

const TYPES = [
  { value: "question", label: "Question", desc: "Something you want the group to explore" },
  { value: "tension", label: "Tension", desc: "A gap between how things are and how they could be" },
  { value: "agenda_suggestion", label: "Agenda Suggestion", desc: "Something to discuss at a meeting" },
] as const;


export function TopicForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const result = await createTopic(formData);

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
            placeholder="What's on your mind?"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-bark mb-1.5">
            Type
          </label>
          <div className="space-y-2">
            {TYPES.map((t) => (
              <label
                key={t.value}
                className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border hover:border-canopy/30 cursor-pointer transition-colors has-[:checked]:border-canopy has-[:checked]:bg-canopy-pale/30"
              >
                <input
                  type="radio"
                  name="type"
                  value={t.value}
                  defaultChecked={t.value === "question"}
                  className="mt-0.5 accent-canopy"
                />
                <div>
                  <span className="text-sm font-medium text-bark">{t.label}</span>
                  <p className="text-xs text-bark-muted mt-0.5">{t.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-bark mb-1.5">
            Description <span className="font-normal text-bark-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Any additional context…"
            className={textareaClass}
          />
        </div>

        {/* Public visibility */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              name="isPublic"
              className="w-4 h-4 rounded border-border text-canopy focus:ring-canopy"
            />
            <Globe size={14} className="text-bark-muted" />
            <span className="text-sm text-bark">Make this topic publicly visible</span>
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
            ) : (
              "Raise topic"
            )}
          </button>
          <Link
            href="/topics"
            className="text-sm text-bark-muted hover:text-bark transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
