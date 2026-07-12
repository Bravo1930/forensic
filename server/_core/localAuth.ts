import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { sdk } from "./sdk";
import { getSessionCookieOptions } from "./cookies";
import { COOKIE_NAME } from "@shared/const";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const hash = scryptSync(password, salt, 64).toString("hex");
  const storedBuf = Buffer.from(key, "hex");
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(hashBuf, storedBuf);
}

function generateOpenId(): string {
  return `email:${randomBytes(16).toString("hex")}`;
}

export async function register(opts: {
  email: string;
  password: string;
  name?: string;
  ipAddress?: string;
  userAgent?: string;
  req: any;
  res: any;
}) {
  const { email, password, name, ipAddress, userAgent, req, res } = opts;

  if (!email || !password) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Email y contraseña son requeridos",
    });
  }

  if (password.length < 6) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La contraseña debe tener al menos 6 caracteres",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "El email no es válido",
    });
  }

  const existing = await db.getUserByEmail(email);
  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "El email ya está registrado",
    });
  }

  const openId = generateOpenId();
  const passwordHash = hashPassword(password);

  await db.upsertUser({
    openId,
    name: name ?? null,
    email,
    passwordHash,
    loginMethod: "email",
    lastSignedIn: new Date(),
  });

  const user = await db.getUserByOpenId(openId);
  if (!user) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error al crear el usuario",
    });
  }

  const session = await sdk.createSession(openId, user.id, {
    name: name ?? undefined,
    userAgent,
    ipAddress,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, session.accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.cookie("app_refresh_token", session.refreshToken, {
    ...cookieOptions,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    openId: user.openId,
    role: user.role,
  };
}

export async function login(opts: {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
  req: any;
  res: any;
}) {
  const { email, password, ipAddress, userAgent, req, res } = opts;

  if (!email || !password) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Email y contraseña son requeridos",
    });
  }

  const user = await db.getUserByEmail(email);
  if (!user || !user.passwordHash) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Credenciales inválidas",
    });
  }

  const valid = verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Credenciales inválidas",
    });
  }

  await db.upsertUser({
    openId: user.openId,
    lastSignedIn: new Date(),
  });

  const session = await sdk.createSession(user.openId, user.id, {
    name: user.name ?? undefined,
    userAgent,
    ipAddress,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, session.accessToken, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000,
  });
  res.cookie("app_refresh_token", session.refreshToken, {
    ...cookieOptions,
    path: "/api/auth",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    openId: user.openId,
    role: user.role,
  };
}
