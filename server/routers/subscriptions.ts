import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getAdminStats,
  getAllUsers,
  getSubscription,
  upgradePlan,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const subscriptionsRouter = router({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    try {
      const sub = await getSubscription(ctx.user.id);
      if (sub) return sub;
    } catch (error) {
      console.warn("[Subscription] DB unavailable, returning default");
    }
    // Return default subscription when DB is unavailable
    return {
      id: 0,
      userId: ctx.user.id,
      plan: "free" as const,
      analysesUsed: 0,
      analysesLimit: 5,
      casesLimit: 10,
      storageUsedBytes: 0,
      storageLimitBytes: 524288000,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      active: true,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeInterval: null,
      cancelAtPeriodEnd: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }),

  upgrade: protectedProcedure
    .input(z.object({ plan: z.enum(["premium", "enterprise"]) }))
    .mutation(async ({ ctx, input }) => {
      await upgradePlan(ctx.user.id, input.plan);
      return { success: true, plan: input.plan };
    }),

  // Admin only
  adminStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getAdminStats();
  }),

  adminUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getAllUsers();
  }),
});
