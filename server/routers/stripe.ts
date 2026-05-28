import Stripe from "stripe";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { subscriptions, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { STRIPE_PLANS, FREE_PLAN, getPlanByPriceId } from "../stripeProducts";

// ─── Stripe client ────────────────────────────────────────────────────────────

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor",
    });
  return new Stripe(key, { apiVersion: "2026-02-25.clover" });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get or create a Stripe customer for the user */
async function getOrCreateStripeCustomer(
  stripe: Stripe,
  userId: number,
  email: string | null | undefined,
  name: string | null | undefined
): Promise<string> {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error interno del servidor",
    });

  // Check if user already has a Stripe customer ID
  const [sub] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { userId: userId.toString() },
  });

  // Save customer ID to subscription
  await db
    .update(subscriptions)
    .set({ stripeCustomerId: customer.id })
    .where(eq(subscriptions.userId, userId));

  return customer.id;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const stripeRouter = router({
  /** Get available plans with prices */
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const [sub] = db
      ? await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, ctx.user.id))
          .limit(1)
      : [];

    return {
      currentPlan: sub?.plan ?? "free",
      currentInterval: sub?.stripeInterval ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      periodEnd: sub?.periodEnd ?? null,
      plans: STRIPE_PLANS,
      freePlan: FREE_PLAN,
    };
  }),

  /** Create a Stripe Checkout Session for a plan upgrade */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planKey: z.enum(["premium", "enterprise"]),
        interval: z.enum(["month", "year"]),
        origin: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error interno del servidor",
        });

      const plan = STRIPE_PLANS.find(
        p => p.planKey === input.planKey && p.interval === input.interval
      );
      if (!plan)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Plan no encontrado",
        });

      // Get or create Stripe customer
      const customerId = await getOrCreateStripeCustomer(
        stripe,
        ctx.user.id,
        ctx.user.email,
        ctx.user.name
      );

      // Build price data if no stripePriceId configured (create on-the-fly for sandbox)
      let priceId = plan.stripePriceId;

      if (!priceId) {
        // Create product + price dynamically in Stripe sandbox
        const product = await stripe.products.create({
          name: plan.name,
          description: `ForensicLegal ${plan.name} - Plataforma de análisis forense digital`,
          metadata: { planKey: plan.planKey, interval: plan.interval },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.amountCents,
          currency: "usd",
          recurring: { interval: plan.interval },
          metadata: { planKey: plan.planKey },
        });

        priceId = price.id;

        // Save price ID to env-like metadata for future use
        console.log(`[Stripe] Created price ${priceId} for plan ${plan.name}`);
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
          plan_key: plan.planKey,
          interval: plan.interval,
        },
        success_url: `${input.origin}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${input.origin}/pago/cancelado`,
        subscription_data: {
          metadata: {
            userId: ctx.user.id.toString(),
            planKey: plan.planKey,
            interval: plan.interval,
          },
        },
      });

      return { url: session.url };
    }),

  /** Create a Stripe Billing Portal session for managing subscription */
  createPortalSession: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error interno del servidor",
        });

      const [sub] = await db
        .select({ stripeCustomerId: subscriptions.stripeCustomerId })
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);

      if (!sub?.stripeCustomerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No tienes una suscripción activa con Stripe",
        });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${input.origin}/suscripcion`,
      });

      return { url: session.url };
    }),

  /** Get current subscription status from DB */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);

    if (!sub) return null;

    const planLabels: Record<string, string> = {
      free: "Gratuito",
      premium: "Premium",
      enterprise: "Empresarial",
    };

    return {
      plan: sub.plan,
      planLabel: planLabels[sub.plan] ?? sub.plan,
      interval: sub.stripeInterval,
      analysesUsed: sub.analysesUsed,
      analysesLimit: sub.analysesLimit,
      casesLimit: sub.casesLimit,
      storageUsedBytes: sub.storageUsedBytes,
      storageLimitBytes: sub.storageLimitBytes,
      periodStart: sub.periodStart,
      periodEnd: sub.periodEnd,
      active: sub.active,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      hasStripeSubscription: !!sub.stripeSubscriptionId,
    };
  }),
});
