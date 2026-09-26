/**
 * Parse EVIDENCE_ENCRYPTION_KEY: exactly 32 bytes, given as 64 hex chars or
 * base64. Returns null when missing or malformed.
 */
export function parseEvidenceKey(raw: string | undefined): Buffer | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex");
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    const buf = Buffer.from(value, "base64");
    if (buf.length === 32) return buf;
  }
  return null;
}

const STORAGE_DRIVERS = ["local", "forge"] as const;

export function validateEnvironment(): void {
  // Both secrets are required in every environment: there is no safe default.
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "[SECURITY] CRITICAL: JWT_SECRET environment variable is not set. " +
        "Generate one with: openssl rand -base64 48"
    );
  }
  if (!parseEvidenceKey(process.env.EVIDENCE_ENCRYPTION_KEY)) {
    throw new Error(
      "[SECURITY] CRITICAL: EVIDENCE_ENCRYPTION_KEY is missing or invalid. " +
        "It must be 32 random bytes as 64 hex chars or base64. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  const driver = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (driver && !(STORAGE_DRIVERS as readonly string[]).includes(driver)) {
    throw new Error(
      `[CONFIG] STORAGE_DRIVER="${process.env.STORAGE_DRIVER}" is invalid. Use one of: ${STORAGE_DRIVERS.join(", ")}`
    );
  }

  if (process.env.JWT_SECRET.length < 32) {
    console.error(
      "[SECURITY] WARNING: JWT_SECRET is less than 32 characters. " +
        "Use a cryptographically random value of at least 32 characters."
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY || "";
  if (geminiKey && geminiKey.startsWith("AIza")) {
    console.log("[INFO] Gemini API key detected. LLM calls will use Gemini.");
  }

  if (process.env.RATE_LIMIT_FREE) {
    const limit = parseInt(process.env.RATE_LIMIT_FREE, 10);
    if (limit <= 0) {
      console.warn(
        "[SECURITY] RATE_LIMIT_FREE is set to " +
          limit +
          ", which disables rate limiting. " +
          "Set to a positive value (e.g. 30) for production."
      );
    }
  }

  if (
    !process.env.OLLAMA_URL &&
    !geminiKey &&
    !process.env.BUILT_IN_FORGE_API_URL
  ) {
    console.warn(
      "[CONFIG] No LLM provider configured. Set OLLAMA_URL, GEMINI_API_KEY, " +
        "or BUILT_IN_FORGE_API_URL for AI features."
    );
  }
}

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  // No fallback: validateEnvironment() refuses to start without it.
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  analysisCacheTtlMinutes: parseInt(
    process.env.ANALYSIS_CACHE_TTL_MINUTES ?? "60",
    10
  ),
  // Only development assumes a local Ollama; in production an unset URL means
  // "no Ollama", not a silent localhost that doesn't exist.
  ollamaUrl:
    process.env.OLLAMA_URL ??
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:11434"),
  // Must be a vision model: evidence analysis sends images.
  ollamaModel: process.env.OLLAMA_MODEL ?? "qwen3.5:4b",
  ollamaNumCtx: parseInt(process.env.OLLAMA_NUM_CTX ?? "16384", 10),
  rateLimits: {
    free: parseInt(process.env.RATE_LIMIT_FREE ?? "30", 10),
    premium: parseInt(process.env.RATE_LIMIT_PREMIUM ?? "100", 10),
    enterprise: parseInt(process.env.RATE_LIMIT_ENTERPRISE ?? "300", 10),
  },
};
// Debug log to see what values were captured during module initialization
console.log('[ENV DEBUG] OLLAMA_URL:', process.env.OLLAMA_URL);
console.log('[ENV DEBUG] OLLAMA_MODEL:', process.env.OLLAMA_MODEL);
