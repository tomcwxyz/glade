"use client";

import { useState, useTransition } from "react";
import { Webhook, Plus, Trash2, Copy, Check, Loader2 } from "lucide-react";
import { createWebhook, deleteWebhook, toggleWebhook } from "@/lib/webhook-actions";
import { inputClass } from "@/lib/utils";

type WebhookData = {
  id: string;
  url: string;
  events: unknown;
  active: boolean;
  lastDeliveryAt: Date | null;
  lastDeliveryStatus: number | null;
  createdAt: Date;
};

const EVENT_OPTIONS = [
  { value: "decision.created", label: "Decision created" },
  { value: "decision.updated", label: "Decision updated" },
  { value: "decision.status_changed", label: "Decision status changed" },
];

export function Webhooks({ hooks }: { hooks: WebhookData[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const selectedEvents = EVENT_OPTIONS
      .filter((_, i) => formData.get(`event_${i}`) === "on")
      .map((o) => o.value);
    formData.set("events", selectedEvents.join(","));
    startTransition(async () => {
      const result = await createWebhook(formData);
      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("secret" in result && result.secret) {
        setNewSecret(result.secret);
        setShowCreateForm(false);
      }
    });
  }

  function handleDelete(hookId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteWebhook(hookId);
      if ("error" in result && result.error) {
        setError(result.error);
      }
      setDeletingId(null);
    });
  }

  function handleToggle(hookId: string, active: boolean) {
    startTransition(async () => {
      await toggleWebhook(hookId, active);
    });
  }

  function handleCopy() {
    if (newSecret) {
      navigator.clipboard.writeText(newSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function formatDate(date: Date | null): string {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function statusBadge(status: number | null) {
    if (status === null) return null;
    if (status === 0) return <span className="text-[0.6875rem] text-earth font-medium">Failed</span>;
    if (status >= 200 && status < 300) return <span className="text-[0.6875rem] text-canopy font-medium">{status}</span>;
    return <span className="text-[0.6875rem] text-amber font-medium">{status}</span>;
  }

  return (
    <section className="border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Webhook size={16} className="text-canopy" />
          <h2
            className="text-base font-medium text-bark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Webhooks
          </h2>
        </div>
        {!showCreateForm && !newSecret && (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true);
              setError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-canopy border border-canopy/30 rounded-lg hover:bg-canopy/5 transition-colors"
          >
            <Plus size={14} />
            Add webhook
          </button>
        )}
      </div>
      <p className="text-sm text-bark-muted mb-5">
        Receive HTTP POST notifications when decisions are created or updated.
        Payloads are signed with HMAC-SHA256.
      </p>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth mb-4">
          {error}
        </div>
      )}

      {/* New secret — show once */}
      {newSecret && (
        <div className="mb-5 p-4 rounded-lg bg-canopy/5 border border-canopy/20">
          <p className="text-sm font-medium text-bark mb-2">
            Webhook signing secret
          </p>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 text-xs bg-paper-warm border border-border rounded-lg px-3 py-2.5 text-bark break-all select-all font-mono">
              {newSecret}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border border-border rounded-lg hover:bg-paper-deep transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-canopy" />
                  <span className="text-canopy">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-bark-muted" />
                  <span className="text-bark">Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-amber">
            Save this secret now. Use it to verify the X-Glade-Signature header on incoming payloads.
          </p>
          <button
            type="button"
            onClick={() => setNewSecret(null)}
            className="mt-3 text-xs text-bark-muted hover:text-bark transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="mb-5 p-4 rounded-lg bg-paper-deep border border-border">
          <div className="space-y-4">
            <div>
              <label htmlFor="webhook-url" className="block text-sm font-medium text-bark mb-1.5">
                Payload URL
              </label>
              <input
                id="webhook-url"
                name="url"
                type="url"
                required
                placeholder="https://example.com/webhook"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-bark mb-2">
                Events
              </label>
              <div className="space-y-2">
                {EVENT_OPTIONS.map((opt, i) => (
                  <label key={opt.value} className="flex items-center gap-2 text-sm text-bark">
                    <input
                      type="checkbox"
                      name={`event_${i}`}
                      defaultChecked
                      className="rounded border-border text-canopy focus:ring-canopy"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Create webhook"
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setError(null);
                }}
                className="px-4 py-2.5 text-sm text-bark-muted hover:text-bark transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Existing hooks list */}
      {hooks.length === 0 && !showCreateForm && !newSecret ? (
        <div className="text-sm text-bark-muted py-4 text-center">
          No webhooks configured. Add one to receive event notifications.
        </div>
      ) : (
        <div className="space-y-3">
          {hooks.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between p-3 rounded-lg bg-paper-warm border border-border"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-bark truncate">
                    {h.url}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggle(h.id, !h.active)}
                    disabled={isPending}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium transition-colors ${
                      h.active
                        ? "bg-canopy/10 text-canopy"
                        : "bg-paper-deep text-bark-muted"
                    }`}
                  >
                    {h.active ? "Active" : "Paused"}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs text-bark-muted">
                  <span>{(h.events as string[]).length} events</span>
                  <span>Created {formatDate(h.createdAt)}</span>
                  <span>Last delivery {formatDate(h.lastDeliveryAt)}</span>
                  {statusBadge(h.lastDeliveryStatus)}
                </div>
              </div>
              <div className="ml-3 shrink-0">
                {deletingId === h.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(h.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs font-medium text-paper bg-earth rounded-lg hover:bg-earth/90 transition-colors disabled:opacity-50"
                    >
                      {isPending ? "Deleting..." : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="px-3 py-1.5 text-xs text-bark-muted hover:text-bark transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(h.id)}
                    className="p-1.5 text-bark-muted hover:text-earth transition-colors rounded-lg hover:bg-earth/5"
                    title="Delete webhook"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
