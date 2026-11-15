import { test } from "node:test";
import assert from "node:assert/strict";
import {
  advanceItem,
  createInitialState,
  goToItem,
  skipItem,
  speakerStatus,
  startDecisionFlow,
  type MeetingSessionState,
} from "./meeting-state.ts";

function started(): MeetingSessionState {
  return createInitialState("u1", "Asha");
}

test("initial state starts on the first agenda item with the facilitator present", () => {
  const s = started();
  assert.equal(s.currentAgendaItemIndex, 0);
  assert.equal(s.phase, "agenda_item");
  assert.equal(s.version, 1);
  assert.equal(s.decisionFlow, null);
  assert.deepEqual(s.speakerStack, []);
  assert.equal(s.participants.u1.role, "facilitator");
  assert.equal(s.participants.u1.name, "Asha");
});

test("advanceItem records the outcome and moves to the next item", () => {
  const s = advanceItem(started(), 3, "Agreed", "d1");
  assert.equal(s.currentAgendaItemIndex, 1);
  assert.equal(s.phase, "agenda_item");
  assert.equal(s.completedItems[0].outcome, "Agreed");
  assert.equal(s.completedItems[0].decisionId, "d1");
  assert.equal(s.completedItems[0].skipped, false);
});

test("advancing past the last item completes the meeting and stays on the last index", () => {
  let s = started();
  s = advanceItem(s, 2);
  s = advanceItem(s, 2);
  assert.equal(s.phase, "completed");
  assert.equal(s.currentAgendaItemIndex, 1);
  assert.deepEqual(Object.keys(s.completedItems).sort(), ["0", "1"]);
});

test("skipItem marks the item skipped and moves on", () => {
  const s = skipItem(started(), 3);
  assert.equal(s.completedItems[0].skipped, true);
  assert.equal(s.currentAgendaItemIndex, 1);
});

test("skipping the last item completes the meeting", () => {
  const s = skipItem(started(), 1);
  assert.equal(s.phase, "completed");
});

test("moving between items clears the decision flow, speaker stack and timer", () => {
  let s = startDecisionFlow(started(), "consent", "Adopt the policy");
  s = { ...s, speakerStack: [{ participantId: "u2", name: "Ben", requestedAt: "x" }], timer: { ...s.timer, startedAt: "t", elapsed: 30 } };
  for (const next of [advanceItem(s, 3), skipItem(s, 3), goToItem(s, 2)]) {
    assert.equal(next.decisionFlow, null);
    assert.deepEqual(next.speakerStack, []);
    assert.equal(next.timer.startedAt, null);
    assert.equal(next.timer.elapsed, 0);
    assert.equal(next.phase, "agenda_item");
  }
});

test("goToItem jumps without marking anything complete", () => {
  const s = goToItem(started(), 2);
  assert.equal(s.currentAgendaItemIndex, 2);
  assert.deepEqual(s.completedItems, {});
});

test("every transition bumps the version by exactly one (optimistic locking)", () => {
  const s = started();
  for (const next of [advanceItem(s, 3), skipItem(s, 3), goToItem(s, 1), startDecisionFlow(s, "consent")]) {
    assert.equal(next.version, s.version + 1);
  }
});

test("transitions do not mutate the previous state", () => {
  const s = started();
  const snapshot = JSON.stringify(s);
  advanceItem(s, 3, "x");
  skipItem(s, 3);
  goToItem(s, 2);
  startDecisionFlow(s, "consent");
  assert.equal(JSON.stringify(s), snapshot);
});

test("decision flows start at the right stage for each method", () => {
  assert.equal(startDecisionFlow(started(), "consent").decisionFlow?.stage, "present");
  assert.equal(startDecisionFlow(started(), "majority_vote").decisionFlow?.stage, "present");
  assert.equal(startDecisionFlow(started(), "temperature_check").decisionFlow?.stage, "vote");
  assert.equal(startDecisionFlow(started(), "something_new").decisionFlow?.stage, "present");
});

test("startDecisionFlow enters the decision phase with no responses", () => {
  const s = startDecisionFlow(started(), "consent", "Proposal text");
  assert.equal(s.phase, "decision_flow");
  assert.equal(s.decisionFlow?.method, "consent");
  assert.equal(s.decisionFlow?.proposalText, "Proposal text");
  assert.deepEqual(s.decisionFlow?.responses, []);
});

test("legacy speaker entries without a status count as waiting", () => {
  assert.equal(speakerStatus({ participantId: "u", name: "A", requestedAt: "t" }), "waiting");
});
