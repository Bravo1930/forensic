import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerStripeWebhook } from "../stripeWebhook";
import casesRouter from "../routes/cases";
import { rateLimitMiddleware, strictRateLimit } from "./rateLimit";
import { registerSecurityHeaders } from "./security";
import { registerCors } from "./cors";
import { registerCsrfProtection } from "./csrf";
import { startWorker } from "./queue";
import { handleAnalysisJob } from "./analysisWorker";
import { validateEnvironment } from "./env";
import { failInterruptedComparisons, runMigrations } from "../db";
import { getStorageDriver } from "../storage";
import filesRouter from "../routes/files";

// Validate environment configuration on startup
validateEnvironment();

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  await runMigrations();

  const interrupted = await failInterruptedComparisons();
  if (interrupted > 0) {
    console.warn(
      `[Comparison] Marked ${interrupted} comparison(s) interrupted by the last restart as failed`
    );
  }

  const storageDriver = getStorageDriver();
  if (storageDriver) {
    const where =
      storageDriver === "local"
        ? ` at ${process.env.LOCAL_UPLOAD_DIR ?? "./uploads"}`
        : "";
    console.log(`[Storage] Driver: ${storageDriver}${where}`);
  } else {
    console.warn(
      "[Storage] No storage configured (set STORAGE_DRIVER=local + LOCAL_UPLOAD_DIR, or Forge credentials) — uploads will return 503"
    );
  }

  const app = express();
  const server = createServer(app);

  // Trust proxy when behind a reverse proxy (nginx, cloudflare, etc.)
  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }

  // Security headers (CORS first, then security headers, then CSRF)
  registerCors(app);
  registerSecurityHeaders(app);
  registerCsrfProtection(app);

  // ⚠️ Register Stripe webhook BEFORE express.json() to preserve raw body for signature verification
  registerStripeWebhook(app);

  // Body parser limits
  // - 10MB global (covers normal API traffic, ~7.5MB effective file via base64)
  // - Evidence uploads are manually validated in the upload procedure
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Serve local uploads in development
  const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "./uploads";
  if (process.env.NODE_ENV === "development") {
    app.use("/uploads", express.static(LOCAL_UPLOAD_DIR));
  }

  // Authenticated, decrypting file downloads (own rate limit, see files.ts)
  app.use("/api", filesRouter);

  // Rate limiting — only applies to /api routes, NOT to Vite-served modules
  app.use("/api", rateLimitMiddleware);

  // Strict rate limiting for OAuth and auth endpoints
  app.use("/api/oauth", strictRateLimit(10, 60 * 1000));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // REST API Routes
  app.use("/api/cases", casesRouter);

  // tRPC API - debe estar ANTES de Vite para que no sea interceptado por el wildcard en desarrollo
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Start background analysis worker (graceful fallback if Redis unavailable)
  const workerStarted = await startWorker(handleAnalysisJob);
  if (workerStarted) {
    console.log(
      `[Queue] Analysis worker active — jobs will be processed via BullMQ`
    );
  } else if (process.env.REDIS_URL) {
    console.warn(
      `[Queue] REDIS_URL set but connection failed — analyses will run inline`
    );
  } else {
    console.log(`[Queue] REDIS_URL not set — analyses will run inline`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
