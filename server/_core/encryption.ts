import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash,
} from "crypto";
import { ENV } from "./env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  if (
    !ENV.cookieSecret ||
    ENV.cookieSecret === "default-dev-key-change-in-production"
  ) {
    throw new Error(
      "JWT_SECRET no está configurado. Debe tener al menos 32 caracteres."
    );
  }
  return scryptSync(ENV.cookieSecret, "forensic-encryption-salt", 32);
}

export interface EncryptedData {
  iv: string;
  encryptedData: string;
  tag: string;
  version: number;
}

export function encrypt(plaintext: string): EncryptedData {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty string");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    encryptedData: encrypted,
    tag: tag.toString("hex"),
    version: 1,
  };
}

export function decrypt(encrypted: EncryptedData): string {
  if (!encrypted.encryptedData) {
    return "";
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, "hex");
  const tag = Buffer.from(encrypted.tag, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted.encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function encryptObject<T extends Record<string, unknown>>(
  obj: T
): string {
  const jsonStr = JSON.stringify(obj);
  const encrypted = encrypt(jsonStr);
  return JSON.stringify(encrypted);
}

export function decryptObject<T>(encryptedStr: string): T | null {
  try {
    const encrypted = JSON.parse(encryptedStr) as EncryptedData;
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}

export function hashSensitiveData(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function maskSensitiveString(str: string, visibleChars = 4): string {
  if (!str || str.length <= visibleChars * 2) {
    return "*".repeat(str?.length || 4);
  }
  return (
    str.slice(0, visibleChars) +
    "*".repeat(str.length - visibleChars * 2) +
    str.slice(-visibleChars)
  );
}

export function isEncrypted(str: string): boolean {
  try {
    const parsed = JSON.parse(str);
    return !!(
      parsed.iv &&
      parsed.encryptedData &&
      parsed.tag &&
      parsed.version
    );
  } catch {
    return false;
  }
}

const sensitiveFieldPatterns = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /authorization/i,
  /credential/i,
  /private[_-]?key/i,
  /ssn/i,
  /credit[_-]?card/i,
  /cvv/i,
];

export function containsSensitiveData(text: string): boolean {
  return sensitiveFieldPatterns.some(pattern => pattern.test(text));
}

export function redactSensitiveFields(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = sensitiveFieldPatterns.some(pattern =>
      pattern.test(key)
    );

    if (isSensitive) {
      redacted[key] = "[REDACTED]";
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      redacted[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else if (typeof value === "string" && containsSensitiveData(value)) {
      redacted[key] = value.slice(0, 8) + "..." + value.slice(-4);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// ─── File/Buffer encryption ──────────────────────────────────────────────

/**
 * Encrypt a Buffer (e.g. evidence file) and return a single
 * self-contained base64 string (iv:tag:ciphertext).
 */
export function encryptBuffer(plaintext: Buffer): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  const tag = cipher.getAuthTag();

  // Format: base64(iv) : base64(tag) : base64(ciphertext)
  return (
    iv.toString("base64") +
    ":" +
    tag.toString("base64") +
    ":" +
    encrypted.toString("base64")
  );
}

/**
 * Decrypt a Buffer that was encrypted with encryptBuffer().
 */
export function decryptBuffer(encryptedStr: string): Buffer | null {
  try {
    const parts = encryptedStr.split(":");
    if (parts.length !== 3) return null;

    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const ciphertext = Buffer.from(parts[2], "base64");

    const key = getEncryptionKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return null;
  }
}

/**
 * Check whether a string looks like encrypted buffer output.
 */
export function isEncryptedBuffer(str: string): boolean {
  return /^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/.test(str);
}
