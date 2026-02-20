import { getSpaceSubscription, getDecisionCount, getMemberCount } from "@/lib/queries";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

export async function getSpacePlan(spaceId: string): Promise<PlanTier> {
  const sub = await getSpaceSubscription(spaceId);
  if (!sub) return "free";
  if (sub.status === "active" || sub.status === "trialing") return sub.planTier as PlanTier;
  return "free";
}

export async function canAddMember(spaceId: string): Promise<boolean> {
  const plan = await getSpacePlan(spaceId);
  const limits = PLAN_LIMITS[plan];
  if (limits.maxMembers === Infinity) return true;
  const current = await getMemberCount(spaceId);
  return current < limits.maxMembers;
}

export async function canAddDecision(spaceId: string): Promise<boolean> {
  const plan = await getSpacePlan(spaceId);
  const limits = PLAN_LIMITS[plan];
  if (limits.maxDecisions === Infinity) return true;
  const current = await getDecisionCount(spaceId);
  return current < limits.maxDecisions;
}

export async function canUseAi(spaceId: string): Promise<boolean> {
  const plan = await getSpacePlan(spaceId);
  return PLAN_LIMITS[plan].canUseAi;
}

export async function canUseLiveMeetings(spaceId: string): Promise<boolean> {
  const plan = await getSpacePlan(spaceId);
  return PLAN_LIMITS[plan].canUseLiveMeetings;
}
