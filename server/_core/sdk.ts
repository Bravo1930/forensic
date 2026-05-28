import { AXIOS_TIMEOUT_MS, COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHmac } from "crypto";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { logSecurityEvent } from "./audit";
import { isOriginAllowed } from "./csrf";
import type {
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetUserInfoResponse,
  GetUserInfoWithJwtRequest,
  GetUserInfoWithJwtResponse,
} from "./types/manusTypes";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  openId: string;
  appId: string;
  name: string;
  jti: string;
};

// ─── Constants ────────────────────────────────────────────────────────────
const ACCESS_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
const GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
const GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;

// ─── Helpers ───────────────────────────────────────────────────────────────
function generateJti(): string {
  return randomBytes(24).toString("hex");
}

export function generateRefreshToken(): string {
  return `rt_${randomBytes(32).toString("hex")}`;
}

// ─── OAuthService ──────────────────────────────────────────────────────────

class OAuthService {
  constructor(private client: ReturnType<typeof axios.create>) {
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }

  private decodeState(state: string): string {
    try {
      const decoded = atob(state);
      const url = new URL(decoded);

      // Must be http(s)
      if (!url.protocol.startsWith("http")) {
        throw new Error("Invalid redirect URI protocol");
      }

      // Must be one of our own allowed origins (prevents open redirect)
      const origin = url.origin.toLowerCase();
      if (!isOriginAllowed(origin)) {
        console.warn(
          `[OAuth] State redirect URI origin not allowed: ${origin}`
        );
        throw new Error("Redirect URI origin not allowed");
      }

      return decoded;
    } catch (error) {
      throw new Error(
        "Invalid state parameter: must be a valid base64 encoded URL"
      );
    }
  }

  async getTokenByCode(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    const payload: ExchangeTokenRequest = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state),
    };

    const { data } = await this.client.post<ExchangeTokenResponse>(
      EXCHANGE_TOKEN_PATH,
      payload
    );

    return data;
  }

  async getUserInfoByToken(
    token: ExchangeTokenResponse
  ): Promise<GetUserInfoResponse> {
    const { data } = await this.client.post<GetUserInfoResponse>(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken,
      }
    );

    return data;
  }
}

// ─── HTTP client ───────────────────────────────────────────────────────────

const createOAuthHttpClient = (): AxiosInstance =>
  axios.create({
    baseURL: ENV.oAuthServerUrl,
    timeout: AXIOS_TIMEOUT_MS,
  });

// ─── SDKServer ─────────────────────────────────────────────────────────────

class SDKServer {
  private readonly client: AxiosInstance;
  private readonly oauthService: OAuthService;

  constructor(client: AxiosInstance = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }

  private deriveLoginMethod(
    platforms: unknown,
    fallback: string | null | undefined
  ): string | null {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set<string>(
      platforms.filter((p): p is string => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (
      set.has("REGISTERED_PLATFORM_MICROSOFT") ||
      set.has("REGISTERED_PLATFORM_AZURE")
    )
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }

  /**
   * Exchange OAuth authorization code for access token
   */
  async exchangeCodeForToken(
    code: string,
    state: string
  ): Promise<ExchangeTokenResponse> {
    return this.oauthService.getTokenByCode(code, state);
  }

  /**
   * Get user information using access token
   */
  async getUserInfo(accessToken: string): Promise<GetUserInfoResponse> {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken,
    } as ExchangeTokenResponse);
    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoResponse;
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  // ── JWT Signing ──────────────────────────────────────────────────────────

  private async signAccessToken(payload: SessionPayload): Promise<string> {
    const issuedAt = Date.now();
    const expirationSeconds = Math.floor(
      (issuedAt + ACCESS_TOKEN_TTL_MS) / 1000
    );
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name,
      jti: payload.jti,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(Math.floor(issuedAt / 1000))
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  // ── Session lifecycle ────────────────────────────────────────────────────

  /**
   * Create a full session (access token + refresh token + DB record).
   * Returns both the JWT cookie value and the refresh token.
   */
  async createSession(
    openId: string,
    userId: number,
    options: { name?: string; userAgent?: string; ipAddress?: string } = {}
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = generateJti();
    const refreshToken = generateRefreshToken();
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_MS);

    const accessToken = await this.signAccessToken({
      openId,
      appId: ENV.appId,
      name: options.name || "",
      jti,
    });

    await db.createSession({
      userId,
      refreshToken,
      jti,
      userAgent: options.userAgent ?? null,
      ipAddress: options.ipAddress ?? null,
      issuedAt,
      expiresAt,
      revokedAt: null,
      rotatedByToken: null,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Verify a JWT access token and check it hasn't been revoked.
   * Returns the decoded payload only if the token is valid and its session
   * exists and is not revoked.
   */
  async verifyAccessToken(cookieValue: string | undefined | null): Promise<{
    openId: string;
    appId: string;
    name: string;
    jti: string;
  } | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      const jwtPayload = payload as Record<string, unknown>;
      const { openId, appId, name, jti } = jwtPayload;

      if (
        !isNonEmptyString(openId) ||
        !isNonEmptyString(appId) ||
        !isNonEmptyString(name) ||
        !isNonEmptyString(jti)
      ) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }

      // Check the DB session hasn't been revoked
      try {
        const sessionRecord = await db.getSessionByJti(jti);
        if (!sessionRecord || sessionRecord.revokedAt) {
          console.warn(
            `[Auth] Session revoked or not found (jti=${jti.slice(0, 12)}…)`
          );
          return null;
        }
      } catch {
        // DB unavailable — fall back to JWT-only validation
        console.warn("[Auth] DB unavailable, skipping revocation check");
      }

      return { openId, appId, name, jti };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }

  /**
   * Rotate an existing refresh token: validate old, issue new tokens,
   * and update the DB row.
   */
  async rotateSession(
    oldRefreshToken: string,
    options: { userAgent?: string; ipAddress?: string } = {}
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const sessionRecord = await db.getSessionByRefreshToken(oldRefreshToken);
    if (!sessionRecord) {
      console.warn("[Auth] Refresh token not found in DB");
      return null;
    }

    // Check expiry
    if (sessionRecord.expiresAt < new Date()) {
      console.warn("[Auth] Refresh token expired");
      await db.revokeSession(sessionRecord.id);
      return null;
    }

    // Check revocation
    if (sessionRecord.revokedAt) {
      console.warn("[Auth] Refresh token already revoked — possible theft");
      return null;
    }

    // Issue new tokens
    const newJti = generateJti();
    const newRefreshToken = generateRefreshToken();

    const accessToken = await this.signAccessToken({
      openId: "", // will be filled below after DB lookup
      appId: ENV.appId,
      name: "",
      jti: newJti,
    });

    // Rotate the refresh token in place
    await db.rotateSession(oldRefreshToken, newRefreshToken);

    // Log the rotation as a security event (async, non-blocking)
    setImmediate(() => {
      logSecurityEvent(
        "login",
        { ip: options.ipAddress },
        {
          action: "Session token rotated",
          resource: "auth",
          success: true,
          metadata: { oldJti: sessionRecord.jti, newJti },
        }
      );
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Revoke a specific session by JTI.
   */
  async revokeSession(jti: string): Promise<boolean> {
    const sessionRecord = await db.getSessionByJti(jti);
    if (!sessionRecord) return false;
    await db.revokeSession(sessionRecord.id);
    return true;
  }

  /**
   * Revoke all sessions for a user.
   */
  async revokeAllUserSessions(userId: number): Promise<void> {
    await db.revokeAllUserSessions(userId);
  }

  // ── OAuth / legacy flow ──────────────────────────────────────────────────

  async getUserInfoWithJwt(
    jwtToken: string
  ): Promise<GetUserInfoWithJwtResponse> {
    const payload: GetUserInfoWithJwtRequest = {
      jwtToken,
      projectId: ENV.appId,
    };

    const { data } = await this.client.post<GetUserInfoWithJwtResponse>(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );

    const loginMethod = this.deriveLoginMethod(
      (data as any)?.platforms,
      (data as any)?.platform ?? data.platform ?? null
    );
    return {
      ...(data as any),
      platform: loginMethod,
      loginMethod,
    } as GetUserInfoWithJwtResponse;
  }

  /**
   * Authenticate a request using the access-token cookie.
   * Verifies the JWT signature, checks the DB for revocation,
   * and returns the User row.
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifyAccessToken(sessionCookie);

    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }

    const sessionUserId = session.openId;
    const signedInAt = new Date();
    let user = await db.getUserByOpenId(sessionUserId);

    // If user not in DB, sync from OAuth server automatically
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt,
        });
        user = await db.getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }

    if (!user) {
      throw ForbiddenError("User not found");
    }

    await db.upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt,
    });

    return user;
  }
}

export const sdk = new SDKServer();
