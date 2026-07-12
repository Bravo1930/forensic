import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  ensureSubscription: vi.fn(),
  getSubscription: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    plan: "free",
    analysesUsed: 0,
    analysesLimit: 3,
    casesLimit: 5,
    storageUsedBytes: 0,
    storageLimitBytes: 524288000,
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  incrementAnalysesUsed: vi.fn(),
  updateStorageUsed: vi.fn(),
  upgradePlan: vi.fn().mockResolvedValue(undefined),
  createCase: vi.fn().mockResolvedValue({ id: 1 }),
  getCasesByUser: vi.fn().mockResolvedValue([]),
  getCaseById: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    title: "Caso de prueba",
    caseType: "civil",
    status: "activo",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateCase: vi.fn().mockResolvedValue(undefined),
  deleteCase: vi.fn().mockResolvedValue(undefined),
  countCasesByUser: vi.fn().mockResolvedValue(0),
  createEvidence: vi.fn().mockResolvedValue({ id: 1 }),
  getEvidenceByCase: vi.fn().mockResolvedValue([]),
  getEvidenceById: vi.fn().mockResolvedValue(null),
  updateEvidence: vi.fn().mockResolvedValue(undefined),
  deleteEvidence: vi.fn().mockResolvedValue(undefined),
  createAnalysis: vi.fn().mockResolvedValue({ id: 1 }),
  getAllAnalysesByUser: vi.fn().mockResolvedValue([]),
  getAnalysesByCase: vi.fn().mockResolvedValue([]),
  getAnalysisById: vi.fn().mockResolvedValue(null),
  updateAnalysis: vi.fn().mockResolvedValue(undefined),
  createReport: vi.fn().mockResolvedValue({ id: 1 }),
  getReportsByCase: vi.fn().mockResolvedValue([]),
  updateReport: vi.fn().mockResolvedValue(undefined),
  getAdminStats: vi.fn().mockResolvedValue({
    totalUsers: 5,
    totalCases: 10,
    totalAnalyses: 3,
    totalEvidence: 20,
    totalReports: 2,
    premiumUsers: 1,
    enterpriseUsers: 0,
    freeUsers: 4,
    totalStorageBytes: 1024 * 1024 * 50,
  }),
}));

// Mock storage
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    url: "https://example.com/file.html",
    key: "test-key",
  }),
}));

// Mock forensicAI
vi.mock("./forensicAI", () => ({
  runForensicAnalysis: vi.fn().mockResolvedValue({
    executiveSummary: "Resumen ejecutivo de prueba",
    expertOpinion: "Dictamen pericial de prueba",
    prosecutionTheory: "Teoría de acusación",
    defenseTheory: "Teoría de defensa",
    inconsistencies: "Sin inconsistencias detectadas",
    suspiciousPatterns: "Sin patrones sospechosos",
    keyFindings: [
      {
        title: "Hallazgo 1",
        description: "Descripción",
        severity: "media",
        category: "general",
      },
    ],
    timelineEvents: [
      {
        id: "1",
        date: "2024-01-01",
        title: "Evento 1",
        description: "Desc",
        type: "evento",
        significance: "media",
      },
    ],
    relationshipGraph: { nodes: [], edges: [] },
    hasCriticalFindings: false,
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-openid",
    email: "test@example.com",
    name: "Test User",
    passwordHash: null,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth.me", () => {
  it("returns the authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@example.com");
  });

  it("returns null for unauthenticated context", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

// ─── Cases tests ──────────────────────────────────────────────────────────────
describe("cases.list", () => {
  it("returns empty list for new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cases.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });
});

describe("cases.create", () => {
  it("creates a new case successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.cases.create({
      title: "Caso de Fraude Digital",
      caseType: "civil",
      description: "Investigación de fraude electrónico",
    });
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });
});

// ─── Subscriptions tests ──────────────────────────────────────────────────────
describe("subscriptions.getMine", () => {
  it("returns the user subscription", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscriptions.getMine();
    expect(result).toBeDefined();
    expect(result.plan).toBe("free");
    expect(result.analysesLimit).toBe(3);
  });
});

describe("subscriptions.upgrade", () => {
  it("upgrades plan to premium", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscriptions.upgrade({ plan: "premium" });
    expect(result.success).toBe(true);
    expect(result.plan).toBe("premium");
  });
});

describe("subscriptions.adminStats", () => {
  it("returns stats for admin user", async () => {
    const ctx = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscriptions.adminStats();
    expect(result).toBeDefined();
    expect(result?.totalUsers).toBe(5);
    expect(result?.totalCases).toBe(10);
  });

  it("throws FORBIDDEN for non-admin user", async () => {
    const ctx = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscriptions.adminStats()).rejects.toThrow();
  });
});

// ─── Analyses tests ───────────────────────────────────────────────────────────
describe("analyses.listAll", () => {
  it("returns empty list for new user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analyses.listAll();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("analyses.listByCase", () => {
  it("returns analyses for a case", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.analyses.listByCase({ caseId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Reports tests ────────────────────────────────────────────────────────────
describe("reports.listByCase", () => {
  it("returns reports for a case", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reports.listByCase({ caseId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});
