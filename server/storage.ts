// Preconfigured storage helpers
// Uses local filesystem in development, or external storage in production
// Evidence files are encrypted at rest using AES-256-GCM

import { ENV } from "./_core/env";
import {
  encryptBuffer,
  decryptBuffer,
  isEncryptedBuffer,
} from "./_core/encryption";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

const IS_DEV = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "./uploads";
const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL ?? "http://localhost:3000";

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function ensureLocalDir(): void {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
    console.log(
      `[Storage] Created local upload directory: ${LOCAL_UPLOAD_DIR}`
    );
  }
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

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
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

/**
 * Store a file, optionally encrypting it at rest.
 * When `encrypted = true`, data is encrypted with AES-256-GCM before
 * being written to disk / sent to storage.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
  encrypted = false
): Promise<{ key: string; url: string }> {
  const key = sanitizeKey(relKey);
  const buffer = Buffer.from(data as any);

  // If encryption is requested, encrypt the buffer then store as text
  if (encrypted) {
    const encryptedData = encryptBuffer(buffer);
    const encKey = encryptedKey(key);
    const textBuffer = Buffer.from(encryptedData, "utf-8");

    if (IS_DEV) {
      ensureLocalDir();
      const localPath = path.join(LOCAL_UPLOAD_DIR, encKey);
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localPath, textBuffer);

      const url = `${LOCAL_BASE_URL}/uploads/${encKey}`;
      console.log(`[Storage] Encrypted local upload: ${encKey} -> ${url}`);
      return { key: encKey, url };
    }

    // Production: store encrypted blob via external API
    const { baseUrl, apiKey } = getStorageConfig();
    const uploadUrl = new URL(
      "v1/storage/upload",
      baseUrl.endsWith("/") ? baseUrl : baseUrl + "/"
    );
    uploadUrl.searchParams.set("path", encKey);

    const blob = new Blob([textBuffer], { type: "text/plain" });
    const form = new FormData();
    form.append("file", blob, encKey.split("/").pop() ?? encKey);

    const response = await fetch(uploadUrl.toString(), {
      method: "POST",
      headers: buildAuthHeaders(apiKey),
      body: form,
    });

    if (!response.ok) {
      const message = await response.text().catch(() => response.statusText);
      throw new Error(
        `Storage upload failed (${response.status} ${response.statusText}): ${message}`
      );
    }
    const url = (await response.json()).url;
    return { key: encKey, url };
  }

  // Plain (unencrypted) storage
  if (IS_DEV) {
    ensureLocalDir();
    const localPath = path.join(LOCAL_UPLOAD_DIR, key);
    const dir = path.dirname(localPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(localPath, buffer);

    const url = `${LOCAL_BASE_URL}/uploads/${key}`;
    console.log(`[Storage] Local upload: ${key} -> ${url}`);
    return { key, url };
  }

  const { baseUrl, apiKey } = getStorageConfig();
  const uploadUrl = new URL(
    "v1/storage/upload",
    baseUrl.endsWith("/") ? baseUrl : baseUrl + "/"
  );
  uploadUrl.searchParams.set("path", key);

  const blob = new Blob([data as any], { type: contentType });

  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl.toString(), {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
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

/**
 * Retrieve a file URL. If the key matches the encrypted prefix,
 * attempts to decrypt the content on read.
 */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string; decrypted?: Buffer }> {
  const key = sanitizeKey(relKey);
  const isEncrypted = key.startsWith(ENCRYPTED_PREFIX);

  if (IS_DEV) {
    const localPath = path.join(LOCAL_UPLOAD_DIR, key);
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file not found: ${key}`);
    }

    const url = `${LOCAL_BASE_URL}/uploads/${key}`;

    // If the file is encrypted, read & decrypt
    if (isEncrypted) {
      const content = fs.readFileSync(localPath, "utf-8").trim();
      if (isEncryptedBuffer(content)) {
        const decrypted = decryptBuffer(content);
        if (!decrypted) {
          throw new Error(`Failed to decrypt evidence file: ${key}`);
        }
        return { key, url, decrypted };
      }
      console.warn(
        `[Storage] File ${key} has encrypted prefix but content is not valid ciphertext`
      );
    }

    return { key, url };
  }

  const { baseUrl, apiKey } = getStorageConfig();
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    baseUrl.endsWith("/") ? baseUrl : baseUrl + "/"
  );
  downloadApiUrl.searchParams.set("path", key);

  const response = await fetch(downloadApiUrl.toString(), {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });

  return { key, url: (await response.json()).url };
}
