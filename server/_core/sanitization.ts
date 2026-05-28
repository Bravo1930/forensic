import { z } from "zod";

const DANGEROUS_PATTERNS = [
  /[\x00-\x1F\x7F]/g,
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /<meta/gi,
  /\x00/g,
  /--/g,
  /;/g,
  /\/\*/g,
  /\*\//g,
  /\'/g,
  /"/g,
  /\\/g,
  /;/g,
  /UNION/gi,
  /SELECT/gi,
  /INSERT/gi,
  /UPDATE/gi,
  /DELETE/gi,
  /DROP/gi,
  /ALTER/gi,
  /CREATE/gi,
  /TRUNCATE/gi,
  /EXEC/gi,
  /EXECUTE/gi,
  /xp_/gi,
  /sp_/gi,
];

const SQL_INJECTION_PATTERNS = [
  /('|(\\')|(--)|(\#))/g,
  /(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\s+/gi,
  /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
  /(\bOR\b|\bAND\b)\s+['"`]/gi,
];

export function sanitizeString(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/<iframe/gi, "&lt;iframe")
    .replace(/<object/gi, "&lt;object")
    .replace(/<embed/gi, "&lt;embed")
    .replace(/\x00/g, "")
    .trim()
    .slice(0, 50000);
}

export function sanitizeHtml(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/`/g, "&#96;")
    .trim();
}

export function sanitizeFilename(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/[^a-zA-Z0áéíóúÁÉÍÓÚñÑ0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\./, "_")
    .trim()
    .slice(0, 255);
}

export function sanitizeSearchTerm(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/['"\\;]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export function sanitizeForDatabase(input: unknown): string {
  if (typeof input !== "string") return "";
  let sanitized = input
    .replace(/\x00/g, "")
    .replace(/\x1a/g, "")
    .replace(/'/g, "''")
    .replace(/"/g, '""')
    .replace(/\\/g, "\\\\");
  for (const pattern of SQL_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, " ");
  }
  return sanitized.slice(0, 50000);
}

export function validateNumericId(input: unknown): number | null {
  if (typeof input === "number" && Number.isInteger(input) && input > 0) {
    return input;
  }
  if (typeof input === "string") {
    const parsed = parseInt(input, 10);
    if (Number.isInteger(parsed) && parsed > 0 && parsed < 2147483647) {
      return parsed;
    }
  }
  return null;
}

export function validateCaseId(input: unknown): number | null {
  return validateNumericId(input);
}

export function validateEvidenceId(input: unknown): number | null {
  return validateNumericId(input);
}

export function validateAnalysisId(input: unknown): number | null {
  return validateNumericId(input);
}

export const sanitizedString = (maxLength = 255) =>
  z
    .string()
    .max(maxLength, `El campo excede ${maxLength} caracteres`)
    .transform(val => sanitizeString(val));

export const sanitizedTextarea = () =>
  z
    .string()
    .max(50000, "El texto excede 50000 caracteres")
    .transform(val => sanitizeString(val));

export const sanitizedEmail = () =>
  z
    .string()
    .max(255)
    .email("Email inválido")
    .transform(val => sanitizeString(val).toLowerCase().trim());

export const sanitizedUrl = () =>
  z
    .string()
    .max(2048)
    .url("URL inválida")
    .transform(val => sanitizeString(val));

export const sanitizedFilename = () =>
  z
    .string()
    .max(255, "El nombre del archivo excede 255 caracteres")
    .transform(val => sanitizeFilename(val));

export const sanitizedSearch = () =>
  z
    .string()
    .max(500, "El término de búsqueda excede 500 caracteres")
    .transform(val => sanitizeSearchTerm(val));

export const sanitizedNumericId = () =>
  z
    .number()
    .int()
    .positive()
    .max(2147483647, "ID inválido")
    .transform(val => val);

export const sanitizedOptionalNumericId = () =>
  z
    .number()
    .int()
    .positive()
    .max(2147483647, "ID inválido")
    .optional()
    .nullable()
    .transform(val => val ?? null);

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {};
  for (const field of fields) {
    if (typeof obj[field] === "string") {
      (sanitized as Record<string, unknown>)[field as string] = sanitizeString(
        obj[field]
      );
    }
  }
  return sanitized;
}

export function sanitizeMetadata(
  metadata: Record<string, unknown> | string | null | undefined
): string {
  if (!metadata) return "{}";
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      return JSON.stringify(sanitizeObject(parsed, Object.keys(parsed)));
    } catch {
      return "{}";
    }
  }
  if (typeof metadata === "object") {
    return JSON.stringify(sanitizeObject(metadata, Object.keys(metadata)));
  }
  return "{}";
}
