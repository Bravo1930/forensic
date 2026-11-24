/**
 * Regression tests for the Stripe webhook route.
 *
 * Bug (2026-11-23): an empty POST to /api/stripe/webhook on Railway answered
 * the SPA index.html instead of a webhook error — because the route was only
 * registered when STRIPE_SECRET_KEY was set, so with the keys missing the
 * request fell through to the SPA fallback. The route must always be
 * registered and must answer JSON (500 without keys, 400 on bad signature),
 * never HTML.
 */
import express from "express";
import { describe, expect, it } from "vitest";
import { registerStripeWebhook } from "./stripeWebhook";

function buildApp() {
  const app = express();
  registerStripeWebhook(app);
  // Same guards as production (server/_core/index.ts): unknown /api paths
  // answer JSON 404, and anything else falls through to the SPA shell.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use("*", (_req, res) => {
    res.status(200).set({ "Content-Type": "text/html" }).send("INDEX_HTML");
  });
  return app;
}

async function postWebhook(app: ReturnType<typeof buildApp>) {
  const server = app.listen(0);
  await new Promise<void>(resolve => server.on("listening", () => resolve()));
  const port = (server.address() as { port: number }).port;
  try {
    const res = await fetch(
      `http://127.0.0.1:${port}/api/stripe/webhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }
    );
    return {
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      body: await res.text(),
    };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("stripe webhook route", () => {
  it("answers 500 JSON (not the SPA HTML) when Stripe keys are missing", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await postWebhook(buildApp());
    expect(res.status).toBe(500);
    expect(res.contentType).toContain("application/json");
    expect(res.body).not.toContain("INDEX_HTML");
    expect(res.body).toContain("Webhook not configured");
  });

  it("answers 400 JSON (not the SPA HTML) on a bad signature", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_tests";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake_secret_for_tests";
    try {
      const res = await postWebhook(buildApp());
      expect(res.status).toBe(400);
      expect(res.contentType).toContain("application/json");
      expect(res.body).not.toContain("INDEX_HTML");
      expect(res.body).toContain("signature");
    } finally {
      delete process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_WEBHOOK_SECRET;
    }
  });
});
