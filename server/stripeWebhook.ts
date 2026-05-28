/**
 * Stripe Webhook Handler
 * Registered as a raw Express route BEFORE express.json() middleware.
 * Handles: checkout.session.completed, customer.subscription.updated,
 *          customer.subscription.deleted, invoice.paid
 */

import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { subscriptions, stripeEvents } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getPlanByPriceId } from "./stripeProducts";
import { notifyOwner } from "./_core/notification";

// ─── Types ────────────────────────────────────────────────────────────────────

type StripeSub = {
  id: string;
  metadata: Record<string, string>;
  current_period_end: number;
  status: string;
  cancel_at_period_end: boolean;
  customer: string | { id: string };
  items: {
    data: Array<{ price: { id: string; recurring?: { interval: string } } }>;
  };
};

// ─── Plan limits mapping ──────────────────────────────────────────────────────

const PLAN_LIMITS = {
  free: { analysesLimit: 3, casesLimit: 3, storageLimitBytes: 524288000 },
  premium: {
    analysesLimit: 20,
    casesLimit: 50,
    storageLimitBytes: 10737418240,
  },
  enterprise: {
    analysesLimit: 999999,
    casesLimit: 999999,
    storageLimitBytes: 107374182400,
  },
};

// ─── Idempotency ──────────────────────────────────────────────────────────────

async function isEventProcessed(eventId: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [existing] = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.stripeEventId, eventId))
    .limit(1);
  return !!existing;
}

async function markEventProcessed(
  eventId: string,
  eventType: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(stripeEvents).values({
      stripeEventId: eventId,
      type: eventType,
      eventType: eventType,
      processed: false,
    });
  } catch {
    // Duplicate key = already processed, ignore silently
  }
}

// ─── Subscription activation ──────────────────────────────────────────────────

async function activateSubscription(
  userId: number,
  stripeSubscriptionId: string,
  stripePriceId: string,
  stripeCustomerId: string,
  periodEnd: Date,
  interval: "month" | "year"
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const plan = getPlanByPriceId(stripePriceId);
  const planKey = plan?.planKey ?? "premium";
  const limits = PLAN_LIMITS[planKey];

  await db
    .update(subscriptions)
    .set({
      plan: planKey,
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId,
      stripeInterval: interval,
      analysesLimit: limits.analysesLimit,
      casesLimit: limits.casesLimit,
      storageLimitBytes: limits.storageLimitBytes,
      periodEnd,
      active: true,
      cancelAtPeriodEnd: false,
    })
    .where(eq(subscriptions.userId, userId));

  console.log(`[Stripe Webhook] Activated ${planKey} plan for user ${userId}`);
}

// ─── Webhook registration ─────────────────────────────────────────────────────

export function registerStripeWebhook(app: Express): void {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey) {
    console.warn("[Stripe] STRIPE_SECRET_KEY not set, webhook disabled");
    return;
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-02-25.clover" });

  // MUST use express.raw() BEFORE express.json() for signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      let event: Stripe.Event;

      // Verify signature
      try {
        if (webhookSecret) {
          const sig = req.headers["stripe-signature"] as string;
          event = stripe.webhooks.constructEvent(
            req.body as Buffer,
            sig,
            webhookSecret
          );
        } else {
          event = JSON.parse((req.body as Buffer).toString()) as Stripe.Event;
        }
      } catch (err) {
        console.error("[Stripe Webhook] Signature verification failed:", err);
        return res
          .status(400)
          .json({ error: "Webhook signature verification failed" });
      }

      // Handle test events (verification ping)
      if (event.id.startsWith("evt_test_")) {
        console.log(
          "[Stripe Webhook] Test event detected, returning verification response"
        );
        return res.json({ verified: true });
      }

      // Idempotency check
      if (await isEventProcessed(event.id)) {
        console.log(
          `[Stripe Webhook] Event ${event.id} already processed, skipping`
        );
        return res.json({ received: true, skipped: true });
      }

      console.log(
        `[Stripe Webhook] Processing event: ${event.type} (${event.id})`
      );

      try {
        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = parseInt(
            session.metadata?.user_id ?? session.client_reference_id ?? "0",
            10
          );

          if (
            userId &&
            session.mode === "subscription" &&
            session.subscription
          ) {
            const subId =
              typeof session.subscription === "string"
                ? session.subscription
                : (session.subscription as { id: string }).id;

            const rawSub = await stripe.subscriptions.retrieve(subId);
            const sub = rawSub as unknown as StripeSub;
            const priceId = sub.items.data[0]?.price.id ?? "";
            const customerId =
              typeof sub.customer === "string" ? sub.customer : sub.customer.id;
            const interval = (sub.items.data[0]?.price.recurring?.interval ??
              "month") as "month" | "year";
            const periodEnd = new Date(sub.current_period_end * 1000);

            await activateSubscription(
              userId,
              subId,
              priceId,
              customerId,
              periodEnd,
              interval
            );

            const planInfo = getPlanByPriceId(priceId);
            await notifyOwner({
              title: `💳 Nuevo suscriptor: ${session.metadata?.customer_name ?? "Usuario"}`,
              content: `Plan: ${planInfo?.name ?? "Premium"}\nEmail: ${session.metadata?.customer_email ?? ""}\nUsuario ID: ${userId}\nMonto: $${((session.amount_total ?? 0) / 100).toFixed(2)} USD`,
            });
          }
        } else if (event.type === "customer.subscription.updated") {
          const rawSub = event.data.object;
          const sub = rawSub as unknown as StripeSub;
          const userId = parseInt(sub.metadata?.userId ?? "0", 10);

          if (userId) {
            const priceId = sub.items.data[0]?.price.id ?? "";
            const customerId =
              typeof sub.customer === "string" ? sub.customer : sub.customer.id;
            const interval = (sub.items.data[0]?.price.recurring?.interval ??
              "month") as "month" | "year";
            const periodEnd = new Date(sub.current_period_end * 1000);

            if (sub.status === "active" || sub.status === "trialing") {
              await activateSubscription(
                userId,
                sub.id,
                priceId,
                customerId,
                periodEnd,
                interval
              );

              const db = await getDb();
              if (db) {
                await db
                  .update(subscriptions)
                  .set({ cancelAtPeriodEnd: sub.cancel_at_period_end })
                  .where(eq(subscriptions.userId, userId));
              }
            }
          }
        } else if (event.type === "customer.subscription.deleted") {
          const rawSub = event.data.object;
          const sub = rawSub as unknown as StripeSub;
          const userId = parseInt(sub.metadata?.userId ?? "0", 10);

          if (userId) {
            const db = await getDb();
            if (db) {
              const freeLimits = PLAN_LIMITS.free;
              await db
                .update(subscriptions)
                .set({
                  plan: "free",
                  stripeSubscriptionId: null,
                  stripePriceId: null,
                  stripeInterval: null,
                  analysesLimit: freeLimits.analysesLimit,
                  casesLimit: freeLimits.casesLimit,
                  storageLimitBytes: freeLimits.storageLimitBytes,
                  active: true,
                  cancelAtPeriodEnd: false,
                })
                .where(eq(subscriptions.userId, userId));

              console.log(
                `[Stripe Webhook] Downgraded user ${userId} to free plan`
              );
            }
          }
        } else if (event.type === "invoice.paid") {
          const invoice = event.data.object as unknown as {
            subscription?: string | { id: string };
          };
          if (invoice.subscription) {
            const subId =
              typeof invoice.subscription === "string"
                ? invoice.subscription
                : invoice.subscription.id;

            const rawSub = await stripe.subscriptions.retrieve(subId);
            const sub = rawSub as unknown as StripeSub;
            const userId = parseInt(sub.metadata?.userId ?? "0", 10);

            if (userId) {
              const db = await getDb();
              if (db) {
                const periodEnd = new Date(sub.current_period_end * 1000);
                await db
                  .update(subscriptions)
                  .set({ periodEnd, analysesUsed: 0, active: true })
                  .where(eq(subscriptions.userId, userId));

                console.log(
                  `[Stripe Webhook] Renewed subscription for user ${userId}, period ends ${periodEnd.toISOString()}`
                );
              }
            }
          }
        } else {
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }

        await markEventProcessed(event.id, event.type);
        return res.json({ received: true });
      } catch (err) {
        console.error(
          `[Stripe Webhook] Error processing event ${event.type}:`,
          err
        );
        return res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );

  console.log("[Stripe] Webhook registered at /api/stripe/webhook");
}
