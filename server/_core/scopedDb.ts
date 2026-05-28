import { and, eq } from "drizzle-orm";
import {
  analyses,
  cases,
  evidence,
  imageComparisons,
  reports,
  subscriptions,
  type InsertAnalysis,
  type InsertCase,
  type InsertEvidence,
  type InsertImageComparison,
  type InsertReport,
} from "../../drizzle/schema";

type DbClient = ReturnType<typeof import("drizzle-orm/libsql").drizzle>;

export function createScopedDb(db: DbClient, userId: number) {
  return {
    // ─── Cases ───────────────────────────────────────────────────────
    cases: {
      select: () => db.select().from(cases).where(eq(cases.userId, userId)),

      selectById: (id: number) =>
        db
          .select()
          .from(cases)
          .where(and(eq(cases.id, id), eq(cases.userId, userId)))
          .limit(1),

      insert: (data: Omit<InsertCase, "userId">) =>
        db
          .insert(cases)
          .values({ ...data, userId })
          .returning({ id: cases.id }),

      update: (id: number, data: Partial<InsertCase>) =>
        db
          .update(cases)
          .set(data)
          .where(and(eq(cases.id, id), eq(cases.userId, userId))),

      delete: (id: number) =>
        db.delete(cases).where(and(eq(cases.id, id), eq(cases.userId, userId))),

      countByStatus: (status: string) =>
        db
          .select()
          .from(cases)
          .where(and(eq(cases.userId, userId), eq(cases.status, status))),
    },

    // ─── Evidence ────────────────────────────────────────────────────
    evidence: {
      select: (caseId?: number) => {
        const conds = [eq(evidence.userId, userId)];
        if (caseId !== undefined) conds.push(eq(evidence.caseId, caseId));
        return db
          .select()
          .from(evidence)
          .where(and(...conds));
      },

      selectById: (id: number) =>
        db
          .select()
          .from(evidence)
          .where(and(eq(evidence.id, id), eq(evidence.userId, userId)))
          .limit(1),

      insert: (data: Omit<InsertEvidence, "userId">) =>
        db
          .insert(evidence)
          .values({ ...data, userId })
          .returning({ id: evidence.id }),

      update: (id: number, data: Partial<InsertEvidence>) =>
        db
          .update(evidence)
          .set(data)
          .where(and(eq(evidence.id, id), eq(evidence.userId, userId))),

      delete: (id: number) =>
        db
          .delete(evidence)
          .where(and(eq(evidence.id, id), eq(evidence.userId, userId))),
    },

    // ─── Analyses ────────────────────────────────────────────────────
    analyses: {
      select: (caseId?: number) => {
        const conds = [eq(analyses.userId, userId)];
        if (caseId !== undefined) conds.push(eq(analyses.caseId, caseId));
        return db
          .select()
          .from(analyses)
          .where(and(...conds));
      },

      selectById: (id: number) =>
        db
          .select()
          .from(analyses)
          .where(and(eq(analyses.id, id), eq(analyses.userId, userId)))
          .limit(1),

      insert: (data: Omit<InsertAnalysis, "userId">) =>
        db
          .insert(analyses)
          .values({ ...data, userId })
          .returning({ id: analyses.id }),

      update: (id: number, data: Partial<InsertAnalysis>) =>
        db
          .update(analyses)
          .set(data)
          .where(and(eq(analyses.id, id), eq(analyses.userId, userId))),
    },

    // ─── Reports ─────────────────────────────────────────────────────
    reports: {
      select: (caseId?: number) => {
        const conds = [eq(reports.userId, userId)];
        if (caseId !== undefined) conds.push(eq(reports.caseId, caseId));
        return db
          .select()
          .from(reports)
          .where(and(...conds));
      },

      insert: (data: Omit<InsertReport, "userId">) =>
        db
          .insert(reports)
          .values({ ...data, userId })
          .returning({ id: reports.id }),

      update: (id: number, data: Partial<InsertReport>) =>
        db
          .update(reports)
          .set(data)
          .where(and(eq(reports.id, id), eq(reports.userId, userId))),
    },

    // ─── Image Comparisons ───────────────────────────────────────────
    comparisons: {
      select: (caseId?: number) => {
        const conds = [eq(imageComparisons.userId, userId)];
        if (caseId !== undefined)
          conds.push(eq(imageComparisons.caseId, caseId));
        return db
          .select()
          .from(imageComparisons)
          .where(and(...conds));
      },

      selectById: (id: number) =>
        db
          .select()
          .from(imageComparisons)
          .where(
            and(
              eq(imageComparisons.id, id),
              eq(imageComparisons.userId, userId)
            )
          )
          .limit(1),

      insert: (data: Omit<InsertImageComparison, "userId">) =>
        db
          .insert(imageComparisons)
          .values({ ...data, userId })
          .returning({ id: imageComparisons.id }),

      update: (id: number, data: Partial<InsertImageComparison>) =>
        db
          .update(imageComparisons)
          .set(data)
          .where(
            and(
              eq(imageComparisons.id, id),
              eq(imageComparisons.userId, userId)
            )
          ),

      delete: (id: number) =>
        db
          .delete(imageComparisons)
          .where(
            and(
              eq(imageComparisons.id, id),
              eq(imageComparisons.userId, userId)
            )
          ),
    },

    // ─── Subscriptions (read-only, always single-user) ───────────────
    subscriptions: {
      selectActive: () =>
        db
          .select()
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.userId, userId),
              eq(subscriptions.active, true)
            )
          )
          .limit(1),
    },
  };
}

export type ScopedDb = ReturnType<typeof createScopedDb>;
