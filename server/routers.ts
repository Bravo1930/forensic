import { COOKIE_NAME } from "@shared/const";
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
import { getUserByOpenId, upsertUser } from "./db";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";

const DEMO_OPENID = "demo-user-forensic-legal";

export const appRouter = router({
  system: systemRouter,
  comparison: comparisonRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    loginDemo: publicProcedure.mutation(async ({ ctx }) => {
      if (process.env.NODE_ENV !== "development") {
        throw new Error("Demo login only available in development");
      }

      let user = await getUserByOpenId(DEMO_OPENID);
      if (!user) {
        await upsertUser({
          openId: DEMO_OPENID,
          name: "Usuario Demo",
          email: "demo@forensiclegal.local",
          loginMethod: "demo",
          lastSignedIn: new Date(),
          role: "user",
        });
        user = (await getUserByOpenId(DEMO_OPENID)) ?? undefined;
      }

      if (!user) {
        throw new Error("Failed to create demo user");
      }

      const token = await new SignJWT({
        openId: user.openId,
        appId: ENV.appId,
        name: user.name ?? "Usuario Demo",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(new TextEncoder().encode(ENV.cookieSecret));

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      console.log("[Demo] Cookie set with options:", cookieOptions);

      return { success: true, user };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
