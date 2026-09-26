import { Router, type Request, type Response } from "express";
import { sdk } from "../_core/sdk";
import { strictRateLimit } from "../_core/rateLimit";
import { getEvidenceById, getReportById } from "../db";
import { getStorageDriver, storageRead, STORAGE_NOT_CONFIGURED_MSG } from "../storage";
import type { User } from "../../drizzle/schema";

/**
 * Authenticated, decrypting file downloads.
 *
 *   GET /api/evidence/:id/file[?download=1]
 *   GET /api/reports/:id/file[?download=1]
 *
 * Files are encrypted at rest, so this is the only way clients get their
 * contents. Ownership is enforced by the user-scoped lookups: another user's
 * id is indistinguishable from a missing one (404, never 403).
 */
const router = Router();

// A case page loads one request per evidence thumbnail, so this gets its own
// budget instead of sharing the general /api limit.
const fileRateLimit = strictRateLimit(120, 60 * 1000);

// Types a browser may render inline. Everything else (HTML, SVG, unknown)
// is forced to download so user-uploaded content can never run as our origin.
const INLINE_SAFE = [
  /^image\/(png|jpe?g|gif|webp|bmp|tiff)$/,
  /^application\/pdf$/,
  /^text\/plain$/,
  /^audio\//,
  /^video\//,
];

function contentDisposition(filename: string, inline: boolean): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const type = inline ? "inline" : "attachment";
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function authenticate(req: Request, res: Response): Promise<User | null> {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    res.status(401).json({ error: "No autenticado" });
    return null;
  }
}

function parseId(req: Request, res: Response): number | null {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "ID inválido" });
    return null;
  }
  return id;
}

async function sendStoredFile(
  req: Request,
  res: Response,
  file: { key: string; filename: string; mimeType: string; inlineOk: boolean }
) {
  if (!getStorageDriver()) {
    res.status(503).json({ error: STORAGE_NOT_CONFIGURED_MSG });
    return;
  }

  let data: Buffer;
  try {
    data = await storageRead(file.key);
  } catch (err) {
    console.error(`[Files] Could not read ${file.key}:`, err);
    res.status(500).json({ error: "No se pudo leer el archivo" });
    return;
  }

  const inline = file.inlineOk && req.query.download !== "1";
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Length", data.length);
  res.setHeader("Content-Disposition", contentDisposition(file.filename, inline));
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Even if a browser renders something unexpected, it can't run scripts
  res.setHeader(
    "Content-Security-Policy",
    "sandbox; default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; media-src 'self'"
  );
  res.end(data);
}

router.get("/evidence/:id/file", fileRateLimit, async (req, res) => {
  const user = await authenticate(req, res);
  if (!user) return;
  const id = parseId(req, res);
  if (!id) return;

  const item = await getEvidenceById(id, user.id);
  if (!item || !item.s3Key) {
    res.status(404).json({ error: "Evidencia no encontrada" });
    return;
  }

  const mimeType = item.mimeType || "application/octet-stream";
  await sendStoredFile(req, res, {
    key: item.s3Key,
    filename: item.originalName,
    mimeType,
    inlineOk: INLINE_SAFE.some(re => re.test(mimeType)),
  });
});

router.get("/reports/:id/file", fileRateLimit, async (req, res) => {
  const user = await authenticate(req, res);
  if (!user) return;
  const id = parseId(req, res);
  if (!id) return;

  const report = await getReportById(id, user.id);
  if (!report || !report.s3Key) {
    res.status(404).json({ error: "Reporte no encontrado" });
    return;
  }

  // Our own generated HTML (all values escaped); the sandbox CSP above
  // still blocks scripts when it is viewed inline.
  await sendStoredFile(req, res, {
    key: report.s3Key,
    filename: `${report.title || "reporte"}.html`,
    mimeType: "text/html; charset=utf-8",
    inlineOk: true,
  });
});

export default router;
