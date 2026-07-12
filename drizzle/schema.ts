import {
  integer,
  sqliteTable,
  text,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    openId: text("openId").notNull().unique(),
    name: text("name"),
    email: text("email").unique(),
    passwordHash: text("passwordHash"),
    loginMethod: text("loginMethod"),
    role: text("role").notNull().default("user"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`)
      .$onUpdate(() => new Date()),
    lastSignedIn: integer("lastSignedIn", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  table => ({
    emailIdx: index("users_email_idx").on(table.email),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    plan: text("plan").notNull().default("free"),
    stripeCustomerId: text("stripeCustomerId"),
    stripeSubscriptionId: text("stripeSubscriptionId"),
    stripePriceId: text("stripePriceId"),
    stripeInterval: text("stripeInterval"),
    cancelAtPeriodEnd: integer("cancelAtPeriodEnd", { mode: "boolean" })
      .notNull()
      .default(false),
    analysesUsed: integer("analysesUsed").notNull().default(0),
    analysesLimit: integer("analysesLimit").notNull().default(3),
    casesLimit: integer("casesLimit").notNull().default(3),
    storageUsedBytes: integer("storageUsedBytes").notNull().default(0),
    storageLimitBytes: integer("storageLimitBytes")
      .notNull()
      .default(524288000),
    periodStart: integer("periodStart", { mode: "timestamp" }).notNull(),
    periodEnd: integer("periodEnd", { mode: "timestamp" }).notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`)
      .$onUpdate(() => new Date()),
  },
  table => ({
    userIdIdx: index("subscriptions_user_idx").on(table.userId),
    planActiveIdx: index("subscriptions_plan_active_idx").on(
      table.plan,
      table.active
    ),
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

export const cases = sqliteTable(
  "cases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description"),
    caseNumber: text("caseNumber"),
    caseType: text("caseType").notNull(),
    jurisdiction: text("jurisdiction"),
    clientName: text("clientName"),
    opposingParty: text("opposingParty"),
    court: text("court"),
    hearingDate: integer("hearingDate", { mode: "timestamp" }),
    priority: text("priority").notNull().default("media"),
    tags: text("tags"),
    status: text("status").notNull().default("activo"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`)
      .$onUpdate(() => new Date()),
  },
  table => ({
    userIdIdx: index("cases_user_idx").on(table.userId),
    statusIdx: index("cases_status_idx").on(table.status),
    updatedAtIdx: index("cases_updated_idx").on(table.updatedAt),
  })
);

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

export const evidence = sqliteTable(
  "evidence",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("caseId")
      .notNull()
      .references(() => cases.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    originalName: text("originalName").notNull(),
    s3Key: text("s3Key").notNull(),
    s3Url: text("s3Url").notNull(),
    mimeType: text("mimeType"),
    sizeBytes: integer("sizeBytes").notNull(),
    metadata: text("metadata"),
    extractedText: text("extractedText"),
    evidenceType: text("evidenceType"),
    isKeyEvidence: integer("isKeyEvidence", { mode: "boolean" })
      .notNull()
      .default(false),
    description: text("description"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`)
      .$onUpdate(() => new Date()),
  },
  table => ({
    caseIdIdx: index("evidence_case_idx").on(table.caseId),
    userIdIdx: index("evidence_user_idx").on(table.userId),
    createdAtIdx: index("evidence_created_idx").on(table.createdAt),
  })
);

export type Evidence = typeof evidence.$inferSelect;
export type InsertEvidence = typeof evidence.$inferInsert;

export const analyses = sqliteTable(
  "analyses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("caseId")
      .notNull()
      .references(() => cases.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    title: text("title"),
    status: text("status").notNull().default("pendiente"),
    result: text("result"),
    error: text("error"),
    tokensUsed: integer("tokensUsed"),
    costUsd: real("costUsd"),
    keyFindings: text("keyFindings"),
    timelineEvents: text("timelineEvents"),
    relationshipGraph: text("relationshipGraph"),
    processingTimeMs: integer("processingTimeMs"),
    evidenceCount: integer("evidenceCount"),
    executiveSummary: text("executiveSummary"),
    expertOpinion: text("expertOpinion"),
    inconsistencies: text("inconsistencies"),
    suspiciousPatterns: text("suspiciousPatterns"),
    prosecutionTheory: text("prosecutionTheory"),
    defenseTheory: text("defenseTheory"),
    criticalAlertSent: integer("criticalAlertSent", {
      mode: "boolean",
    }).default(false),
    contradictionSummary: text("contradictionSummary"),
    factsTable: text("factsTable"),
    weakPoints: text("weakPoints"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`)
      .$onUpdate(() => new Date()),
  },
  table => ({
    userIdIdx: index("analyses_user_idx").on(table.userId),
    caseIdIdx: index("analyses_case_idx").on(table.caseId),
    statusIdx: index("analyses_status_idx").on(table.status),
  })
);

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = typeof analyses.$inferInsert;

export const reports = sqliteTable(
  "reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("caseId")
      .notNull()
      .references(() => cases.id),
    analysisId: integer("analysisId")
      .notNull()
      .references(() => analyses.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    format: text("format").notNull().default("pdf"),
    status: text("status").notNull().default("generando"),
    s3Key: text("s3Key"),
    s3Url: text("s3Url"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`)
      .$onUpdate(() => new Date()),
  },
  table => ({
    caseIdIdx: index("reports_case_idx").on(table.caseId),
    userIdIdx: index("reports_user_idx").on(table.userId),
  })
);

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

export const imageComparisons = sqliteTable(
  "image_comparisons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("caseId")
      .notNull()
      .references(() => cases.id),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    evidenceAId: integer("evidenceAId")
      .notNull()
      .references(() => evidence.id),
    evidenceBId: integer("evidenceBId")
      .notNull()
      .references(() => evidence.id),
    resultJson: text("resultJson"),
    similarityScore: real("similarityScore"),
    manipulationLikelihood: text("manipulationLikelihood"),
    differenceCount: integer("differenceCount"),
    errorMessage: text("errorMessage"),
    status: text("status").notNull().default("pendiente"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`)
      .$onUpdate(() => new Date()),
  },
  table => ({
    caseIdIdx: index("image_comparisons_case_idx").on(table.caseId),
    userIdIdx: index("image_comparisons_user_idx").on(table.userId),
  })
);

export type ImageComparison = typeof imageComparisons.$inferSelect;
export type InsertImageComparison = typeof imageComparisons.$inferInsert;

export const stripeEvents = sqliteTable(
  "stripe_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    stripeEventId: text("stripeEventId").notNull().unique(),
    eventType: text("eventType").notNull(),
    type: text("type").notNull(),
    processed: integer("processed", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  table => ({
    processedIdx: index("stripe_events_processed_idx").on(table.processed),
  })
);

export type StripeEvent = typeof stripeEvents.$inferSelect;
export type InsertStripeEvent = typeof stripeEvents.$inferInsert;

export const sessions = sqliteTable(
  "sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id),
    refreshToken: text("refreshToken").notNull().unique(),
    jti: text("jti").notNull().unique(),
    userAgent: text("userAgent"),
    ipAddress: text("ipAddress"),
    issuedAt: integer("issuedAt", { mode: "timestamp" }).notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    revokedAt: integer("revokedAt", { mode: "timestamp" }),
    rotatedByToken: text("rotatedByToken"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .default(sql`(strftime('%s', 'now'))`),
  },
  table => ({
    userIdIdx: index("sessions_user_idx").on(table.userId),
    refreshTokenIdx: index("sessions_refresh_token_idx").on(table.refreshToken),
    jtiIdx: index("sessions_jti_idx").on(table.jti),
  })
);

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;
