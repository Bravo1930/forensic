import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import crypto from "crypto";

export function addSecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // ── Standard headers ────────────────────────────────────────────
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // ── Cross-Origin isolation ──────────────────────────────────────
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");

  // ── Permissions-Policy ──────────────────────────────────────────
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), clipboard-read=(self), clipboard-write=(self)"
  );

  // ── Content-Security-Policy ─────────────────────────────────────
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const csp = isDev
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://localhost:* http://localhost:* ws://localhost:* blob:",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "worker-src 'self' blob:",
        "connect-src 'self' https: wss: ws: http:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    : [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self'",
        "connect-src 'self' https:",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ");

  res.setHeader("Content-Security-Policy", csp);
  Object.defineProperty(req, "cspNonce", { value: nonce, writable: false });

  next();
}

export function addHSTSHeader(req: Request, res: Response, next: NextFunction) {
  if (req.protocol === "https") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  next();
}

export function registerSecurityHeaders(app: Express) {
  app.use(addSecurityHeaders);
  app.use(addHSTSHeader);
}
