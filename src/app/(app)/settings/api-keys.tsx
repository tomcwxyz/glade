"use client";

import { useState, useTransition } from "react";
import { Key, Copy, Trash2, Plus, Check, Loader2 } from "lucide-react";
import { createApiKey, deleteApiKey } from "@/lib/api-key-actions";
import { inputClass } from "@/lib/utils";
import { FormError } from "@/components/form-error";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export function ApiKeys({ keys }: { keys: ApiKey[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createApiKey(formData);
      if ("error" in result && result.error) {
        setError(result.error);
      } else if ("key" in result && result.key) {
        setNewKey(result.key);
        setShowCreateForm(false);
      }
    });
  }

  function handleDelete(keyId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteApiKey(keyId);
      if ("error" in result && result.error) {
        setError(result.error);
      }
      setDeletingId(null);
    });
  }

  function handleCopy() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
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

  return (
    <section className="border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Key size={16} className="text-canopy" />
          <h2
            className="text-base font-medium text-bark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            API Keys
          </h2>
        </div>
        {!showCreateForm && !newKey && (
          <button
            type="button"
            onClick={() => {
              setShowCreateForm(true);
              setError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-canopy border border-canopy/30 rounded-lg hover:bg-canopy/5 transition-colors"
          >
            <Plus size={14} />
            Create API key
          </button>
        )}
      </div>
      <p className="text-sm text-bark-muted mb-5">
        Use API keys to access your space data programmatically via the REST API
        at <span className="font-medium text-bark">/api/v1/</span>.
      </p>

      <FormError message={error} />

      {/* Newly created key — show once */}
      {newKey && (
        <div className="mb-5 p-4 rounded-lg bg-canopy/5 border border-canopy/20">
          <p className="text-sm font-medium text-bark mb-2">
            Your new API key
          </p>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 text-xs bg-paper-warm border border-border rounded-lg px-3 py-2.5 text-bark break-all select-all font-mono">
              {newKey}
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
            Copy this key now. It won&apos;t be shown again.
          </p>
          <button
            type="button"
            onClick={() => setNewKey(null)}
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
              <label
                htmlFor="api-key-name"
                className="block text-sm font-medium text-bark mb-1.5"
              >
                Key name
              </label>
              <input
                id="api-key-name"
                name="name"
                type="text"
                required
                aria-required="true"
                placeholder="e.g. CI/CD pipeline"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="api-key-permissions"
                className="block text-sm font-medium text-bark mb-1.5"
              >
                Permissions
              </label>
              <select
                id="api-key-permissions"
                name="permissions"
                defaultValue="read"
                className={inputClass}
              >
                <option value="read">Read only</option>
                <option value="read-write">Read &amp; write</option>
              </select>
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
                  "Create key"
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

      {/* Existing keys list */}
      {keys.length === 0 && !showCreateForm && !newKey ? (
        <div className="text-sm text-bark-muted py-4 text-center">
          No API keys yet. Create one to get started.
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between p-3 rounded-lg bg-paper-warm border border-border"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-bark truncate">
                    {k.name}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-medium ${
                      k.permissions === "read-write"
                        ? "bg-amber/10 text-amber"
                        : "bg-paper-deep text-bark-muted"
                    }`}
                  >
                    {k.permissions === "read-write" ? "Read & write" : "Read only"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-bark-muted">
                  <code className="font-mono">{k.keyPrefix}...</code>
                  <span>Created {formatDate(k.createdAt)}</span>
                  <span>Last used {formatDate(k.lastUsedAt)}</span>
                </div>
              </div>
              <div className="ml-3 shrink-0">
                {deletingId === k.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(k.id)}
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
                    onClick={() => setDeletingId(k.id)}
                    className="p-1.5 text-bark-muted hover:text-earth transition-colors rounded-lg hover:bg-earth/5"
                    title="Delete API key"
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
