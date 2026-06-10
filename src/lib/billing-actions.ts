"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requireSpaceRole } from "@/lib/space";
import { getSpaceSubscription } from "@/lib/queries";
import { getStripe } from "@/lib/stripe";

async function getOrCreateSubscription(spaceId: string) {
  const existing = await getSpaceSubscription(spaceId);
  if (existing) return existing;

  const [created] = await db
    .insert(subscriptions)
    .values({ spaceId, planTier: "free", status: "active" })
    .returning();
  return created;
}

export async function createCheckoutSession(priceId: string) {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  const { space } = auth;

  const stripe = getStripe();
  const sub = await getOrCreateSubscription(space.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Get or create Stripe customer
  let customerId = sub.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { spaceId: space.id, spaceName: space.name },
    });
    customerId = customer.id;
    await db
      .update(subscriptions)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=cancelled`,
    metadata: { spaceId: space.id },
  });

  if (session.url) redirect(session.url);
  return { error: "Failed to create checkout session" };
}

export async function createCustomerPortalSession() {
  const auth = await requireSpaceRole("admin");
  if ("error" in auth) return auth;
  const { space } = auth;

  const sub = await getSpaceSubscription(space.id);
  if (!sub?.stripeCustomerId) return { error: "No billing account found" };

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  redirect(session.url);
}
