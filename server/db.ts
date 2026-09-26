import { and, desc, eq, sql } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import {
  analyses,
  cases,
  evidence,
  imageComparisons,
  reports,
  sessions,
  subscriptions,
  users,
  type InsertAnalysis,
  type InsertCase,
  type InsertEvidence,
  type InsertReport,
  type InsertSession,
  type InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { createScopedDb } from "./_core/scopedDb";

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof createClient> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const dbPath = process.env.DATABASE_URL.replace("sqlite:", "").replace(
        "file:",
        ""
      );

      _client = createClient({
        url: `file:${dbPath}`,
      });

      _db = drizzle(_client);
      console.log("[Database] Connected to SQLite:", dbPath);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * Apply pending Drizzle migrations. Called once at startup so a fresh
 * database (e.g. a new Railway volume) gets its schema without manual steps.
 * Throws on failure: the server must not start against a broken schema.
 */
export async function runMigrations() {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] DATABASE_URL not set — skipping migrations (data will not be persisted)"
    );
    return;
  }
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const migrationsFolder = process.env.MIGRATIONS_DIR ?? "./drizzle";
  await migrate(db, { migrationsFolder });
  console.log(`[Database] Migrations applied from ${migrationsFolder}`);
}

export const INTERRUPTED_COMPARISON_MSG =
  "La comparación se interrumpió por un reinicio del servidor. Vuelve a ejecutarla.";

/**
 * Comparisons run in-process in the background. If the server restarted
 * (redeploy, crash) while one was running it would stay "procesando"
 * forever; call at startup to mark those as failed so users can retry.
 * Returns how many were marked.
 */
export async function failInterruptedComparisons(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .update(imageComparisons)
    .set({ status: "error", errorMessage: INTERRUPTED_COMPARISON_MSG })
    .where(eq(imageComparisons.status, "procesando"))
    .returning({ id: imageComparisons.id });
  return rows.length;
}

export async function getDbClient() {
  await getDb();
  return _client;
}

/**
 * Create a user-scoped DB client that enforces application-level RLS.
 * All queries through this client automatically filter by userId.
 */
export async function getScopedDb(userId: number) {
  const db = await getDb();
  if (!db) return null;
  return createScopedDb(db, userId);
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const existing = await getUserByOpenId(user.openId);

  const values: Partial<InsertUser> = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.openId === ENV.ownerOpenId ? "admin" : (user.role ?? "user"),
  };

  if (existing) {
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    textFields.forEach(field => {
      if (user[field] !== undefined) {
        updateSet[field] = user[field] ?? null;
      }
    });
    if (user.passwordHash !== undefined) {
      updateSet.passwordHash = user.passwordHash;
    }
    if (user.lastSignedIn !== undefined) {
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    updateSet.lastSignedIn = new Date();
    await db.update(users).set(updateSet).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      passwordHash: user.passwordHash ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.openId === ENV.ownerOpenId ? "admin" : "user",
      lastSignedIn: new Date(),
    });
  }

  const existingUser = await getUserByOpenId(user.openId);
  if (existingUser) {
    await ensureSubscription(existingUser.id);
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── Subscriptions ────────────────────────────────────────────────────────────
export async function ensureSubscription(userId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  if (existing.length === 0) {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await db.insert(subscriptions).values({
      userId,
      plan: "free",
      analysesUsed: 0,
      analysesLimit: 3,
      casesLimit: 3,
      storageUsedBytes: 0,
      storageLimitBytes: 524288000,
      periodStart: new Date(),
      periodEnd,
      active: true,
    });
  }
}

export async function getSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  await ensureSubscription(userId);
  const result = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.active, true))
    )
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function incrementAnalysesUsed(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(subscriptions)
    .set({ analysesUsed: sql`${subscriptions.analysesUsed} + 1` })
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.active, true))
    );
}

export async function updateStorageUsed(userId: number, byteDelta: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(subscriptions)
    .set({
      storageUsedBytes: sql`${subscriptions.storageUsedBytes} + ${byteDelta}`,
    })
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.active, true))
    );
}

export async function upgradePlan(
  userId: number,
  plan: "premium" | "enterprise"
) {
  const db = await getDb();
  if (!db) return;
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const limits =
    plan === "premium"
      ? { analysesLimit: 20, casesLimit: 50, storageLimitBytes: 10737418240 }
      : {
          analysesLimit: 999999,
          casesLimit: 999999,
          storageLimitBytes: 107374182400,
        };
  await db
    .update(subscriptions)
    .set({ plan, ...limits, periodEnd })
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.active, true))
    );
}

// ─── Cases ────────────────────────────────────────────────────────────────────
export async function createCase(data: InsertCase) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  try {
    console.log(
      `[createCase] title="${data.title}" type=${data.caseType} caseNumber=${data.caseNumber ?? "—"}`
    );
    const [result] = await db
      .insert(cases)
      .values(data)
      .returning({ id: cases.id });
    return result.id;
  } catch (err) {
    console.error("[createCase] Error:", err);
    throw err;
  }
}

export async function getCasesByUser(userId: number, limit = 50, offset = 0) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return [];
  return sdb.cases
    .select()
    .orderBy(desc(cases.updatedAt))
    .limit(limit)
    .offset(offset);
}

export async function getCaseById(id: number, userId: number) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return null;
  const result = await sdb.cases.selectById(id);
  return result.length > 0 ? result[0] : null;
}

export async function updateCase(
  id: number,
  userId: number,
  data: Partial<InsertCase>
) {
  const sdb = await getScopedDb(userId);
  if (!sdb) throw new Error("DB not available");
  await sdb.cases.update(id, data);
}

export async function deleteCase(id: number, userId: number) {
  const sdb = await getScopedDb(userId);
  if (!sdb) throw new Error("DB not available");
  await sdb.cases.delete(id);
}

export async function countCasesByUser(userId: number) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return 0;
  const result = await sdb.cases.countByStatus("activo");
  return result.length;
}

// ─── Evidence ─────────────────────────────────────────────────────────────────
export async function createEvidence(data: InsertEvidence) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [result] = await db
    .insert(evidence)
    .values(data)
    .returning({ id: evidence.id });
  return result.id;
}

export async function getEvidenceByCase(
  caseId: number,
  userId: number,
  limit = 50,
  offset = 0
) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return [];
  return sdb.evidence
    .select(caseId)
    .orderBy(desc(evidence.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getEvidenceById(id: number, userId: number) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return null;
  const result = await sdb.evidence.selectById(id);
  return result.length > 0 ? result[0] : null;
}

export async function updateEvidence(
  id: number,
  userId: number,
  data: Partial<InsertEvidence>
) {
  const sdb = await getScopedDb(userId);
  if (!sdb) throw new Error("DB not available");
  await sdb.evidence.update(id, data);
}

export async function deleteEvidence(id: number, userId: number) {
  const sdb = await getScopedDb(userId);
  if (!sdb) throw new Error("DB not available");
  const existing = await getEvidenceById(id, userId);
  if (existing) {
    await sdb.evidence.delete(id);
    return existing.sizeBytes;
  }
  return 0;
}

// Store image analysis results back into evidence metadata
export async function updateEvidenceImageAnalysis(
  id: number,
  userId: number,
  imageAnalysisResult: Record<string, unknown>,
  ocrText: string
) {
  const sdb = await getScopedDb(userId);
  if (!sdb) throw new Error("DB not available");
  const existing = await getEvidenceById(id, userId);
  if (!existing) throw new Error("Evidence not found");
  const existingMeta = existing.metadata ? JSON.parse(existing.metadata) : {};
  const mergedMetadata = JSON.stringify({
    ...existingMeta,
    imageAnalysis: imageAnalysisResult,
  });
  await sdb.evidence.update(id, {
    metadata: mergedMetadata,
    extractedText: ocrText || existing.extractedText,
  });
}

// ─── Analyses ─────────────────────────────────────────────────────────────────
export async function createAnalysis(data: InsertAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const { id: _id, ...insertData } = data as { id?: unknown } & typeof data;

  const [result] = await db
    .insert(analyses)
    .values(insertData)
    .returning({ id: analyses.id });

  return result.id;
}

export async function getAllAnalysesByUser(
  userId: number,
  limit = 100,
  offset = 0
) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return [];
  return sdb.analyses
    .select()
    .orderBy(desc(analyses.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getAnalysesByCase(caseId: number, userId: number) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return [];
  return sdb.analyses.select(caseId).orderBy(desc(analyses.createdAt));
}

export async function getAnalysisById(id: number, userId: number) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return null;
  const result = await sdb.analyses.selectById(id);
  return result.length > 0 ? result[0] : null;
}

export async function updateAnalysis(
  id: number,
  userId: number,
  data: Partial<InsertAnalysis>
) {
  const sdb = await getScopedDb(userId);
  if (!sdb) throw new Error("DB not available");
  await sdb.analyses.update(id, data);
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export async function createReport(data: {
  caseId: number;
  analysisId: number;
  userId: number;
  title: string;
}) {
  const sdb = await getScopedDb(data.userId);
  if (!sdb) throw new Error("DB not available");
  const [result] = await sdb.reports.insert({
    caseId: data.caseId,
    analysisId: data.analysisId,
    title: data.title,
  });
  return result.id;
}

export async function getReportsByCase(caseId: number, userId: number) {
  const sdb = await getScopedDb(userId);
  if (!sdb) return [];
  return sdb.reports.select(caseId).orderBy(desc(reports.createdAt));
}

export async function getReportById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function updateReport(
  id: number,
  userId: number,
  data: Partial<typeof reports.$inferInsert>
) {
  const sdb = await getScopedDb(userId);
  if (!sdb) throw new Error("DB not available");
  await sdb.reports.update(id, data as Partial<InsertReport>);
}

// ─── Admin stats ──────────────────────────────────────────────────────────────
export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;
  const [totalUsers] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users);
  const [totalCases] = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases);
  const [totalAnalyses] = await db
    .select({ count: sql<number>`count(*)` })
    .from(analyses);
  const [totalEvidence] = await db
    .select({ count: sql<number>`count(*)` })
    .from(evidence);
  const [totalReports] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reports);
  const premiumSubs = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.plan, "premium"), eq(subscriptions.active, true))
    );
  const enterpriseSubs = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.plan, "enterprise"), eq(subscriptions.active, true))
    );
  const [storageSum] = await db
    .select({ total: sql<number>`sum(storageUsedBytes)` })
    .from(subscriptions);
  return {
    totalUsers: totalUsers?.count ?? 0,
    totalCases: totalCases?.count ?? 0,
    totalAnalyses: totalAnalyses?.count ?? 0,
    totalEvidence: totalEvidence?.count ?? 0,
    totalReports: totalReports?.count ?? 0,
    premiumUsers: premiumSubs[0]?.count ?? 0,
    enterpriseUsers: enterpriseSubs[0]?.count ?? 0,
    freeUsers: Math.max(
      0,
      (totalUsers?.count ?? 0) -
        (premiumSubs[0]?.count ?? 0) -
        (enterpriseSubs[0]?.count ?? 0)
    ),
    totalStorageBytes: storageSum?.total ?? 0,
  };
}

// ─── Sessions ─────────────────────────────────────────────────────────────
export async function createSession(data: InsertSession): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(sessions).values(data);
}

export async function getSessionByRefreshToken(
  refreshToken: string
): Promise<typeof sessions.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.refreshToken, refreshToken))
    .limit(1);
  return result ?? null;
}

export async function getSessionByJti(
  jti: string
): Promise<typeof sessions.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.jti, jti))
    .limit(1);
  return result ?? null;
}

export async function revokeSession(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.id, id));
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), sql`revokedAt IS NULL`));
}

export async function rotateSession(
  oldRefreshToken: string,
  newRefreshToken: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(sessions)
    .set({
      refreshToken: newRefreshToken,
      rotatedByToken: oldRefreshToken,
    })
    .where(eq(sessions.refreshToken, oldRefreshToken));
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .delete(sessions)
    .where(sql`expiresAt < strftime('%s', 'now')`);
  return (result as any)?.rowsAffected ?? 0;
}

// Cleanup expired sessions every hour
setInterval(
  () => {
    cleanupExpiredSessions().catch(() => {});
  },
  60 * 60 * 1000
);
