import type { CookieOptions, Request } from "express";

/**
 * Determines if the request is over HTTPS.
 * Relies on Express's `req.protocol` which respects `trust proxy` setting.
 * In production with a reverse proxy, set TRUST_PROXY=true in .env
 * so Express reads `x-forwarded-proto` from a trusted source only.
 */
function isSecureRequest(req: Request) {
  return req.protocol === "https";
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isSecure = isSecureRequest(req);
  const isDev = process.env.NODE_ENV === "development";

  if (isDev) {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    };
  }

  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "strict" : "lax",
    secure: isSecure,
  };
}
