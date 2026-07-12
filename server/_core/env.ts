export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === "production";

  if (!process.env.JWT_SECRET) {
    const msg =
      "[SECURITY] CRITICAL: JWT_SECRET environment variable is not set. " +
      "Generate one with: openssl rand -base64 48";
    if (isProduction) throw new Error(msg);
    console.error(msg);
  } else if (process.env.JWT_SECRET.length < 32) {
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
  cookieSecret: process.env.JWT_SECRET ?? "insecure-default-change-me",
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
  ollamaUrl: process.env.OLLAMA_URL ?? "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.2:1b",
  rateLimits: {
    free: parseInt(process.env.RATE_LIMIT_FREE ?? "30", 10),
    premium: parseInt(process.env.RATE_LIMIT_PREMIUM ?? "100", 10),
    enterprise: parseInt(process.env.RATE_LIMIT_ENTERPRISE ?? "300", 10),
  },
};
