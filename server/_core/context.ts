import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUserByOpenId, upsertUser } from "../db";
import { logSecurityEvent } from "./audit";
import { ENV } from "./env";

const DEMO_OPENID = "demo-user-forensic-legal";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getOrCreateDemoUser(ip: string): Promise<User | null> {
  try {
    const demoEnabled = process.env.DEMO_MODE_ENABLED === "true";
    if (!demoEnabled) {
      console.warn(
        `[DemoAuth] Demo mode disabled — rejecting request from ${ip}`
      );
      return null;
    }

    let user = await getUserByOpenId(DEMO_OPENID);
    if (!user) {
      await upsertUser({
        openId: DEMO_OPENID,
        name: "Usuario Demo",
        email: "demo@forensiclegal.local",
        loginMethod: "demo",
        lastSignedIn: new Date(),
        role: "demo",
      });
      user = (await getUserByOpenId(DEMO_OPENID)) ?? undefined;
    }

    if (user) {
      logSecurityEvent(
        "login",
        { ip },
        {
          action: "Demo user session granted",
          resource: "auth",
          success: true,
          metadata: { mode: "demo" },
        }
      );
    }

    return user ?? null;
  } catch (error) {
    console.error("[DemoAuth] Failed to get/create demo user:", error);
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const ip = opts.req.ip || opts.req.socket.remoteAddress || "unknown";

  try {
    const user = await sdk.authenticateRequest(opts.req);
    return { req: opts.req, res: opts.res, user };
  } catch (error) {
    // En producción: no hay fallback
    if (ENV.isProduction) {
      return { req: opts.req, res: opts.res, user: null };
    }

    // En desarrollo: solo demo mode si está explícitamente habilitado
    const demoEnabled = process.env.DEMO_MODE_ENABLED === "true";
    if (!demoEnabled) {
      return { req: opts.req, res: opts.res, user: null };
    }

    const demoUser = await getOrCreateDemoUser(ip);
    return { req: opts.req, res: opts.res, user: demoUser };
  }
}
