// Storage helpers with two drivers:
//   - "local": files on disk under LOCAL_UPLOAD_DIR (a Railway volume in production)
//   - "forge": the Manus Forge storage proxy (BUILT_IN_FORGE_API_URL/_KEY)
// Evidence files are encrypted at rest using AES-256-GCM and are only ever
// served decrypted through authenticated routes (see routes/files.ts).

import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import {
  encryptBuffer,
  decryptBuffer,
  isEncryptedBuffer,
} from "./_core/encryption";
import path from "path";
import fs from "fs";

const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL ?? "http://localhost:3000";

function localUploadDir(): string {
  return process.env.LOCAL_UPLOAD_DIR ?? "./uploads";
}

export type StorageDriver = "local" | "forge";

/**
 * Which storage backend to use. STORAGE_DRIVER wins when set; otherwise
 * development uses local disk and production uses Forge if configured.
 * Returns null when production has no usable storage.
 */
export function getStorageDriver(): StorageDriver | null {
  const explicit = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (explicit === "local") return "local";
  if (explicit === "forge") {
    return ENV.forgeApiUrl && ENV.forgeApiKey ? "forge" : null;
  }
  if (IS_DEV) return "local";
  if (ENV.forgeApiUrl && ENV.forgeApiKey) return "forge";
  return null;
}

export const STORAGE_NOT_CONFIGURED_MSG =
  "El almacenamiento de archivos no está configurado en el servidor. Contacta al administrador.";

/**
 * Fail fast (503) before doing any work when no storage backend is available.
 */
export function requireStorage(): StorageDriver {
  const driver = getStorageDriver();
  if (!driver) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: STORAGE_NOT_CONFIGURED_MSG,
    });
  }
  return driver;
}

function getForgeConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, "") + "/", apiKey };
}

/**
 * Sanitize a storage key to prevent path traversal attacks.
 * Removes leading slash, collapses ".." segments, and rejects
 * any key that resolves outside the storage root.
 */
function sanitizeKey(relKey: string): string {
  const normalized = path.posix.normalize(relKey).replace(/^\/+/, "");
  if (normalized.startsWith("..")) {
    throw new Error(`Path traversal detected in key: ${relKey}`);
  }
  return normalized;
}

function localPathFor(key: string): string {
  const root = path.resolve(localUploadDir());
  const full = path.resolve(root, key);
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error(`Path traversal detected in key: ${key}`);
  }
  return full;
}

// ─── Encrypted storage helpers ────────────────────────────────────────────

const ENCRYPTED_PREFIX = ".enc_";

function encryptedKey(rawKey: string): string {
  const dir = path.posix.dirname(rawKey);
  const base = path.posix.basename(rawKey);
  return dir === "."
    ? `${ENCRYPTED_PREFIX}${base}`
    : `${dir}/${ENCRYPTED_PREFIX}${base}`;
}

/** The prefix marks the file name, not the whole key (e.g. "evidence/1/.enc_x"). */
export function isEncryptedKey(key: string): boolean {
  return path.posix.basename(key).startsWith(ENCRYPTED_PREFIX);
}

/**
 * Store a file, optionally encrypting it at rest.
 * When `encrypted = true`, data is encrypted with AES-256-GCM before
 * being written to disk / sent to storage, and the returned key carries
 * the ".enc_" prefix — persist that key, not the one passed in.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
  encrypted = false
): Promise<{ key: string; url: string }> {
  const driver = getStorageDriver();
  if (!driver) {
    throw new Error(STORAGE_NOT_CONFIGURED_MSG);
  }

  const plainKey = sanitizeKey(relKey);
  const key = encrypted ? encryptedKey(plainKey) : plainKey;
  const body = encrypted
    ? Buffer.from(encryptBuffer(Buffer.from(data as any)), "utf-8")
    : Buffer.from(data as any);
  const bodyType = encrypted ? "text/plain" : contentType;

  if (driver === "local") {
    const localPath = localPathFor(key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, body);
    const url = `${LOCAL_BASE_URL}/uploads/${key}`;
    console.log(`[Storage] Local upload: ${key.slice(0, 16)}...`);
    return { key, url };
  }

  const { baseUrl, apiKey } = getForgeConfig();
  const uploadUrl = new URL("v1/storage/upload", baseUrl);
  uploadUrl.searchParams.set("path", key);

  const form = new FormData();
  form.append(
    "file",
    new Blob([body], { type: bodyType }),
    key.split("/").pop() ?? key
  );

  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

async function readRaw(key: string): Promise<Buffer> {
  const driver = getStorageDriver();
  if (!driver) {
    throw new Error(STORAGE_NOT_CONFIGURED_MSG);
  }

  if (driver === "local") {
    const localPath = localPathFor(key);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Stored file not found: ${key}`);
    }
    return fs.readFileSync(localPath);
  }

  const { baseUrl, apiKey } = getForgeConfig();
  const downloadApiUrl = new URL("v1/storage/downloadUrl", baseUrl);
  downloadApiUrl.searchParams.set("path", key);
  const meta = await fetch(downloadApiUrl.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!meta.ok) {
    throw new Error(`Storage downloadUrl failed (${meta.status})`);
  }
  const { url } = await meta.json();
  const file = await fetch(url);
  if (!file.ok) {
    throw new Error(`Storage download failed (${file.status})`);
  }
  return Buffer.from(await file.arrayBuffer());
}

/**
 * Delete a stored file. Returns true if a file was removed, false if there
 * was nothing to remove or the driver can't delete. A missing file is not
 * an error: the goal (no file left behind) already holds.
 */
export async function storageDelete(relKey: string): Promise<boolean> {
  const key = sanitizeKey(relKey);
  const driver = getStorageDriver();

  if (driver === "local") {
    const localPath = localPathFor(key);
    if (!fs.existsSync(localPath)) return false;
    fs.rmSync(localPath);
    console.log(`[Storage] Deleted: ${key.slice(0, 16)}...`);
    return true;
  }

  // The Forge proxy exposes no delete endpoint that this code knows of.
  console.warn(
    `[Storage] Cannot delete ${key.slice(0, 16)}... with driver "${driver}" — file left in storage`
  );
  return false;
}

/**
 * Read a stored file and return its original bytes, decrypting it when the
 * key marks it as encrypted. Throws if the file is missing or tampered with.
 */
export async function storageRead(relKey: string): Promise<Buffer> {
  const key = sanitizeKey(relKey);
  const raw = await readRaw(key);
  if (!isEncryptedKey(key)) return raw;

  const content = raw.toString("utf-8").trim();
  const decrypted = isEncryptedBuffer(content) ? decryptBuffer(content) : null;
  if (!decrypted) {
    throw new Error(`Failed to decrypt stored file: ${key}`);
  }
  return decrypted;
}
