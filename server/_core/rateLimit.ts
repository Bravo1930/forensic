import type { Request, Response, NextFunction } from "express";
import { ENV } from "./env";

// Rate limiting is enabled in all environments by default.
// Disable explicitly with DISABLE_RATE_LIMIT=true if needed (e.g. load testing).
const DISABLE = process.env.DISABLE_RATE_LIMIT === "true";

// In dev/Docker, use generous limits so it doesn't get in the way
const DEV_MULTIPLIER = ENV.isProduction ? 1 : 5;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface UserRateLimitEntry extends RateLimitEntry {
  plan: string;
}

const ipStore = new Map<string, RateLimitEntry>();
const userStore = new Map<string, UserRateLimitEntry>();

const MAX_STORE_SIZE = 10000;

const PLAN_LIMITS = {
  free: { requests: ENV.rateLimits.free * DEV_MULTIPLIER, windowMs: 60 * 1000 },
  premium: {
    requests: ENV.rateLimits.premium * DEV_MULTIPLIER,
    windowMs: 60 * 1000,
  },
  enterprise: {
    requests: ENV.rateLimits.enterprise * DEV_MULTIPLIER,
    windowMs: 60 * 1000,
  },
};

function getClientIdentifier(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function getUserIdentifier(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return `bearer:${authHeader.slice(7)}`;
  }
  if ((req as any).user?.id) {
    return `user:${(req as any).user.id}`;
  }
  if ((req as any).session?.userId) {
    return `session:${(req as any).session.userId}`;
  }
  return null;
}

function getUserPlan(req: Request): "free" | "premium" | "enterprise" {
  const user = (req as any).user;
  if (user?.role === "admin") return "enterprise";
  if (user?.subscription?.plan) {
    const plan = user.subscription.plan as string;
    if (plan === "premium" || plan === "enterprise")
      return plan as "premium" | "enterprise";
  }
  return "free";
}

function cleanupStore(store: Map<string, RateLimitEntry | UserRateLimitEntry>) {
  const now = Date.now();
  let deletedCount = 0;
  const keysToDelete: string[] = [];

  store.forEach((entry, key) => {
    if (entry.resetTime < now) {
      keysToDelete.push(key);
    }
  });

  for (const key of keysToDelete) {
    store.delete(key);
    deletedCount++;
  }

  if (store.size > MAX_STORE_SIZE) {
    const entries: Array<[string, RateLimitEntry | UserRateLimitEntry]> = [];
    store.forEach((value, key) => entries.push([key, value]));
    entries.sort((a, b) => a[1].resetTime - b[1].resetTime);
    const toDelete = entries.slice(0, Math.floor(entries.length * 0.2));
    for (const [key] of toDelete) {
      store.delete(key);
    }
  }

  if (deletedCount > 0 || store.size > MAX_STORE_SIZE) {
    console.log(
      `[RateLimit] Cleanup: removed ${deletedCount} expired, ${store.size} total entries`
    );
  }
}

setInterval(() => {
  cleanupStore(ipStore);
  cleanupStore(userStore);
}, 30 * 1000);

export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (DISABLE) return next();

  // Skip rate limiting for Manus debug collector (dev-only internal logging)
  if (req.path.startsWith("/__manus__/")) return next();

  // Skip rate limiting for Vite dev server module requests (src files, HMR, etc.)
  if (
    !ENV.isProduction &&
    (req.path.startsWith("/src/") ||
      req.path.startsWith("/@id/") ||
      req.path.startsWith("/@fs/") ||
      req.path.startsWith("/node_modules/.vite/") ||
      req.path.startsWith("/__vite_"))
  ) {
    return next();
  }

  const ipKey = `ip:${getClientIdentifier(req)}`;
  const now = Date.now();

  let ipEntry = ipStore.get(ipKey);
  if (!ipEntry || ipEntry.resetTime < now) {
    ipEntry = { count: 0, resetTime: now + PLAN_LIMITS.free.windowMs };
    ipStore.set(ipKey, ipEntry);
  }
  ipEntry.count++;

  const userKey = getUserIdentifier(req);
  if (userKey) {
    const plan = getUserPlan(req);
    const limit = PLAN_LIMITS[plan];
    let userEntry = userStore.get(userKey);

    if (!userEntry || userEntry.resetTime < now) {
      userEntry = { count: 0, resetTime: now + limit.windowMs, plan };
      userStore.set(userKey, userEntry);
    }
    userEntry.count++;

    res.setHeader("X-RateLimit-Limit", limit.requests);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, limit.requests - userEntry.count)
    );
    res.setHeader("X-RateLimit-Reset", Math.ceil(userEntry.resetTime / 1000));

    if (userEntry.count > limit.requests) {
      res.status(429).json({
        error: "Too many requests",
        message: `Límite de ${limit.requests} solicitudes por minuto excedido para tu plan ${plan}`,
        retryAfter: Math.ceil((userEntry.resetTime - now) / 1000),
      });
      return;
    }
  } else {
    const limit = PLAN_LIMITS.free;

    res.setHeader("X-RateLimit-Limit", limit.requests);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, limit.requests - ipEntry.count)
    );
    res.setHeader("X-RateLimit-Reset", Math.ceil(ipEntry.resetTime / 1000));

    if (ipEntry.count > limit.requests) {
      res.status(429).json({
        error: "Too many requests",
        message: "Por favor intenta de nuevo en un minuto",
        retryAfter: Math.ceil((ipEntry.resetTime - now) / 1000),
      });
      return;
    }
  }

  next();
}

export function strictRateLimit(maxRequests = 10, windowMs = 60 * 1000) {
  if (DISABLE) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const store = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction) => {
    const identifier =
      getUserIdentifier(req) ?? `ip:${getClientIdentifier(req)}`;
    const key = `strict:${identifier}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetTime < now) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      res.status(429).json({
        error: "Rate limit exceeded",
        message: `Límite de ${maxRequests} solicitudes por minuto excedido`,
      });
      return;
    }

    next();
  };
}

export function analysisRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userKey = getUserIdentifier(req);
  if (!userKey) {
    return next();
  }

  const now = Date.now();
  const key = `analysis:${userKey}`;
  let entry = userStore.get(key) as UserRateLimitEntry | undefined;

  const MAX_CONCURRENT_ANALYSES = 2;
  const WINDOW_MS = 5 * 60 * 1000;

  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + WINDOW_MS, plan: "default" };
    userStore.set(key, entry);
  }

  entry.count++;

  if (entry.count > MAX_CONCURRENT_ANALYSES) {
    res.status(429).json({
      error: "Analysis limit",
      message: "Máximo 2 análisis simultáneos por usuario",
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    });
    return;
  }

  next();
}
