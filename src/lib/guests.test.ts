import { test } from "node:test";
import assert from "node:assert/strict";
import {
  guestMayRespond,
  guestParticipantId,
  hashGuestToken,
  isGuestParticipantId,
  isWellFormedGuestToken,
  newGuestToken,
} from "./guests.ts";

test("tokens are random, well formed, and only the hash is stored", () => {
  const a = newGuestToken();
  const b = newGuestToken();
  assert.notEqual(a.token, b.token);
  assert.equal(isWellFormedGuestToken(a.token), true);
  assert.equal(a.hash, hashGuestToken(a.token));
  assert.match(a.hash, /^[0-9a-f]{64}$/);
  assert.notEqual(a.hash, a.token);
});

test("malformed tokens are rejected before any lookup", () => {
  for (const t of ["", "short", "x".repeat(33), "../../etc/passwd________________", null, 42]) {
    assert.equal(isWellFormedGuestToken(t), false, String(t));
  }
});

test("guest participant ids can't collide with user ids", () => {
  assert.equal(guestParticipantId("abc"), "guest:abc");
  assert.equal(isGuestParticipantId("guest:abc"), true);
  assert.equal(isGuestParticipantId("3f2b0c1e-0000-4000-8000-000000000000"), false);
});

test("non-voting guests can ask, react and advise, but not object or vote", () => {
  for (const stage of ["clarify", "react", "consult"]) assert.equal(guestMayRespond(stage, false), true, stage);
  for (const stage of ["object", "vote", "decide", "integrate", undefined]) assert.equal(guestMayRespond(stage, false), false, String(stage));
});

test("voting guests can respond at any stage", () => {
  for (const stage of ["clarify", "object", "vote", "decide"]) assert.equal(guestMayRespond(stage, true), true, stage);
});
