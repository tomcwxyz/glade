import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrivateAddress, validateWebhookUrl, resolvePublicAddresses } from "./net-guard.ts";

test("IPv4 private, loopback, link-local and metadata ranges are blocked", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
});

test("public IPv4 is allowed", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "93.184.216.34"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test("IPv6 loopback, unique-local, link-local and mapped addresses are blocked", () => {
  for (const ip of ["::1", "[::1]", "::", "fc00::1", "fd12:3456::1", "fe80::1", "fe80::1%eth0", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.0.0.1", "::ffff:169.254.169.254", "64:ff9b::a00:1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
});

test("public IPv6 is allowed", () => {
  for (const ip of ["2606:4700:4700::1111", "2001:4860:4860::8888", "::ffff:8.8.8.8"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test("garbage is treated as private", () => {
  assert.equal(isPrivateAddress("not-an-ip"), true);
});

test("validateWebhookUrl rejects bracketed IPv6 hosts (the original bug)", () => {
  for (const url of ["https://[::1]/hook", "https://[fd00::1]/hook", "https://[fe80::1]/hook", "https://[::ffff:127.0.0.1]/hook"]) {
    assert.equal(validateWebhookUrl(url).ok, false, url);
  }
});

test("validateWebhookUrl rejects http, internal names and private IPv4", () => {
  for (const url of ["http://example.com/hook", "https://localhost/hook", "https://foo.local/x", "https://metadata.google.internal/", "https://intranet/x", "https://127.0.0.1/x", "https://2130706433/x", "https://0x7f.0.0.1/x", "not a url"]) {
    assert.equal(validateWebhookUrl(url).ok, false, url);
  }
});

test("validateWebhookUrl accepts public HTTPS URLs", () => {
  assert.deepEqual(validateWebhookUrl("https://hooks.example.com/glade"), { ok: true, url: "https://hooks.example.com/glade" });
  assert.equal(validateWebhookUrl("https://[2606:4700:4700::1111]/x").ok, true);
});

test("resolvePublicAddresses refuses if any resolved address is private (DNS rebinding)", async () => {
  const lookup = async () => [
    { address: "93.184.216.34", family: 4 },
    { address: "127.0.0.1", family: 4 },
  ];
  await assert.rejects(resolvePublicAddresses("evil.example.com", lookup), /private address/);
});

test("resolvePublicAddresses returns public addresses for pinning", async () => {
  const lookup = async () => [{ address: "93.184.216.34", family: 4 }];
  assert.deepEqual(await resolvePublicAddresses("example.com", lookup), [{ address: "93.184.216.34", family: 4 }]);
});
