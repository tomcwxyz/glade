import crypto from "crypto";
import https from "node:https";
import dns from "node:dns/promises";
import { after } from "next/server";
import { db } from "@/db";
import { webhooks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateWebhookUrl, resolvePublicAddresses } from "@/lib/net-guard";

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

export { validateWebhookUrl };

/**
 * POST to a webhook, connecting only to addresses that resolved as public.
 * The `lookup` hook runs inside the connection itself, so the IP we vet is the
 * IP we connect to (no DNS-rebinding window). TLS still verifies the hostname.
 */
function postPinned(
  url: string,
  headers: Record<string, string>,
  body: string,
  timeoutMs: number
): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(body).toString() },
        timeout: timeoutMs,
        lookup: (hostname, options, callback) => {
          resolvePublicAddresses(hostname, (h, o) => dns.lookup(h, o))
            .then((addresses) => {
              if ((options as { all?: boolean }).all) {
                (callback as unknown as (e: null, a: typeof addresses) => void)(null, addresses);
              } else {
                callback(null, addresses[0].address, addresses[0].family);
              }
            })
            .catch((err: Error) => callback(err as NodeJS.ErrnoException, "", 0));
        },
      },
      (res) => {
        res.resume(); // drain; we only record the status
        resolve(res.statusCode ?? 0);
      }
    );
    req.on("timeout", () => req.destroy(new Error("Webhook timed out")));
    req.on("error", reject);
    req.end(body);
  });
}

/**
 * Fire webhooks for a space event. Runs after the response via `after()` so the
 * delivery isn't cut off when the serverless function returns, while never
 * blocking the caller.
 */
export function fireWebhooks(
  spaceId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
) {
  after(() =>
    deliverWebhooks(spaceId, event, data).catch((err) => {
      console.error("Webhook delivery error:", err);
    })
  );
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
        const status = await postPinned(
          hook.url,
          {
            "Content-Type": "application/json",
            "X-Glade-Signature": signature,
            "X-Glade-Event": event,
          },
          body,
          10000
        );

        await db
          .update(webhooks)
          .set({
            lastDeliveryAt: new Date(),
            lastDeliveryStatus: status,
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
