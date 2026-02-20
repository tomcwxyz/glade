import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

function getPeriodDates(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    start: item?.current_period_start
      ? new Date(item.current_period_start * 1000)
      : null,
    end: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
  };
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const spaceId = session.metadata?.spaceId;
      if (!spaceId || !session.subscription) break;

      const stripeSubscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const period = getPeriodDates(stripeSubscription);

      await db
        .update(subscriptions)
        .set({
          stripeSubscriptionId: stripeSubscription.id,
          stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
          planTier: "pro",
          status: "active",
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.spaceId, spaceId));
      break;
    }

    case "customer.subscription.updated": {
      const stripeSubscription = event.data.object as Stripe.Subscription;
      const period = getPeriodDates(stripeSubscription);
      const statusMap: Record<string, string> = {
        active: "active",
        past_due: "past_due",
        canceled: "cancelled",
        incomplete: "incomplete",
        trialing: "trialing",
        incomplete_expired: "cancelled",
        unpaid: "past_due",
        paused: "cancelled",
      };

      await db
        .update(subscriptions)
        .set({
          status: (statusMap[stripeSubscription.status] || "active") as "active" | "past_due" | "cancelled" | "incomplete" | "trialing",
          stripePriceId: stripeSubscription.items.data[0]?.price.id || null,
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id));
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSubscription = event.data.object as Stripe.Subscription;

      await db
        .update(subscriptions)
        .set({
          planTier: "free",
          status: "cancelled",
          stripeSubscriptionId: null,
          stripePriceId: null,
          cancelAtPeriodEnd: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeSubscriptionId, stripeSubscription.id));
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(
        `Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}
