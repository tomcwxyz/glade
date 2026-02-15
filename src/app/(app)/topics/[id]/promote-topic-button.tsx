"use client";

import { useState } from "react";
import { promoteTopic } from "@/lib/topic-actions";
import { ArrowUpRight, Loader2 } from "lucide-react";

export function PromoteTopicButton({ topicId }: { topicId: string }) {
  const [loading, setLoading] = useState(false);

  async function handlePromote() {
    setLoading(true);
    const result = await promoteTopic(topicId);
    if (result?.error) {
      setLoading(false);
    }
    // Success redirects via server action
  }

  return (
    <button
      onClick={handlePromote}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <>
          <ArrowUpRight size={14} />
          Promote to proposal
        </>
      )}
    </button>
  );
}
