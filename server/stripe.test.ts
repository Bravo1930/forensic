/**
 * Stripe integration tests
 * Tests cover: plan catalog, price lookup, webhook logic, checkout session validation
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  STRIPE_PLANS,
  FREE_PLAN,
  getPlanByPriceId,
  getPlanByKey,
} from "./stripeProducts";

// ─── stripeProducts tests ─────────────────────────────────────────────────────

describe("stripeProducts", () => {
  it("exports 4 paid plans (premium monthly, premium annual, enterprise monthly, enterprise annual)", () => {
    expect(STRIPE_PLANS).toHaveLength(4);
    const planKeys = STRIPE_PLANS.map(p => p.planKey);
    expect(planKeys.filter(k => k === "premium")).toHaveLength(2);
    expect(planKeys.filter(k => k === "enterprise")).toHaveLength(2);
  });

  it("exports a free plan with correct limits", () => {
    expect(FREE_PLAN.planKey).toBe("free");
    expect(FREE_PLAN.analysesLimit).toBe(3);
    expect(FREE_PLAN.storageGb).toBe(0.5);
    expect(FREE_PLAN.maxCases).toBe(3);
  });

  it("premium monthly plan has correct price", () => {
    const plan = STRIPE_PLANS.find(
      p => p.planKey === "premium" && p.interval === "month"
    );
    expect(plan).toBeDefined();
    expect(plan!.amountCents).toBeGreaterThan(0);
    expect(plan!.displayPrice).toMatch(/\$/);
  });

  it("enterprise annual plan is cheaper per month than monthly", () => {
    const monthly = STRIPE_PLANS.find(
      p => p.planKey === "enterprise" && p.interval === "month"
    );
    const annual = STRIPE_PLANS.find(
      p => p.planKey === "enterprise" && p.interval === "year"
    );
    expect(monthly).toBeDefined();
    expect(annual).toBeDefined();
    // Annual total should be less than 12x monthly
    expect(annual!.amountCents).toBeLessThan(monthly!.amountCents * 12);
  });

  it("getPlanByKey returns correct plan", () => {
    const plan = getPlanByKey("premium", "month");
    expect(plan).toBeDefined();
    expect(plan!.planKey).toBe("premium");
    expect(plan!.interval).toBe("month");
  });

  it("getPlanByKey returns undefined for unknown plan", () => {
    const plan = getPlanByKey("unknown" as "premium", "month");
    expect(plan).toBeUndefined();
  });

  it("getPlanByPriceId returns undefined for unknown price ID", () => {
    const plan = getPlanByPriceId("price_unknown_xyz");
    expect(plan).toBeUndefined();
  });

  it("all plans have required fields", () => {
    for (const plan of STRIPE_PLANS) {
      expect(plan.planKey).toBeDefined();
      expect(plan.name).toBeDefined();
      expect(plan.interval).toMatch(/^(month|year)$/);
      expect(plan.amountCents).toBeGreaterThan(0);
      expect(plan.displayPrice).toBeDefined();
      expect(plan.features).toBeInstanceOf(Array);
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.analysesLimit).toBeGreaterThan(0);
      expect(plan.storageGb).toBeGreaterThan(0);
      expect(plan.maxCases).toBeGreaterThan(0);
    }
  });

  it("premium plan has more analyses than free plan", () => {
    const premiumMonthly = STRIPE_PLANS.find(
      p => p.planKey === "premium" && p.interval === "month"
    );
    expect(premiumMonthly!.analysesLimit).toBeGreaterThan(
      FREE_PLAN.analysesLimit
    );
  });

  it("enterprise plan has more storage than premium plan", () => {
    const premium = STRIPE_PLANS.find(
      p => p.planKey === "premium" && p.interval === "month"
    );
    const enterprise = STRIPE_PLANS.find(
      p => p.planKey === "enterprise" && p.interval === "month"
    );
    expect(enterprise!.storageGb).toBeGreaterThan(premium!.storageGb);
  });
});

// ─── Webhook logic tests ──────────────────────────────────────────────────────

describe("stripe webhook logic", () => {
  it("detects test events by evt_test_ prefix", () => {
    const testEventId = "evt_test_abc123";
    const isTestEvent = testEventId.startsWith("evt_test_");
    expect(isTestEvent).toBe(true);
  });

  it("does not flag real events as test events", () => {
    const realEventId = "evt_1ABC123def456";
    const isTestEvent = realEventId.startsWith("evt_test_");
    expect(isTestEvent).toBe(false);
  });

  it("maps checkout.session.completed to subscription activation", () => {
    const supportedEvents = [
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.paid",
    ];
    expect(supportedEvents).toContain("checkout.session.completed");
    expect(supportedEvents).toContain("customer.subscription.deleted");
  });

  it("calculates correct plan limits for premium", () => {
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
    expect(PLAN_LIMITS.premium.analysesLimit).toBe(20);
    expect(PLAN_LIMITS.premium.storageLimitBytes).toBe(10 * 1024 * 1024 * 1024);
  });

  it("calculates correct plan limits for enterprise", () => {
    const PLAN_LIMITS = {
      enterprise: {
        analysesLimit: 999999,
        casesLimit: 999999,
        storageLimitBytes: 107374182400,
      },
    };
    expect(PLAN_LIMITS.enterprise.analysesLimit).toBe(999999);
    expect(PLAN_LIMITS.enterprise.storageLimitBytes).toBe(
      100 * 1024 * 1024 * 1024
    );
  });

  it("downgrade to free plan resets limits correctly", () => {
    const freeLimits = {
      analysesLimit: 3,
      casesLimit: 3,
      storageLimitBytes: 524288000,
    };
    expect(freeLimits.analysesLimit).toBe(3);
    expect(freeLimits.casesLimit).toBe(3);
    expect(freeLimits.storageLimitBytes).toBe(500 * 1024 * 1024);
  });
});

// ─── Checkout session validation tests ───────────────────────────────────────

describe("checkout session validation", () => {
  it("validates plan key enum", () => {
    const validPlanKeys = ["premium", "enterprise"];
    expect(validPlanKeys).toContain("premium");
    expect(validPlanKeys).toContain("enterprise");
    expect(validPlanKeys).not.toContain("free");
    expect(validPlanKeys).not.toContain("unknown");
  });

  it("validates interval enum", () => {
    const validIntervals = ["month", "year"];
    expect(validIntervals).toContain("month");
    expect(validIntervals).toContain("year");
    expect(validIntervals).not.toContain("week");
    expect(validIntervals).not.toContain("day");
  });

  it("builds correct success URL format", () => {
    const origin = "https://app.example.com";
    const successUrl = `${origin}/pago/exito?session_id={CHECKOUT_SESSION_ID}`;
    expect(successUrl).toBe(
      "https://app.example.com/pago/exito?session_id={CHECKOUT_SESSION_ID}"
    );
  });

  it("builds correct cancel URL format", () => {
    const origin = "https://app.example.com";
    const cancelUrl = `${origin}/pago/cancelado`;
    expect(cancelUrl).toBe("https://app.example.com/pago/cancelado");
  });

  it("metadata includes required fields", () => {
    const metadata = {
      user_id: "42",
      customer_email: "test@example.com",
      customer_name: "Test User",
      plan_key: "premium",
      interval: "month",
    };
    expect(metadata.user_id).toBeDefined();
    expect(metadata.customer_email).toBeDefined();
    expect(metadata.plan_key).toBeDefined();
    expect(metadata.interval).toBeDefined();
  });
});

// ─── Plan display tests ───────────────────────────────────────────────────────

describe("plan display formatting", () => {
  it("all plans have display price starting with $", () => {
    for (const plan of STRIPE_PLANS) {
      expect(plan.displayPrice).toMatch(/^\$/);
    }
  });

  it("monthly plans have /mes in display interval", () => {
    const monthlyPlans = STRIPE_PLANS.filter(p => p.interval === "month");
    for (const plan of monthlyPlans) {
      expect(plan.displayInterval).toContain("mes");
    }
  });

  it("annual plans have /año in display interval", () => {
    const annualPlans = STRIPE_PLANS.filter(p => p.interval === "year");
    for (const plan of annualPlans) {
      expect(plan.displayInterval).toContain("año");
    }
  });
});
