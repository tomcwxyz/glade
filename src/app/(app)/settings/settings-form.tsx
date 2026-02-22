"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, TriangleAlert, Sparkles, CreditCard, ArrowUpRight, Globe, RotateCcw, Calendar } from "lucide-react";
import { resetWalkthrough } from "@/components/walkthrough";
import { updateSpace, deleteSpace, updateSpaceSettings, clearSpaceData } from "@/lib/space-actions";
import { createCheckoutSession, createCustomerPortalSession } from "@/lib/billing-actions";
import { inputClass } from "@/lib/utils";
import type { PlanTier } from "@/lib/plans";

export function SpaceSettingsForm({
  name,
  description,
  slug,
  isAdmin,
  aiAvailable,
  aiEnabled,
  publicDecisionLog,
  publicDocuments,
  votePassThreshold,
  planTier,
  planName,
  hasStripeSubscription,
  cancelAtPeriodEnd,
  currentPeriodEnd,
  memberCount,
  memberLimit,
  decisionCount,
  decisionLimit,
}: {
  name: string;
  description: string;
  slug: string;
  isAdmin: boolean;
  aiAvailable: boolean;
  aiEnabled: boolean;
  publicDecisionLog: boolean;
  publicDocuments: boolean;
  votePassThreshold: number;
  planTier: PlanTier;
  planName: string;
  hasStripeSubscription: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  memberCount: number;
  memberLimit: number;
  decisionCount: number;
  decisionLimit: number;
}) {
  const searchParams = useSearchParams();
  const billingStatus = searchParams.get("billing");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateSpace(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSpace();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleClearData() {
    startTransition(async () => {
      const result = await clearSpaceData();
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleToggleAi(enabled: boolean) {
    startTransition(async () => {
      const result = await updateSpaceSettings({ aiEnabled: enabled });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  function handleUpgrade() {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID;
    if (!priceId) {
      setError("Stripe is not configured. Set NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID.");
      return;
    }
    startTransition(async () => {
      const result = await createCheckoutSession(priceId);
      if (result?.error) setError(result.error);
    });
  }

  function handleManageBilling() {
    startTransition(async () => {
      const result = await createCustomerPortalSession();
      if (result?.error) setError(result.error);
    });
  }

  const isFree = planTier === "free";

  return (
    <div className="space-y-12">
      {error && (
        <div className="px-4 py-3 rounded-lg bg-earth/8 border border-earth/20 text-sm text-earth">
          {error}
        </div>
      )}

      {billingStatus === "success" && (
        <div className="px-4 py-3 rounded-lg bg-canopy/8 border border-canopy/20 text-sm text-canopy">
          Your plan has been upgraded. Welcome to Canopy!
        </div>
      )}

      {billingStatus === "cancelled" && (
        <div className="px-4 py-3 rounded-lg bg-amber/8 border border-amber/20 text-sm text-amber">
          Checkout was cancelled. No changes were made.
        </div>
      )}

      {/* General settings */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-bark mb-1.5">
            Space name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={name}
            disabled={!isAdmin}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-bark mb-1.5">
            Description
            <span className="font-normal text-bark-muted ml-1">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={description}
            disabled={!isAdmin}
            placeholder="What is this space for?"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-bark mb-1.5">
            Slug
          </label>
          <div className="px-4 py-2.5 text-sm bg-paper-deep border border-border rounded-lg text-bark-muted">
            {slug}
          </div>
        </div>

        {isAdmin && (
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : "Save changes"}
          </button>
        )}

        {!isAdmin && (
          <p className="text-sm text-bark-muted">
            Only space admins can modify settings.
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            resetWalkthrough();
            window.location.href = "/dashboard";
          }}
          className="flex items-center gap-1.5 text-xs text-bark-muted hover:text-bark transition-colors mt-2"
        >
          <RotateCcw size={12} />
          Restart walkthrough
        </button>
      </form>

      {/* Plan & Billing */}
      {isAdmin && (
        <section className="border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} className="text-canopy" />
            <h2 className="text-base font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
              Plan & Billing
            </h2>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isFree
                ? "bg-paper-deep text-bark-muted"
                : "bg-canopy/10 text-canopy"
            }`}>
              {planName}
            </span>
            {cancelAtPeriodEnd && currentPeriodEnd && (
              <span className="text-xs text-amber">
                Cancels {new Date(currentPeriodEnd).toLocaleDateString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                })}
              </span>
            )}
          </div>

          {/* Usage stats */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="p-3 rounded-lg bg-paper-warm border border-border">
              <div className="text-xs text-bark-muted mb-1">Members</div>
              <div className="text-sm font-medium text-bark">
                {memberCount} / {memberLimit === Infinity ? "Unlimited" : memberLimit}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-paper-warm border border-border">
              <div className="text-xs text-bark-muted mb-1">Decisions</div>
              <div className="text-sm font-medium text-bark">
                {decisionCount} / {decisionLimit === Infinity ? "Unlimited" : decisionLimit}
              </div>
            </div>
          </div>

          {isFree ? (
            <div>
              <p className="text-sm text-bark-muted mb-3">
                Upgrade to Canopy for AI insights, live meetings, more members, and unlimited decisions.
              </p>
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-canopy text-paper rounded-lg text-sm font-medium hover:bg-canopy-light transition-colors disabled:opacity-60"
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    Upgrade to Canopy
                    <ArrowUpRight size={14} />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div>
              {hasStripeSubscription && (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-4 py-2.5 border border-border text-bark rounded-lg text-sm font-medium hover:bg-paper-deep transition-colors disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      Manage billing
                      <ArrowUpRight size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* AI Features */}
      {aiAvailable && isAdmin && !isFree && (
        <section className="border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-canopy" />
            <h2 className="text-base font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
              AI Features
            </h2>
          </div>
          <p className="text-sm text-bark-muted mb-4">
            Enable AI-powered governance insights, pattern analysis, and document intelligence.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={aiEnabled}
              onClick={() => handleToggleAi(!aiEnabled)}
              disabled={isPending}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${
                aiEnabled ? "bg-canopy" : "bg-paper-deep border border-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-paper shadow transition-transform ${
                  aiEnabled ? "translate-x-[18px]" : ""
                }`}
              />
            </button>
            <span className="text-sm text-bark">
              {aiEnabled ? "AI features enabled" : "AI features disabled"}
            </span>
          </label>
        </section>
      )}

      {/* Meeting Configuration */}
      {isAdmin && (
        <section className="border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} className="text-canopy" />
            <h2 className="text-base font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
              Meeting Configuration
            </h2>
          </div>
          <p className="text-sm text-bark-muted mb-4">
            Configure thresholds for decision methods used in live meetings.
          </p>
          <div>
            <label htmlFor="voteThreshold" className="block text-sm font-medium text-bark mb-1.5">
              Vote pass threshold
            </label>
            <select
              id="voteThreshold"
              defaultValue={String(votePassThreshold)}
              onChange={(e) => {
                startTransition(async () => {
                  const result = await updateSpaceSettings({ votePassThreshold: parseFloat(e.target.value) });
                  if (result?.error) setError(result.error);
                });
              }}
              disabled={isPending}
              className={inputClass}
            >
              <option value="0.5">Simple majority (&gt;50%)</option>
              <option value="0.6">Three-fifths (&gt;60%)</option>
              <option value="0.667">Two-thirds (&gt;66.7%)</option>
              <option value="0.75">Three-quarters (&gt;75%)</option>
            </select>
            <p className="text-xs text-bark-muted mt-1.5">
              Percentage of &quot;for&quot; votes (excluding abstentions) needed to carry a motion.
            </p>
          </div>
        </section>
      )}

      {/* Public Visibility */}
      {isAdmin && (
        <section className="border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={16} className="text-canopy" />
            <h2 className="text-base font-medium text-bark" style={{ fontFamily: "var(--font-display)" }}>
              Public Visibility
            </h2>
          </div>
          <p className="text-sm text-bark-muted mb-5">
            Make parts of your governance record publicly accessible at{" "}
            <span className="font-medium text-bark">/public/{slug}</span>.
            You can also embed the decision log on your website.
          </p>

          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={publicDecisionLog}
                onClick={() => {
                  startTransition(async () => {
                    const result = await updateSpaceSettings({ publicDecisionLog: !publicDecisionLog });
                    if (result?.error) setError(result.error);
                  });
                }}
                disabled={isPending}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${
                  publicDecisionLog ? "bg-canopy" : "bg-paper-deep border border-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-paper shadow transition-transform ${
                    publicDecisionLog ? "translate-x-[18px]" : ""
                  }`}
                />
              </button>
              <div>
                <span className="text-sm text-bark block">Public decision log</span>
                <span className="text-xs text-bark-muted">Anyone can view your decisions without signing in</span>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={publicDocuments}
                onClick={() => {
                  startTransition(async () => {
                    const result = await updateSpaceSettings({ publicDocuments: !publicDocuments });
                    if (result?.error) setError(result.error);
                  });
                }}
                disabled={isPending}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${
                  publicDocuments ? "bg-canopy" : "bg-paper-deep border border-border"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-paper shadow transition-transform ${
                    publicDocuments ? "translate-x-[18px]" : ""
                  }`}
                />
              </button>
              <div>
                <span className="text-sm text-bark block">Public governance documents</span>
                <span className="text-xs text-bark-muted">Published documents visible to the public</span>
              </div>
            </label>
          </div>

          {publicDecisionLog && (
            <div className="mt-5 pt-5 border-t border-border">
              <h3 className="text-sm font-medium text-bark mb-2">Embed code</h3>
              <p className="text-xs text-bark-muted mb-2">
                Add this to your website to embed your decision log:
              </p>
              <code className="block text-xs bg-paper-deep border border-border rounded-lg p-3 text-bark-muted break-all select-all">
                {`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/${slug}/decisions" width="100%" height="500" frameborder="0"></iframe>`}
              </code>
            </div>
          )}
        </section>
      )}

      {/* Danger zone */}
      {isAdmin && (
        <section className="border border-earth/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TriangleAlert size={16} className="text-earth" />
            <h2 className="text-base font-medium text-earth" style={{ fontFamily: "var(--font-display)" }}>
              Danger zone
            </h2>
          </div>
          <div className="mb-6 pb-6 border-b border-earth/10">
            <h3 className="text-sm font-medium text-bark mb-1">Clear all data</h3>
            <p className="text-sm text-bark-muted mb-3">
              Remove all decisions, meetings, actions, documents, proposals, topics, and insights. Members and space settings are preserved.
            </p>

            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-earth border border-earth/30 rounded-lg hover:bg-earth/5 transition-colors"
              >
                Clear all data
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-bark">
                  Type <strong>CLEAR</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={clearConfirmText}
                  onChange={(e) => setClearConfirmText(e.target.value)}
                  placeholder="CLEAR"
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClearData}
                    disabled={clearConfirmText !== "CLEAR" || isPending}
                    className="px-4 py-2 text-sm font-medium text-paper bg-earth rounded-lg hover:bg-earth/90 transition-colors disabled:opacity-50"
                  >
                    {isPending ? "Clearing..." : "Clear all data"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClearConfirm(false);
                      setClearConfirmText("");
                    }}
                    className="px-4 py-2 text-sm text-bark-muted hover:text-bark transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <h3 className="text-sm font-medium text-bark mb-1">Delete space</h3>
          <p className="text-sm text-bark-muted mb-4">
            Deleting this space will permanently remove all decisions, meetings, actions, and members. This cannot be undone.
          </p>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm font-medium text-earth border border-earth/30 rounded-lg hover:bg-earth/5 transition-colors"
            >
              Delete this space
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-bark">
                Type <strong>{name}</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={name}
                className={inputClass}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== name || isPending}
                  className="px-4 py-2 text-sm font-medium text-paper bg-earth rounded-lg hover:bg-earth/90 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Deleting..." : "Permanently delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="px-4 py-2 text-sm text-bark-muted hover:text-bark transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
