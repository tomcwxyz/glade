import type { Metadata } from "next";
import { getCurrentSpace, requireUser } from "@/lib/space";
import { getSpaceMembers, getSpaceSubscription, getDecisionCount, getMemberCount, getApiKeys, getWebhooks, getAuditLog, getSpaceTags } from "@/lib/queries";

export const metadata: Metadata = { title: "Settings" };
import { isAiAvailable, isAiEnabled } from "@/lib/ai";
import { getSpacePlan } from "@/lib/billing";
import { PLAN_LIMITS, PLAN_DISPLAY } from "@/lib/plans";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Settings } from "lucide-react";
import { SpaceSettingsForm } from "./settings-form";
import { ChangePasswordForm } from "./change-password-form";
import { ApiKeys } from "./api-keys";
import { Webhooks } from "./webhooks";
import { AuditLog } from "./audit-log";
import { TagManager } from "./tag-manager";

export default async function SettingsPage() {
  const user = await requireUser();
  const space = await getCurrentSpace();
  if (!space) return null;

  const [members, subscription, planTier, decisionCount, memberCount, apiKeys, spaceWebhooks, auditEntries, spaceTags] = await Promise.all([
    getSpaceMembers(space.id),
    getSpaceSubscription(space.id),
    getSpacePlan(space.id),
    getDecisionCount(space.id),
    getMemberCount(space.id),
    getApiKeys(space.id),
    getWebhooks(space.id),
    getAuditLog(space.id),
    getSpaceTags(space.id),
  ]);

  const [userRecord] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const hasPassword = !!userRecord?.passwordHash;

  const currentMember = members.find((m) => m.userId === user.id || m.email === user.email);
  const isAdmin = currentMember?.role === "admin";
  const canManageTags = currentMember?.role === "admin" || currentMember?.role === "member";

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

      {hasPassword && (
        <section className="mb-12 pb-10 border-b border-border">
          <h2
            className="text-xl font-light tracking-tight mb-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your Account
          </h2>
          <p className="text-sm text-bark-muted mb-6">
            {user.email}
          </p>
          <ChangePasswordForm />
        </section>
      )}

      <SpaceSettingsForm
        name={space.name}
        description={space.description || ""}
        slug={space.slug}
        isAdmin={isAdmin}
        aiAvailable={isAiAvailable()}
        aiEnabled={isAiEnabled(space.settings)}
        publicGlade={((space.settings as Record<string, unknown>) || {}).publicGlade === true}
        publicDecisionLog={((space.settings as Record<string, unknown>) || {}).publicDecisionLog === true}
        publicActions={((space.settings as Record<string, unknown>) || {}).publicActions === true}
        publicMeetings={((space.settings as Record<string, unknown>) || {}).publicMeetings === true}
        publicDocuments={((space.settings as Record<string, unknown>) || {}).publicDocuments === true}
        publicProposals={((space.settings as Record<string, unknown>) || {}).publicProposals === true}
        publicTopics={((space.settings as Record<string, unknown>) || {}).publicTopics === true}
        votePassThreshold={typeof ((space.settings as Record<string, unknown>) || {}).votePassThreshold === "number" ? ((space.settings as Record<string, unknown>).votePassThreshold as number) : 0.5}
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

      {canManageTags && (
        <section className="mt-12 pt-10 border-t border-border">
          <TagManager tags={spaceTags} />
        </section>
      )}

      {isAdmin && (
        <div className="mt-12 space-y-8">
          <ApiKeys keys={apiKeys} />
          <Webhooks hooks={spaceWebhooks} />
          <AuditLog entries={auditEntries} />
        </div>
      )}
    </div>
  );
}
