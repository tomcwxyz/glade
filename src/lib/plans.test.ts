import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN_LIMITS, effectivePlan, isUnderLimit } from "./plans.ts";

test("free tier limits are as published", () => {
  assert.equal(PLAN_LIMITS.free.maxMembers, 5);
  assert.equal(PLAN_LIMITS.free.maxDecisions, 50);
  assert.equal(PLAN_LIMITS.free.canUseLiveMeetings, false);
  assert.equal(PLAN_LIMITS.free.canUseAi, false);
});

test("paid tiers are at least as generous as free on every limit", () => {
  for (const tier of ["pro", "enterprise"] as const) {
    const p = PLAN_LIMITS[tier];
    assert.ok(p.maxMembers >= PLAN_LIMITS.free.maxMembers, tier);
    assert.ok(p.maxDecisions >= PLAN_LIMITS.free.maxDecisions, tier);
    assert.equal(p.canUseLiveMeetings, true, tier);
    assert.equal(p.canUseAi, true, tier);
  }
});

test("isUnderLimit allows up to, but not past, the limit", () => {
  assert.equal(isUnderLimit(49, 50), true);
  assert.equal(isUnderLimit(50, 50), false);
  assert.equal(isUnderLimit(51, 50), false);
  assert.equal(isUnderLimit(0, 0), false);
});

test("Infinity means unlimited", () => {
  assert.equal(isUnderLimit(1_000_000, Infinity), true);
});

test("effectivePlan: paid tier only while active or trialing", () => {
  assert.equal(effectivePlan(null), "free");
  assert.equal(effectivePlan({ status: "active", planTier: "pro" }), "pro");
  assert.equal(effectivePlan({ status: "trialing", planTier: "pro" }), "pro");
  assert.equal(effectivePlan({ status: "active", planTier: "enterprise" }), "enterprise");
  for (const status of ["past_due", "canceled", "unpaid", "incomplete", "incomplete_expired"]) {
    assert.equal(effectivePlan({ status, planTier: "pro" }), "free", status);
  }
});

test("effectivePlan: unknown tier falls back to free", () => {
  assert.equal(effectivePlan({ status: "active", planTier: "platinum" }), "free");
});
