"use client";

import { useState } from "react";
import { generateShareLink, revokeShareLink } from "@/lib/meeting-actions";
import { Share2, Copy, Check, X, Loader2 } from "lucide-react";

export function ShareAgendaButton({
  meetingId,
  existingToken,
}: {
  meetingId: string;
  existingToken: string | null;
}) {
  const [token, setToken] = useState<string | null>(existingToken);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (token) {
      setShowPanel(true);
      return;
    }
    setLoading(true);
    const result = await generateShareLink(meetingId);
    if ("token" in result) {
      setToken(result.token as string);
      setShowPanel(true);
    }
    setLoading(false);
  }

  async function handleRevoke() {
    setLoading(true);
    await revokeShareLink(meetingId);
    setToken(null);
    setShowPanel(false);
    setLoading(false);
  }

  function handleCopy() {
    if (!token) return;
    const url = `${window.location.origin}/shared/meeting/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted hover:text-bark hover:bg-paper-warm transition-colors"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
        Share
      </button>

      {showPanel && token && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-paper border border-border rounded-xl shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-bark">Share agenda link</h3>
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              className="text-bark-muted hover:text-bark"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-bark-muted mb-3">
            Anyone with this link can view the meeting agenda.
          </p>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/shared/meeting/${token}`}
              className="flex-1 text-xs bg-paper-deep border border-border rounded px-2 py-1.5 text-bark-muted truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-canopy text-paper rounded font-medium hover:bg-canopy-light transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={loading}
            className="text-xs text-earth hover:text-earth/80 transition-colors"
          >
            Revoke link
          </button>
        </div>
      )}
    </div>
  );
}
