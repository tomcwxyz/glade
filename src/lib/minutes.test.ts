import { test } from "node:test";
import assert from "node:assert/strict";
import { appendMinutesHistory, isMinutesLocked, minutesAwaitingApproval, minutesHistory } from "./minutes.ts";

const d = (s: string) => new Date(`${s}T18:00:00Z`);
const now = d("2026-11-15");

const meetings = [
  { id: "jan", date: d("2026-01-10"), status: "completed", minutesApprovedAt: d("2026-03-14") },
  { id: "mar", date: d("2026-03-14"), status: "completed", minutesApprovedAt: null },
  { id: "jun", date: d("2026-06-13"), status: "scheduled", minutesApprovedAt: null }, // past but never run live
  { id: "sep", date: d("2026-09-12"), status: "completed", minutesApprovedAt: null },
  { id: "dec", date: d("2026-12-12"), status: "scheduled", minutesApprovedAt: null }, // this meeting
  { id: "mar27", date: d("2027-03-13"), status: "draft", minutesApprovedAt: null }, // future
];

test("earlier, unapproved, already-held meetings are offered, most recent first", () => {
  const out = minutesAwaitingApproval(meetings, { id: "dec", date: d("2026-12-12") }, now);
  assert.deepEqual(out.map((m) => m.id), ["sep", "jun", "mar"]);
});

test("a meeting's own minutes and later meetings are never offered", () => {
  const out = minutesAwaitingApproval(meetings, { id: "sep", date: d("2026-09-12") }, now);
  assert.deepEqual(out.map((m) => m.id), ["jun", "mar"]);
});

test("meetings that haven't happened yet don't qualify", () => {
  const out = minutesAwaitingApproval(meetings, { id: "x", date: d("2027-06-01") }, now);
  assert.equal(out.some((m) => m.id === "mar27"), false);
});

test("approved minutes are locked", () => {
  assert.equal(isMinutesLocked({ minutesApprovedAt: d("2026-03-14") }), true);
  assert.equal(isMinutesLocked({ minutesApprovedAt: null }), false);
});

test("history appends and ignores junk", () => {
  const first = appendMinutesHistory({ other: 1 }, { event: "approved", at: "2026-03-14T19:00:00Z", by: "u1", byName: "Asha", inMeetingId: "mar" });
  const second = appendMinutesHistory(first, { event: "reopened", at: "2026-03-20T10:00:00Z", by: "u2", byName: "Ben", reason: "Typo in item 3" });
  assert.equal(second.other, 1);
  assert.deepEqual(minutesHistory(second).map((e) => e.event), ["approved", "reopened"]);
  assert.deepEqual(minutesHistory({ minutesHistory: [{ event: "deleted" }, null, "x"] }), []);
  assert.deepEqual(minutesHistory(null), []);
});
