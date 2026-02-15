"use client";

import { useState } from "react";
import { createSpace } from "@/lib/space";
import { Loader2, TreePine } from "lucide-react";

export default function NewSpacePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createSpace(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // Success redirects via the server action
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-canopy-pale mx-auto mb-5">
          <TreePine size={28} className="text-canopy" />
        </div>
        <h1
          className="text-2xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Create your space
        </h1>
        <p className="text-sm text-bark-muted leading-relaxed max-w-xs mx-auto">
          A space is where your organisation&apos;s governance lives.
          Decisions, meetings, and documents all belong to a space.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-bark mb-1.5"
          >
            Organisation name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="e.g. Riverside Community Trust"
            required
            className="w-full px-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-bark mb-1.5"
          >
            Description{" "}
            <span className="font-normal text-bark-muted">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="What does your organisation do?"
            rows={3}
            className="w-full px-4 py-2.5 text-sm bg-paper-warm border border-border rounded-lg placeholder:text-bark-muted/50 focus:outline-none focus:border-canopy focus:ring-1 focus:ring-canopy/20 transition-colors resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            "Create space"
          )}
        </button>
      </form>
    </div>
  );
}
