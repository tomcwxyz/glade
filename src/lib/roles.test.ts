import { test } from "node:test";
import assert from "node:assert/strict";
import { hasSpaceRole } from "./roles.ts";

test("admins pass every check", () => {
  for (const min of ["observer", "member", "admin"] as const) {
    assert.equal(hasSpaceRole("admin", min), true, min);
  }
});

test("members can do member and observer things, not admin things", () => {
  assert.equal(hasSpaceRole("member", "observer"), true);
  assert.equal(hasSpaceRole("member", "member"), true);
  assert.equal(hasSpaceRole("member", "admin"), false);
});

test("observers can only read", () => {
  assert.equal(hasSpaceRole("observer", "observer"), true);
  assert.equal(hasSpaceRole("observer", "member"), false);
  assert.equal(hasSpaceRole("observer", "admin"), false);
});

test("missing or unknown roles never pass", () => {
  for (const role of [null, undefined, "", "owner", "ADMIN", "__proto__", "toString"]) {
    assert.equal(hasSpaceRole(role, "observer"), false, String(role));
  }
});
