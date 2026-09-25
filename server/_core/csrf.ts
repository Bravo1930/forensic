import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";

/**
 * Single source of truth for allowed origins.
 * Shared between CSRF and CORS middleware.
 * In production these MUST be set via ALLOWED_ORIGINS env var.
 */
export function getAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS ?? process.env.ALLOWED_ORIGIN ?? "";
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

  if (isDev) {
    return new Set(["http://localhost:5173", "http://localhost:3000"]);
  }

  const origins = new Set(
    raw
      .split(",")
      .map(o => o.trim().toLowerCase().replace(/\/+$/, ""))
      .filter(o => o.length > 0)
  );

  // The app's own public domain on Railway is always a valid origin; without
  // this, a missing ALLOWED_ORIGINS makes the app reject its own API calls.
  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN?.trim().toLowerCase();
  if (railwayDomain) {
    origins.add(`https://${railwayDomain}`);
  }

  return origins;
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  const lower = origin.toLowerCase();
  const allowed = getAllowedOrigins();
  return allowed.has(lower);
}

export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS"
  ) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  if (origin && !isOriginAllowed(origin)) {
    console.warn(`[CSRF] Blocked request from origin: ${origin}`);
    return res.status(403).json({ error: "Forbidden: Invalid origin" });
  }

  if (!origin && referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      if (!isOriginAllowed(refererOrigin)) {
        console.warn(`[CSRF] Blocked request from referer: ${refererOrigin}`);
        return res.status(403).json({ error: "Forbidden: Invalid referer" });
      }
    } catch {
      console.warn("[CSRF] Invalid referer URL");
      return res.status(403).json({ error: "Forbidden: Invalid referer" });
    }
  }

  next();
}

export function registerCsrfProtection(app: Express) {
  // Scoped to /api for the same reason as CORS (see cors.ts): this guards
  // state-changing API requests, not the static app shell.
  const allowed = Array.from(getAllowedOrigins());
  if (allowed.length > 0) {
    console.log(`[CSRF] Allowed origins: ${allowed.join(", ")}`);
  } else {
    console.warn(
      "[CSRF] No allowed origins configured (set ALLOWED_ORIGINS) — all browser API requests will be blocked"
    );
  }
  app.use("/api", csrfProtection);
}
