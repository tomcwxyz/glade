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
