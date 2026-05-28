export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
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
  rateLimits: {
    free: parseInt(process.env.RATE_LIMIT_FREE ?? "30", 10),
    premium: parseInt(process.env.RATE_LIMIT_PREMIUM ?? "100", 10),
    enterprise: parseInt(process.env.RATE_LIMIT_ENTERPRISE ?? "300", 10),
  },
};
