import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countPresentForQuorum,
  describeQuorumRule,
  evaluateQuorum,
  isQuorumEligibleRole,
  parseQuorumRule,
  quorumRequired,
} from "./quorum.ts";

test("no rule configured", () => {
  assert.equal(parseQuorumRule({}), null);
  assert.equal(parseQuorumRule(null), null);
  assert.equal(parseQuorumRule({ quorum: {} }), null);
  assert.equal(parseQuorumRule({ quorum: { minCount: 0, fraction: 0 } }), null);
  assert.equal(parseQuorumRule({ quorum: { minCount: "3" } }), null);
});

test("rules are parsed and sanitised", () => {
  assert.deepEqual(parseQuorumRule({ quorum: { minCount: 3 } }), { minCount: 3, fraction: null });
  assert.deepEqual(parseQuorumRule({ quorum: { minCount: 3.7, fraction: 1.5 } }), { minCount: 3, fraction: null });
  assert.deepEqual(parseQuorumRule({ quorum: { fraction: 1 / 3 } }), { minCount: null, fraction: 1 / 3 });
});

test("fixed number", () => {
  assert.equal(quorumRequired({ minCount: 3, fraction: null }, 12), 3);
});

test("fraction rounds up, without floating-point surprises", () => {
  const third = { minCount: null, fraction: 1 / 3 };
  assert.equal(quorumRequired(third, 9), 3);
  assert.equal(quorumRequired(third, 10), 4);
  assert.equal(quorumRequired({ minCount: null, fraction: 0.5 }, 7), 4);
});

test("whichever is greater", () => {
  const rule = { minCount: 3, fraction: 1 / 3 };
  assert.equal(quorumRequired(rule, 6), 3);
  assert.equal(quorumRequired(rule, 15), 5);
});

test("quorum is never zero", () => {
  assert.equal(quorumRequired({ minCount: null, fraction: 0.5 }, 0), 1);
});

test("evaluateQuorum reports met / not met", () => {
  const rule = { minCount: 3, fraction: null };
  assert.equal(evaluateQuorum(rule, 8, 3).met, true);
  assert.deepEqual(evaluateQuorum(rule, 8, 2), { rule, eligible: 8, present: 2, required: 3, met: false });
});

test("observers aren't eligible", () => {
  assert.equal(isQuorumEligibleRole("admin"), true);
  assert.equal(isQuorumEligibleRole("member"), true);
  assert.equal(isQuorumEligibleRole("observer"), false);
  assert.equal(isQuorumEligibleRole(undefined), false);
});

test("present count: eligible members only, leaving the room doesn't count, abstaining does", () => {
  const eligible = new Set(["u1", "u2", "u3", "u4"]);
  const participants = [
    { userId: "u1", participation: "participated" },
    { userId: "u2", participation: "abstained" },
    { userId: "u3", participation: "left_room" },
    { userId: "u1", participation: "participated" }, // duplicate
    { userId: "obs", participation: "participated" }, // observer / non-member
    { userId: null, participation: "participated" }, // guest
  ];
  assert.equal(countPresentForQuorum(participants, eligible), 2);
});

test("rule descriptions", () => {
  assert.equal(describeQuorumRule({ minCount: 3, fraction: 1 / 3 }), "3 or one third of members, whichever is greater");
  assert.equal(describeQuorumRule({ minCount: null, fraction: 0.5 }), "half of members");
  assert.equal(describeQuorumRule({ minCount: null, fraction: 0.6 }), "60% of members");
  assert.equal(describeQuorumRule({ minCount: 1, fraction: null }), "1 member");
});
