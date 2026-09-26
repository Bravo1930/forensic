import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "fs";
import { randomBytes } from "crypto";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { tmpdir } from "os";
import { join } from "path";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

// End-to-end: upload → encrypted on disk → authenticated GET decrypts it.
// Real SQLite + real migrations + real local storage; only AI calls are mocked.
const dir = mkdtempSync(join(tmpdir(), "forensic-files-"));
const posix = (p: string) => p.replace(/\\/g, "/");
process.env.DATABASE_URL = `file:${posix(join(dir, "test.db"))}`;
process.env.JWT_SECRET ??= "test-secret-for-vitest-only-0123456789";
process.env.EVIDENCE_ENCRYPTION_KEY = randomBytes(32).toString("hex");
process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_UPLOAD_DIR = posix(join(dir, "uploads"));
process.env.DISABLE_RATE_LIMIT = "true";

vi.mock("./forensicAI", async importOriginal => ({
  ...(await importOriginal<typeof import("./forensicAI")>()),
  extractFileMetadata: vi.fn(async () => ({})),
}));

const analyzeImageForensics = vi.fn(async (..._args: unknown[]) => ({
  ocrText: "",
}));
vi.mock("./imageAnalysis", async importOriginal => ({
  ...(await importOriginal<typeof import("./imageAnalysis")>()),
  analyzeImageForensics: (...args: unknown[]) => analyzeImageForensics(...args),
  extractExifFromBase64: vi.fn(async () => ({})),
}));

const compareImagesForensically = vi.fn(async (..._args: unknown[]) => ({
  manipulationLikelihood: "ninguna",
  differences: [],
  executiveSummary: "",
}));
vi.mock("./imageComparison", async importOriginal => ({
  ...(await importOriginal<typeof import("./imageComparison")>()),
  compareImagesForensically: (...args: unknown[]) =>
    compareImagesForensically(...args),
}));

const db = await import("./db");
const { appRouter } = await import("./routers");
const { default: filesRouter } = await import("./routes/files");
const { validateEnvironment, parseEvidenceKey } = await import("./_core/env");
const { encryptBuffer, decryptBuffer } = await import("./_core/encryption");
const { AI_REVIEW_DISCLAIMER } = await import("../shared/const");

// 1x1 transparent PNG
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

function context(cookieJar: Record<string, string> = {}) {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: { "user-agent": "vitest" },
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string) => {
        cookieJar[name] = value;
      },
      clearCookie: () => {},
    } as unknown as TrpcContext["res"],
  };
  return ctx;
}

async function signUp(email: string) {
  const jar: Record<string, string> = {};
  const user = await appRouter
    .createCaller(context(jar))
    .auth.register({ email, password: "Secret123!" });
  const full = (await db.getUserByEmail(email))!;
  return {
    user,
    cookie: `app_session_id=${jar.app_session_id}`,
    caller: appRouter.createCaller({ ...context(), user: full }),
  };
}

let server: Server;
let base: string;

function get(path: string, cookie?: string) {
  return fetch(`${base}${path}`, { headers: cookie ? { cookie } : {} });
}

beforeAll(async () => {
  await db.runMigrations();
  const app = express();
  app.use("/api", filesRouter);
  server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server?.close();
  (await db.getDbClient())?.close();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Windows can keep the SQLite file locked briefly; temp dir is harmless
  }
});

describe("maps.config", () => {
  it("no longer exists, so the Forge API key can't reach any browser", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures.some(p => p.startsWith("maps."))).toBe(false);
  });
});

describe("environment secrets", () => {
  it("refuses to start without JWT_SECRET", () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(() => validateEnvironment()).toThrow(/JWT_SECRET/);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });

  it("refuses to start without a valid EVIDENCE_ENCRYPTION_KEY", () => {
    const saved = process.env.EVIDENCE_ENCRYPTION_KEY;
    try {
      delete process.env.EVIDENCE_ENCRYPTION_KEY;
      expect(() => validateEnvironment()).toThrow(/EVIDENCE_ENCRYPTION_KEY/);
      process.env.EVIDENCE_ENCRYPTION_KEY = "too-short";
      expect(() => validateEnvironment()).toThrow(/EVIDENCE_ENCRYPTION_KEY/);
    } finally {
      process.env.EVIDENCE_ENCRYPTION_KEY = saved;
    }
    expect(() => validateEnvironment()).not.toThrow();
  });

  it("accepts 32-byte keys as hex or base64 only", () => {
    const bytes = randomBytes(32);
    expect(parseEvidenceKey(bytes.toString("hex"))).toEqual(bytes);
    expect(parseEvidenceKey(bytes.toString("base64"))).toEqual(bytes);
    expect(parseEvidenceKey(randomBytes(16).toString("base64"))).toBeNull();
    expect(parseEvidenceKey("")).toBeNull();
  });

  it("encrypts evidence with EVIDENCE_ENCRYPTION_KEY, not JWT_SECRET", () => {
    const ciphertext = encryptBuffer(Buffer.from("evidencia"));
    const saved = process.env.EVIDENCE_ENCRYPTION_KEY;
    try {
      process.env.EVIDENCE_ENCRYPTION_KEY = randomBytes(32).toString("hex");
      expect(decryptBuffer(ciphertext)).toBeNull();
    } finally {
      process.env.EVIDENCE_ENCRYPTION_KEY = saved;
    }
    expect(decryptBuffer(ciphertext)?.toString()).toBe("evidencia");
  });
});

describe("evidence upload → encrypted storage → authenticated download", () => {
  let owner: Awaited<ReturnType<typeof signUp>>;
  let other: Awaited<ReturnType<typeof signUp>>;
  let caseId: number;
  let imageId: number;
  let gifId: number;

  beforeAll(async () => {
    owner = await signUp("owner@example.com");
    other = await signUp("other@example.com");
    caseId = await owner.caller.cases.create({ title: "Caso de prueba" });
  });

  it("returns 503 with a clear message when no storage is configured", async () => {
    const saved = process.env.STORAGE_DRIVER;
    delete process.env.STORAGE_DRIVER; // NODE_ENV=test, no Forge credentials
    try {
      await expect(
        owner.caller.evidence.upload({
          caseId,
          filename: "x.txt",
          mimeType: "text/plain",
          sizeBytes: 1,
          base64Data: "eA==",
        })
      ).rejects.toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: expect.stringContaining("almacenamiento"),
      });
    } finally {
      process.env.STORAGE_DRIVER = saved;
    }
  });

  it("stores the upload encrypted and points s3Url at the authenticated route", async () => {
    const res = await owner.caller.evidence.upload({
      caseId,
      filename: "foto evidencia.png",
      mimeType: "image/png",
      sizeBytes: PNG.length,
      base64Data: PNG.toString("base64"),
    });
    imageId = res.id;
    expect(res.s3Url).toBe(`/api/evidence/${imageId}/file`);

    const row = await db.getEvidenceById(imageId, owner.user.id);
    expect(row?.s3Url).toBe(res.s3Url);
    expect(row?.s3Key).toMatch(/\/\.enc_foto_evidencia\.png-/);

    // On disk: exists under the stored key and is not the plaintext
    const onDisk = readFileSync(join(process.env.LOCAL_UPLOAD_DIR!, row!.s3Key!));
    expect(onDisk.equals(PNG)).toBe(false);
    expect(onDisk.includes(PNG.subarray(0, 8))).toBe(false);
  });

  it("serves the decrypted file inline to its owner", async () => {
    const res = await get(`/api/evidence/${imageId}/file`, owner.cookie);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("content-disposition")).toMatch(/^inline;/);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);
  });

  it("forces a download with ?download=1", async () => {
    const res = await get(`/api/evidence/${imageId}/file?download=1`, owner.cookie);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(
      /^attachment; filename="foto evidencia\.png"/
    );
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);
  });

  it("never renders uploaded HTML inline", async () => {
    const html = Buffer.from("<script>alert(1)</script>");
    const { id } = await owner.caller.evidence.upload({
      caseId,
      filename: "page.html",
      mimeType: "text/html",
      sizeBytes: html.length,
      base64Data: html.toString("base64"),
    });
    const res = await get(`/api/evidence/${id}/file`, owner.cookie);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment;/);
    expect(res.headers.get("content-security-policy")).toMatch(/sandbox/);
  });

  it("rejects anonymous (401), other users (404) and bad ids (400)", async () => {
    expect((await get(`/api/evidence/${imageId}/file`)).status).toBe(401);
    expect((await get(`/api/evidence/${imageId}/file`, other.cookie)).status).toBe(404);
    expect((await get(`/api/evidence/999999/file`, owner.cookie)).status).toBe(404);
    expect((await get(`/api/evidence/abc/file`, owner.cookie)).status).toBe(400);
  });

  it("analyzeImage reads the decrypted bytes from storage", async () => {
    analyzeImageForensics.mockClear();
    // The stub returns a minimal result, so the summary step after the call
    // may throw; what matters is the bytes handed to the analyzer.
    await owner.caller.evidence
      .analyzeImage({ evidenceId: imageId })
      .catch(() => {});
    const imageUrl = analyzeImageForensics.mock.calls.at(-1)?.[0];
    expect(imageUrl).toBe(`data:image/png;base64,${PNG.toString("base64")}`);
  });

  it("image comparison sends decrypted bytes to the LLM, not the auth-only URL", async () => {
    const GIF = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    const b = await owner.caller.evidence.upload({
      caseId,
      filename: "b.gif",
      mimeType: "image/gif",
      sizeBytes: GIF.length,
      base64Data: GIF.toString("base64"),
    });

    gifId = b.id;
    compareImagesForensically.mockClear();
    await owner.caller.comparison.compare({
      caseId,
      evidenceAId: imageId,
      evidenceBId: b.id,
    });
    await vi.waitFor(() => expect(compareImagesForensically).toHaveBeenCalled());

    const args = compareImagesForensically.mock.calls[0][0] as Record<string, string>;
    expect(args.imageAUrl).toBe(`data:image/png;base64,${PNG.toString("base64")}`);
    expect(args.imageBUrl).toBe(`data:image/gif;base64,${GIF.toString("base64")}`);
  });

  it("a critical finding completes even when owner notifications aren't configured", async () => {
    compareImagesForensically.mockResolvedValueOnce({
      manipulationLikelihood: "critica",
      differences: [],
      executiveSummary: "Monto alterado",
    });
    const { id } = await owner.caller.comparison.compare({
      caseId,
      evidenceAId: imageId,
      evidenceBId: gifId,
    });
    const sdb = (await db.getScopedDb(owner.user.id))!;
    await vi.waitFor(async () => {
      const [row] = await sdb.comparisons.selectById(id);
      expect(row.status).not.toBe("procesando");
    });
    const [row] = await sdb.comparisons.selectById(id);
    expect(row.errorMessage ?? null).toBeNull();
    expect(row.status).toBe("completado");
    expect(row.manipulationLikelihood).toBe("critica");
  });

  it("deleting evidence also deletes its stored file", async () => {
    const { id } = await owner.caller.evidence.upload({
      caseId,
      filename: "to-delete.png",
      mimeType: "image/png",
      sizeBytes: PNG.length,
      base64Data: PNG.toString("base64"),
    });
    const key = (await db.getEvidenceById(id, owner.user.id))!.s3Key!;
    const onDisk = join(process.env.LOCAL_UPLOAD_DIR!, key);
    expect(existsSync(onDisk)).toBe(true);

    await owner.caller.evidence.delete({ id });

    expect(existsSync(onDisk)).toBe(false);
    expect(await db.getEvidenceById(id, owner.user.id)).toBeNull();
    expect((await get(`/api/evidence/${id}/file`, owner.cookie)).status).toBe(404);
  });

  it("another user cannot delete (or remove the file of) someone else's evidence", async () => {
    const key = (await db.getEvidenceById(imageId, owner.user.id))!.s3Key!;
    await other.caller.evidence.delete({ id: imageId });
    expect(existsSync(join(process.env.LOCAL_UPLOAD_DIR!, key))).toBe(true);
    expect(await db.getEvidenceById(imageId, owner.user.id)).not.toBeNull();
  });

  it("marks comparisons interrupted by a restart as failed", async () => {
    const sdb = (await db.getScopedDb(owner.user.id))!;
    const [{ id }] = await sdb.comparisons.insert({
      caseId,
      evidenceAId: imageId,
      evidenceBId: imageId,
      status: "procesando",
      manipulationLikelihood: "ninguna",
      differenceCount: 0,
    });

    expect(await db.failInterruptedComparisons()).toBeGreaterThanOrEqual(1);

    const [row] = await sdb.comparisons.selectById(id);
    expect(row.status).toBe("error");
    expect(row.errorMessage).toBe(db.INTERRUPTED_COMPARISON_MSG);
  });

  it("generated reports carry the AI-review disclaimer, readable after decryption", async () => {
    const analysisId = await db.createAnalysis({
      caseId,
      userId: owner.user.id,
      type: "completo",
      title: "Análisis de prueba",
      status: "completado",
      executiveSummary: "Resumen de prueba",
      expertOpinion: "Opinión de prueba",
    });
    const report = await owner.caller.reports.generate({ caseId, analysisId });

    const res = await get(report.url, owner.cookie);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(AI_REVIEW_DISCLAIMER);
    // Before any AI content, not buried at the end
    expect(html.indexOf(AI_REVIEW_DISCLAIMER)).toBeLessThan(
      html.indexOf("Opinión de prueba")
    );
  });

  it("keeps every stored file encrypted (no plaintext files on disk)", () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap(f => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : [f];
      });
    const files = walk(process.env.LOCAL_UPLOAD_DIR!);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(f => f.startsWith(".enc_"))).toBe(true);
  });
});
