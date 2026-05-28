import { COOKIE_NAME } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

export const REFRESH_COOKIE_NAME = "app_refresh_token";

const ONE_DAY_S = 24 * 60 * 60; // 24h for access token cookie
const THIRTY_DAYS_S = 30 * 24 * 60 * 60; // 30d for refresh token cookie

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function redactToken(token: string): string {
  if (token.length <= 12) return "****";
  return token.slice(0, 6) + "****" + token.slice(-4);
}

export function registerOAuthRoutes(app: Express) {
  // ── OAuth callback (login) ───────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      // Resolve local userId for session tracking
      const user = await db.getUserByOpenId(userInfo.openId);
      if (!user) {
        res.status(500).json({ error: "Failed to resolve user" });
        return;
      }

      // Create session with 24h access token + 30d refresh token
      const { accessToken, refreshToken } = await sdk.createSession(
        userInfo.openId,
        user.id,
        {
          name: userInfo.name || "",
          userAgent: req.headers["user-agent"] as string | undefined,
          ipAddress: req.ip || req.socket.remoteAddress || "unknown",
        }
      );

      const cookieOptions = getSessionCookieOptions(req);

      // Access token: short-lived (24h)
      res.cookie(COOKIE_NAME, accessToken, {
        ...cookieOptions,
        maxAge: ONE_DAY_S * 1000,
      });

      // Refresh token: long-lived (30d), httpOnly, sameSite=strict
      res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
        ...cookieOptions,
        maxAge: THIRTY_DAYS_S * 1000,
        path: "/api/auth",
      });

      console.log(
        `[OAuth] Login success: ${userInfo.openId} (token ${redactToken(accessToken)})`
      );

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ── Token refresh ────────────────────────────────────────────────────
  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      res.status(401).json({ error: "No refresh token provided" });
      return;
    }

    try {
      const result = await sdk.rotateSession(refreshToken, {
        userAgent: req.headers["user-agent"] as string | undefined,
        ipAddress: req.ip || req.socket.remoteAddress || "unknown",
      });

      if (!result) {
        // Clear stale cookies
        res.clearCookie(COOKIE_NAME, { path: "/" });
        res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
        res.status(401).json({ error: "Invalid or expired refresh token" });
        return;
      }

      const cookieOptions = getSessionCookieOptions(req);

      res.cookie(COOKIE_NAME, result.accessToken, {
        ...cookieOptions,
        maxAge: ONE_DAY_S * 1000,
      });

      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
        ...cookieOptions,
        maxAge: THIRTY_DAYS_S * 1000,
        path: "/api/auth",
      });

      console.log(
        `[Auth] Token refreshed (new token ${redactToken(result.accessToken)})`
      );

      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Refresh failed", error);
      res.status(500).json({ error: "Token refresh failed" });
    }
  });

  // ── Logout (revoke all sessions) ─────────────────────────────────────
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);

    try {
      // Revoke session if we can identify the user
      const user = await sdk.authenticateRequest(req).catch(() => null);
      if (user) {
        await sdk.revokeAllUserSessions(user.id);
        console.log(`[Auth] All sessions revoked for user ${user.id}`);
      }
    } catch {
      // Best-effort revocation
    }

    // Clear cookies regardless
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, path: "/" });
    res.clearCookie(REFRESH_COOKIE_NAME, {
      ...cookieOptions,
      path: "/api/auth",
    });

    res.json({ success: true });
  });
}
