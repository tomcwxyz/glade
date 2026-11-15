import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DECISION_STAGES,
  canTransitionManually,
  initialStatus,
  nextManualStatus,
  statusAfterReview,
} from "./decision-lifecycle.ts";

const withLearnings = { hasLearnings: true };
const noLearnings = { hasLearnings: false };

test("new decisions can only start as decided or implemented", () => {
  assert.equal(initialStatus("decided"), "decided");
  assert.equal(initialStatus("implemented"), "implemented");
  assert.equal(initialStatus("reviewed"), "decided");
  assert.equal(initialStatus("learned"), "decided");
  assert.equal(initialStatus(null), "decided");
  assert.equal(initialStatus("nonsense"), "decided");
});

test("members can mark a decided decision implemented", () => {
  assert.equal(canTransitionManually("decided", "implemented", noLearnings), true);
});

test("reviewed is only reachable through the review flow", () => {
  for (const from of DECISION_STAGES) {
    assert.equal(canTransitionManually(from, "reviewed", withLearnings), false, from);
  }
});

test("learned requires reviewed plus captured learnings", () => {
  assert.equal(canTransitionManually("reviewed", "learned", withLearnings), true);
  assert.equal(canTransitionManually("reviewed", "learned", noLearnings), false);
  assert.equal(canTransitionManually("implemented", "learned", withLearnings), false);
  assert.equal(canTransitionManually("decided", "learned", withLearnings), false);
});

test("no status ever moves backwards or stays put by hand", () => {
  for (const [i, from] of DECISION_STAGES.entries()) {
    for (const to of DECISION_STAGES.slice(0, i + 1)) {
      assert.equal(canTransitionManually(from, to, withLearnings), false, `${from} → ${to}`);
    }
  }
});

test("nothing follows learned", () => {
  assert.equal(nextManualStatus("learned", withLearnings), null);
});

test("recording a review never moves a decision backwards", () => {
  assert.equal(statusAfterReview("decided"), "reviewed");
  assert.equal(statusAfterReview("implemented"), "reviewed");
  assert.equal(statusAfterReview("reviewed"), "reviewed");
  assert.equal(statusAfterReview("learned"), "learned");
});
