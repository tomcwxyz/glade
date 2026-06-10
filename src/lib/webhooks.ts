import crypto from "crypto";
import { db } from "@/db";
import { webhooks } from "@/db/schema";
import { eq } from "drizzle-orm";

export type WebhookEvent =
  | "decision.created"
  | "decision.updated"
  | "decision.status_changed";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Guard webhook URLs against SSRF: require HTTPS and reject hosts that resolve
 * to loopback, private, link-local or cloud-metadata ranges. This is a
 * hostname-level check — it does not defeat DNS rebinding (resolving + pinning
 * the IP at fetch time would; tracked as future hardening).
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

  const host = parsed.hostname.toLowerCase();
  const isBlocked =
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "169.254.169.254" || // cloud metadata service
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^(fc|fd)[0-9a-f]{2}:/.test(host); // IPv6 unique-local

  if (isBlocked) {
    return { ok: false, reason: "Webhook URL must point to a public host" };
  }

  return { ok: true, url: parsed.toString() };
}

/**
 * Fire webhooks for a space event. Runs asynchronously — does not block the caller.
 */
export function fireWebhooks(
  spaceId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
) {
  // Fire and forget — don't await
  deliverWebhooks(spaceId, event, data).catch((err) => {
    console.error("Webhook delivery error:", err);
  });
}

async function deliverWebhooks(
  spaceId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
) {
  const hooks = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.spaceId, spaceId));

  const activeHooks = hooks.filter(
    (h) => h.active && (h.events as string[]).includes(event)
  );

  if (activeHooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    activeHooks.map(async (hook) => {
      // Re-validate at delivery: a previously-saved hook could now point at a
      // private host (or pre-dates this check). Skip and record a failure.
      if (!validateWebhookUrl(hook.url).ok) {
        await db
          .update(webhooks)
          .set({ lastDeliveryAt: new Date(), lastDeliveryStatus: 0 })
          .where(eq(webhooks.id, hook.id));
        return;
      }

      const signature = signPayload(body, hook.secret);
      try {
        const response = await fetch(hook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Glade-Signature": signature,
            "X-Glade-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        await db
          .update(webhooks)
          .set({
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: response.status,
          })
          .where(eq(webhooks.id, hook.id));
      } catch {
        await db
          .update(webhooks)
          .set({
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: 0,
          })
          .where(eq(webhooks.id, hook.id));
      }
    })
  );
}
