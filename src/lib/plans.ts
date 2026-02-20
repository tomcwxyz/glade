export type PlanTier = "free" | "pro" | "enterprise";

export interface PlanLimits {
  maxMembers: number;
  maxDecisions: number;
  canUseAi: boolean;
  canUseLiveMeetings: boolean;
  maxSpaces: number;
}

export interface PlanDisplay {
  name: string;
  tagline: string;
  price: string;
  priceYearly: string;
  features: string[];
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxMembers: 5,
    maxDecisions: 50,
    canUseAi: false,
    canUseLiveMeetings: false,
    maxSpaces: 1,
  },
  pro: {
    maxMembers: 25,
    maxDecisions: Infinity,
    canUseAi: true,
    canUseLiveMeetings: true,
    maxSpaces: Infinity,
  },
  enterprise: {
    maxMembers: Infinity,
    maxDecisions: Infinity,
    canUseAi: true,
    canUseLiveMeetings: true,
    maxSpaces: Infinity,
  },
};

export const PLAN_DISPLAY: Record<PlanTier, PlanDisplay> = {
  free: {
    name: "Seedling",
    tagline: "For small teams getting started",
    price: "Free",
    priceYearly: "Free",
    features: [
      "5 members per space",
      "50 decisions per space",
      "Decision log & documents",
      "Proposals & topics",
      "1 space",
    ],
  },
  pro: {
    name: "Canopy",
    tagline: "For growing organisations",
    price: "£15/month",
    priceYearly: "£144/year",
    features: [
      "25 members per space",
      "Unlimited decisions",
      "AI governance insights",
      "Live meeting mode",
      "Unlimited spaces",
      "Priority support",
    ],
  },
  enterprise: {
    name: "Old Growth",
    tagline: "For complex governance needs",
    price: "Custom",
    priceYearly: "Custom",
    features: [
      "Unlimited members",
      "Unlimited decisions",
      "AI governance insights",
      "Live meeting mode",
      "Unlimited spaces",
      "Dedicated support",
      "Custom integrations",
    ],
  },
};
