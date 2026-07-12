import type { Request, Response, NextFunction } from "express";
import type { Express } from "express";
import { getAllowedOrigins } from "./csrf";

function isValidOriginFormat(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function corsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();

  res.setHeader("Vary", "Origin");

  if (!origin) {
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  }

  if (!isValidOriginFormat(origin)) {
    console.warn(`[CORS] Blocked invalid origin format: ${origin}`);
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  }

  const lowerOrigin = origin.toLowerCase();
  if (!allowed.has(lowerOrigin)) {
    console.warn(
      `[CORS] Blocked origin: ${origin} — allowed: ${Array.from(allowed).join(", ")}`
    );
    if (req.method === "OPTIONS") return res.status(204).end();
    return res.status(403).json({ error: "Origin not allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", lowerOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  next();
}

export function registerCors(app: Express) {
  app.use(corsMiddleware);
}
