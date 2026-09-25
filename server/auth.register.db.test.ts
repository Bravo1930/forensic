import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";

// Real SQLite database with the real migrations: guards against register()
// "succeeding" without actually persisting the user or its password hash.
const dir = mkdtempSync(join(tmpdir(), "forensic-auth-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db").replace(/\\/g, "/")}`;
process.env.JWT_SECRET ??= "test-secret-for-vitest-only-0123456789";

const db = await import("./db");
const { appRouter } = await import("./routers");

function createPublicContext() {
  const cookies: string[] = [];
  const values: Record<string, string> = {};
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: { "user-agent": "vitest" },
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => {
        cookies.push(name);
        values[name] = value;
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
  return { ctx, cookies, values };
}

describe("register → login against a real database", () => {
  beforeAll(async () => {
    if (!(await db.getDb())) throw new Error("test database did not open");
    await db.runMigrations();
  });

  afterAll(async () => {
    (await db.getDbClient())?.close();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Windows can keep the SQLite file locked briefly; temp dir is harmless
    }
  });

  const email = "bravoanzaldojavier191@gmail.com";
  const password = "Secret123!";

  it("persists the new user with a password hash", async () => {
    const { ctx, cookies } = createPublicContext();
    const user = await appRouter
      .createCaller(ctx)
      .auth.register({ email, password, name: "Javier" });

    expect(user).toMatchObject({ email, name: "Javier" });
    expect(cookies).toContain("app_refresh_token");

    const stored = await db.getUserByEmail(email);
    expect(stored?.passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("can log in with the registered credentials", async () => {
    const { ctx } = createPublicContext();
    const user = await appRouter
      .createCaller(ctx)
      .auth.login({ email, password });
    expect(user.email).toBe(email);
  });

  it("authenticates later requests with the session cookie, even without a name", async () => {
    const { ctx, values } = createPublicContext();
    await appRouter.createCaller(ctx).auth.login({ email, password });

    const { sdk } = await import("./_core/sdk");
    const nameless = "noname@example.com";
    const reg = createPublicContext();
    await appRouter
      .createCaller(reg.ctx)
      .auth.register({ email: nameless, password });

    for (const cookie of [values.app_session_id, reg.values.app_session_id]) {
      const user = await sdk.authenticateRequest({
        headers: { cookie: `app_session_id=${cookie}` },
      } as any);
      expect(user.email).toMatch(/@/);
    }
  });

  it("rejects a wrong password", async () => {
    const { ctx } = createPublicContext();
    await expect(
      appRouter.createCaller(ctx).auth.login({ email, password: "wrong-pass" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
