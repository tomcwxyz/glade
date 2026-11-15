import { isIP } from "node:net";

/**
 * SSRF guards for outbound requests to user-supplied URLs (webhooks).
 *
 * Kept free of app imports so it can be unit-tested with `node --test`.
 */

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function inV4Range(ip: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_V4: [string, number][] = [
  ["0.0.0.0", 8], // "this network"
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, incl. cloud metadata 169.254.169.254
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

/** Expand an IPv6 address to its 8 hextets. Returns null if malformed. */
function expandIPv6(ip: string): number[] | null {
  let addr = ip;
  // Trailing embedded IPv4 (e.g. ::ffff:127.0.0.1) → two hextets.
  const v4Match = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Match) {
    const n = ipv4ToInt(v4Match[1]);
    addr =
      addr.slice(0, -v4Match[1].length) +
      ((n >>> 16) & 0xffff).toString(16) +
      ":" +
      (n & 0xffff).toString(16);
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0) return null;
  const parts = [...head, ...Array(fill).fill("0"), ...tail];
  if (parts.length !== 8) return null;
  return parts.map((p) => parseInt(p, 16));
}

/**
 * True if the IP literal (v4 or v6, brackets allowed) is loopback, private,
 * link-local, unspecified, multicast or otherwise not a public unicast address.
 * Unparseable input is treated as private (fail closed).
 */
export function isPrivateAddress(raw: string): boolean {
  const ip = raw.replace(/^\[|\]$/g, "").split("%")[0]; // brackets, zone id
  const family = isIP(ip);

  if (family === 4) {
    return BLOCKED_V4.some(([base, bits]) => inV4Range(ip, base, bits));
  }

  if (family === 6) {
    const h = expandIPv6(ip.toLowerCase());
    if (!h) return true;

    // :: (unspecified) and ::1 (loopback)
    if (h.slice(0, 7).every((x) => x === 0) && (h[7] === 0 || h[7] === 1)) return true;

    // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) → check the v4 part.
    const v4 = `${h[6] >> 8}.${h[6] & 0xff}.${h[7] >> 8}.${h[7] & 0xff}`;
    if (h.slice(0, 5).every((x) => x === 0) && (h[5] === 0xffff || h[5] === 0)) {
      return isPrivateAddress(v4);
    }
    // NAT64 well-known prefix 64:ff9b::/96 embeds an IPv4 address.
    if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) {
      return isPrivateAddress(v4);
    }

    if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((h[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site-local (deprecated)
    if ((h[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
    return false;
  }

  return true;
}

/**
 * Validate a webhook URL: HTTPS only, and the host must not be an internal
 * name or a private IP literal. Hostnames are checked again at delivery time,
 * after DNS resolution (see `safeLookup`).
 */
export function validateWebhookUrl(
  raw: string
): { ok: true; url: string } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "Webhook URL must use HTTPS" };
  }

  // URL keeps IPv6 hosts in brackets (`[::1]`); strip them before checking.
  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");

  const isBlocked =
    isIP(host) !== 0
      ? isPrivateAddress(host)
      : host === "localhost" ||
        host.endsWith(".localhost") ||
        host.endsWith(".local") ||
        host.endsWith(".internal") ||
        !host.includes("."); // single-label names resolve on the local network

  if (isBlocked) {
    return { ok: false, reason: "Webhook URL must point to a public host" };
  }

  return { ok: true, url: parsed.toString() };
}

type LookupAddress = { address: string; family: number };
type LookupFn = (
  hostname: string,
  options: { all: true; family?: number }
) => Promise<LookupAddress[]>;

/**
 * Resolve a hostname and refuse if *any* resolved address is private. Returns
 * the addresses so the caller can connect to exactly these (pinning), which
 * closes the DNS-rebinding gap between validation and connection.
 */
export async function resolvePublicAddresses(
  hostname: string,
  lookup: LookupFn
): Promise<LookupAddress[]> {
  const host = hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  if (addresses.length === 0) throw new Error(`No addresses for ${host}`);
  const bad = addresses.find((a) => isPrivateAddress(a.address));
  if (bad) throw new Error(`Refusing to connect to private address ${bad.address}`);
  return addresses;
}
