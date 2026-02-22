import type { Metadata } from "next";
import { getCurrentSpace, requireUser } from "@/lib/space";
import { getSpaceMembers, getSpaceSubscription, getDecisionCount, getMemberCount } from "@/lib/queries";

export const metadata: Metadata = { title: "Settings" };
import { isAiAvailable, isAiEnabled } from "@/lib/ai";
import { getSpacePlan } from "@/lib/billing";
import { PLAN_LIMITS, PLAN_DISPLAY } from "@/lib/plans";
import { Settings } from "lucide-react";
import { SpaceSettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return null;

  const [members, subscription, planTier, decisionCount, memberCount] = await Promise.all([
    getSpaceMembers(space.id),
    getSpaceSubscription(space.id),
    getSpacePlan(space.id),
    getDecisionCount(space.id),
    getMemberCount(space.id),
  ]);

  const currentMember = members.find((m) => m.userId === user.id || m.email === user.email);
  const isAdmin = currentMember?.role === "admin";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <header className="mb-10">
        <div className="flex items-center gap-2.5 mb-1.5">
          <Settings size={20} className="text-bark-muted" />
          <h1
            className="text-3xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Space Settings
          </h1>
        </div>
        <p className="text-bark-muted">
          Manage settings for {space.name}
        </p>
      </header>

      <SpaceSettingsForm
        name={space.name}
        description={space.description || ""}
        slug={space.slug}
        isAdmin={isAdmin}
        aiAvailable={isAiAvailable()}
        aiEnabled={isAiEnabled(space.settings)}
        publicDecisionLog={((space.settings as Record<string, unknown>) || {}).publicDecisionLog === true}
        publicDocuments={((space.settings as Record<string, unknown>) || {}).publicDocuments === true}
        planTier={planTier}
        planName={PLAN_DISPLAY[planTier].name}
        hasStripeSubscription={!!subscription?.stripeSubscriptionId}
        cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
        currentPeriodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
        memberCount={memberCount}
        memberLimit={PLAN_LIMITS[planTier].maxMembers}
        decisionCount={decisionCount}
        decisionLimit={PLAN_LIMITS[planTier].maxDecisions}
      />
    </div>
  );
}
