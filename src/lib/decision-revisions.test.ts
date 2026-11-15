import { test } from "node:test";
import assert from "node:assert/strict";
import { diffDecision, formatRevisionValue, type DecisionSnapshot } from "./decision-revisions.ts";

const base: DecisionSnapshot = {
  title: "Adopt reserves policy",
  description: null,
  rationale: "Six months of running costs",
  outcome: "Agreed",
  method: "consent",
  participants: ["Asha", "Ben"],
  date: new Date("2026-03-12T00:00:00Z"),
  conditions: null,
  reviewDate: null,
  isPublic: true,
  tags: ["finance"],
};

test("no changes produces an empty diff", () => {
  assert.deepEqual(diffDecision(base, { ...base }), {});
});

test("whitespace, empty strings and list order are not changes", () => {
  const after = { ...base, description: "  ", rationale: "Six months of running costs  ", participants: ["Ben", "Asha"] };
  assert.deepEqual(diffDecision(base, after), {});
});

test("same calendar date at a different time is not a change", () => {
  assert.deepEqual(diffDecision(base, { ...base, date: new Date("2026-03-12T15:30:00Z") }), {});
});

test("changed fields are recorded with before and after values", () => {
  const after = { ...base, rationale: "Three months", date: new Date("2026-03-19"), tags: ["finance", "policy"], isPublic: false };
  assert.deepEqual(diffDecision(base, after), {
    rationale: { from: "Six months of running costs", to: "Three months" },
    date: { from: "2026-03-12", to: "2026-03-19" },
    tags: { from: ["finance"], to: ["finance", "policy"] },
    isPublic: { from: true, to: false },
  });
});

test("formatRevisionValue renders empties, lists and visibility", () => {
  assert.equal(formatRevisionValue("rationale", null), "—");
  assert.equal(formatRevisionValue("participants", ["Asha", "Ben"]), "Asha, Ben");
  assert.equal(formatRevisionValue("tags", []), "—");
  assert.equal(formatRevisionValue("isPublic", false), "Hidden");
});
