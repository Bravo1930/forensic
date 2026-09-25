import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { comparisonRouter } from "./routers/comparison";
import { publicProcedure, router } from "./_core/trpc";
import { casesRouter } from "./routers/cases";
import { evidenceRouter } from "./routers/evidence";
import { analysesRouter } from "./routers/analyses";
import { subscriptionsRouter } from "./routers/subscriptions";
import { reportsRouter } from "./routers/reports";
import { stripeRouter } from "./routers/stripe";
import { legalAnalysisRouter } from "./routers/legalAnalysis";
import { ENV } from "./_core/env";
import { register, login } from "./_core/localAuth";

export const appRouter = router({
  system: systemRouter,
  comparison: comparisonRouter,
  auth: router({
    // Explicit allowlist: never send passwordHash (or any future sensitive
    // column) to the browser.
    me: publicProcedure.query(({ ctx }) => {
      const u = ctx.user;
      if (!u) return null;
      return {
        id: u.id,
        openId: u.openId,
        name: u.name,
        email: u.email,
        loginMethod: u.loginMethod,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastSignedIn: u.lastSignedIn,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await register({
          email: input.email,
          password: input.password,
          name: input.name,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          req: ctx.req,
          res: ctx.res,
        });
        return user;
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const user = await login({
          email: input.email,
          password: input.password,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
          req: ctx.req,
          res: ctx.res,
        });
        return user;
      }),
  }),
  cases: casesRouter,
  evidence: evidenceRouter,
  analyses: analysesRouter,
  subscriptions: subscriptionsRouter,
  reports: reportsRouter,
  stripe: stripeRouter,
  legalAnalysis: legalAnalysisRouter,
  maps: router({
    config: publicProcedure.query(() => {
      const proxyUrl = ENV.forgeApiUrl;
      const apiKey = ENV.forgeApiKey;
      if (!proxyUrl || !apiKey) {
        return { available: false } as const;
      }
      return {
        available: true,
        proxyUrl: `${proxyUrl.replace(/\/+$/, "")}/v1/maps/proxy`,
        apiKey,
      } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
