import { getSpaceSubscription, getDecisionCount, getMemberCount } from "@/lib/queries";
import { PLAN_LIMITS, effectivePlan, isUnderLimit, type PlanTier } from "@/lib/plans";

export async function getSpacePlan(spaceId: string): Promise<PlanTier> {
  return effectivePlan(await getSpaceSubscription(spaceId));
}

export async function canAddMember(spaceId: string): Promise<boolean> {
  const plan = await getSpacePlan(spaceId);
  const limits = PLAN_LIMITS[plan];
  if (limits.maxMembers === Infinity) return true;
  return isUnderLimit(await getMemberCount(spaceId), limits.maxMembers);
}

export async function canAddDecision(spaceId: string): Promise<boolean> {
  const plan = await getSpacePlan(spaceId);
  const limits = PLAN_LIMITS[plan];
  if (limits.maxDecisions === Infinity) return true;
  return isUnderLimit(await getDecisionCount(spaceId), limits.maxDecisions);
}

export async function canUseAi(spaceId: string): Promise<boolean> {
  const plan = await getSpacePlan(spaceId);
  return PLAN_LIMITS[plan].canUseAi;
}

export async function canUseLiveMeetings(spaceId: string): Promise<boolean> {
  const plan = await getSpacePlan(spaceId);
  return PLAN_LIMITS[plan].canUseLiveMeetings;
}
