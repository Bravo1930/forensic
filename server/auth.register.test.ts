import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => {
  const users = new Map<string, any>();
  return {
    getUserByEmail: vi.fn(async (email: string) =>
      Array.from(users.values()).find(u => u.email === email)
    ),
    upsertUser: vi.fn(async (u: any) => {
      users.set(u.openId, { id: users.size + 1, role: "user", ...u });
    }),
    getUserByOpenId: vi.fn(async (openId: string) => users.get(openId)),
  };
});

vi.mock("./_core/sdk", () => ({
  sdk: {
    createSession: vi.fn(async () => ({
      accessToken: "access-token",
      refreshToken: "refresh-token",
    })),
  },
}));

const { appRouter } = await import("./routers");
const { corsMiddleware } = await import("./_core/cors");
const { csrfProtection } = await import("./_core/csrf");

const APP_ORIGIN = "https://forensic-production-8b9c.up.railway.app";

function createPublicContext() {
  const cookies: string[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: { "user-agent": "vitest" },
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      cookie: (name: string) => cookies.push(name),
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx, cookies };
}

function runMiddleware(
  mw: typeof corsMiddleware,
  origin: string | undefined
): { status: number | null; nextCalled: boolean } {
  let status: number | null = null;
  let nextCalled = false;
  const req = {
    method: "POST",
    headers: origin ? { origin } : {},
  } as unknown as Request;
  const res = {
    setHeader: () => {},
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
    end() {
      return this;
    },
  } as unknown as Response;
  mw(req, res, () => {
    nextCalled = true;
  });
  return { status, nextCalled };
}

describe("origin checks on /api (production)", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.ALLOWED_ORIGIN;
    delete process.env.RAILWAY_PUBLIC_DOMAIN;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("allows the app's own Railway domain even without ALLOWED_ORIGINS", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "forensic-production-8b9c.up.railway.app";
    for (const mw of [corsMiddleware, csrfProtection]) {
      expect(runMiddleware(mw, APP_ORIGIN)).toEqual({
        status: null,
        nextCalled: true,
      });
    }
  });

  it("tolerates a trailing slash in ALLOWED_ORIGINS", () => {
    process.env.ALLOWED_ORIGINS = `${APP_ORIGIN}/`;
    expect(runMiddleware(csrfProtection, APP_ORIGIN).nextCalled).toBe(true);
    expect(runMiddleware(corsMiddleware, APP_ORIGIN).nextCalled).toBe(true);
  });

  it("still blocks foreign origins with 403", () => {
    process.env.RAILWAY_PUBLIC_DOMAIN = "forensic-production-8b9c.up.railway.app";
    expect(runMiddleware(corsMiddleware, "https://evil.example.com").status).toBe(403);
    expect(runMiddleware(csrfProtection, "https://evil.example.com").status).toBe(403);
  });
});

describe("auth.register", () => {
  it("rejects an email with extra characters after the TLD", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.register({
        email: "bravoanzaldojavier191@gmail.com1",
        password: "secret123",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("registers a valid email end-to-end and sets session cookies", async () => {
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.register({
      email: "bravoanzaldojavier191@gmail.com",
      password: "secret123",
      name: "Javier",
    });
    expect(user).toMatchObject({
      email: "bravoanzaldojavier191@gmail.com",
      name: "Javier",
      role: "user",
    });
    expect(cookies).toContain("app_refresh_token");
    expect(cookies.length).toBe(2);
  });

  it("rejects a duplicate email with CONFLICT", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.register({
        email: "bravoanzaldojavier191@gmail.com",
        password: "secret123",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
