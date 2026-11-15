import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseParticipantsField,
  participantsFromLiveSession,
  participantSummaries,
  resolveParticipants,
  type MemberRef,
} from "./participants.ts";

const members: MemberRef[] = [
  { id: "u1", name: "Asha Patel" },
  { id: "u2", name: "Ben Ode" },
  { id: "u3", name: "Sam Lee" },
  { id: "u4", name: "Sam Lee" }, // two members share a name
  { id: "u5", name: null, email: "chris@example.org" },
];

test("parses the JSON field", () => {
  const parsed = parseParticipantsField(JSON.stringify([{ userId: "u1", name: "x", participation: "abstained", interest: "Trustee of grantee" }]));
  assert.deepEqual(parsed, [{ userId: "u1", name: "x", participation: "abstained", interest: "Trustee of grantee" }]);
});

test("parses the legacy comma list", () => {
  assert.deepEqual(parseParticipantsField("Asha Patel, Ben Ode"), [{ name: "Asha Patel" }, { name: " Ben Ode" }]);
});

test("malformed or empty input gives no participants", () => {
  assert.deepEqual(parseParticipantsField("[not json"), []);
  assert.deepEqual(parseParticipantsField(""), []);
  assert.deepEqual(parseParticipantsField(null), []);
  assert.deepEqual(parseParticipantsField('{"a":1}'), [{ name: '{"a":1}' }]);
});

test("unknown participation values fall back to participated", () => {
  const [p] = resolveParticipants(parseParticipantsField(JSON.stringify([{ name: "Guest", participation: "napping" }])), members);
  assert.equal(p.participation, "participated");
});

test("members are linked by id and take their name from the member record", () => {
  assert.deepEqual(resolveParticipants([{ userId: "u1", name: "whatever" }], members), [
    { userId: "u1", name: "Asha Patel", participation: "participated", interest: null },
  ]);
});

test("typed names matching exactly one member are linked", () => {
  const [p] = resolveParticipants([{ name: "  ben ode " }], members);
  assert.equal(p.userId, "u2");
  assert.equal(p.name, "Ben Ode");
});

test("ambiguous names stay as guests", () => {
  const [p] = resolveParticipants([{ name: "Sam Lee" }], members);
  assert.equal(p.userId, null);
});

test("members without a name are matched and shown by email", () => {
  const [p] = resolveParticipants([{ userId: "u5", name: "" }], members);
  assert.equal(p.name, "chris@example.org");
});

test("a user id from outside the space becomes a guest, never a link", () => {
  const [p] = resolveParticipants([{ userId: "intruder", name: "Mallory" }], members);
  assert.deepEqual(p, { userId: null, name: "Mallory", participation: "participated", interest: null });
});

test("duplicates are merged and blanks dropped", () => {
  const out = resolveParticipants(
    [{ userId: "u1", name: "" }, { name: "Asha Patel" }, { name: "Guest One" }, { name: "guest one" }, { name: "  " }],
    members
  );
  assert.deepEqual(out.map((p) => p.name), ["Asha Patel", "Guest One"]);
});

test("summaries note abstentions, interests and guests", () => {
  const out = resolveParticipants(
    [
      { userId: "u1", name: "" },
      { userId: "u2", name: "", participation: "left_room", interest: "Trustee of applicant" },
      { name: "Advisor", participation: "abstained" },
    ],
    members
  );
  assert.deepEqual(participantSummaries(out), [
    "Asha Patel",
    "Ben Ode (left the room; interest: Trustee of applicant)",
    "Advisor (abstained; guest)",
  ]);
});

test("live session participants: present non-observers plus responders, abstentions marked", () => {
  const session = {
    u1: { name: "Asha Patel", role: "facilitator" },
    u2: { name: "Ben Ode", role: "participant" },
    u9: { name: "Watcher", role: "observer" },
  };
  const responses = [
    { participantId: "u2", name: "Ben Ode", value: "abstain", respondedAt: "2026-11-15T10:00:00Z" },
    { participantId: "u1", name: "Asha Patel", value: "abstain", respondedAt: "2026-11-15T10:00:00Z" },
    { participantId: "u1", name: "Asha Patel", value: "for", respondedAt: "2026-11-15T10:01:00Z" },
    { participantId: "u5", name: "Late Joiner", value: "for", respondedAt: "2026-11-15T10:02:00Z" },
  ];
  assert.deepEqual(participantsFromLiveSession(session, responses), [
    { userId: "u1", name: "Asha Patel", participation: "participated" },
    { userId: "u2", name: "Ben Ode", participation: "abstained" },
    { userId: "u5", name: "Late Joiner", participation: "participated" },
  ]);
});
