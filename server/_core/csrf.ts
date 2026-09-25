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

  // Production: must be explicitly configured
  if (!raw) {
    console.warn(
      "[CSRF] ALLOWED_ORIGINS not set — blocking all cross-origin requests by default"
    );
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map(o => o.trim().toLowerCase())
      .filter(o => o.length > 0)
  );
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
  app.use("/api", csrfProtection);
}
