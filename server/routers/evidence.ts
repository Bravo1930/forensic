import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createEvidence,
  deleteEvidence,
  getEvidenceByCase,
  getEvidenceById,
  getSubscription,
  updateEvidence,
  updateEvidenceImageAnalysis,
  updateStorageUsed,
} from "../db";
import {
  requireStorage,
  storageDelete,
  storagePut,
  storageRead,
} from "../storage";
import { extractFileMetadata } from "../forensicAI";
import {
  analyzeImageForensics,
  buildImageForensicSummary,
  extractExifFromBase64,
  isImageMimeType,
  type ImageAnalysisResult,
} from "../imageAnalysis";
import { protectedProcedure, router } from "../_core/trpc";
import { sanitizedString, sanitizedTextarea } from "../_core/sanitization";

/** Authenticated, decrypting download route — see server/routes/files.ts */
export function evidenceFileUrl(id: number) {
  return `/api/evidence/${id}/file`;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

function detectEvidenceType(mimeType: string, filename: string): string {
  if (mimeType.startsWith("image/")) return "imagen";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "documento";
  if (
    mimeType === "application/zip" ||
    mimeType === "application/x-zip-compressed"
  )
    return "zip";
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["txt", "log"].includes(ext ?? "")) return "log";
  if (["json", "xml", "csv"].includes(ext ?? "")) return "log";
  if (["pdf", "doc", "docx"].includes(ext ?? "")) return "documento";
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext ?? ""))
    return "imagen";
  return "otro";
}

export const evidenceRouter = router({
  listByCase: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      return getEvidenceByCase(
        input.caseId,
        ctx.user.id,
        input.limit,
        input.offset
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await getEvidenceById(input.id, ctx.user.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),

  upload: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
        filename: sanitizedString(255),
        mimeType: z.string(),
        sizeBytes: z.number(),
        base64Data: z.string(),
        description: sanitizedTextarea().optional(),
        extractedText: sanitizedTextarea().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fail fast with a clear 503 before decoding anything
      requireStorage();

      // Enforce maximum file size (7MB effective after base64 decoding)
      const MAX_EVIDENCE_SIZE_BYTES = 7 * 1024 * 1024;
      if (input.sizeBytes > MAX_EVIDENCE_SIZE_BYTES) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `El archivo excede el límite de ${(MAX_EVIDENCE_SIZE_BYTES / 1024 / 1024).toFixed(0)} MB. Considera comprimir la imagen o dividir el documento.`,
        });
      }

      // Verify base64 payload fits within the server body limit
      const approxDecodedSize = Math.ceil((input.base64Data.length * 3) / 4);
      if (approxDecodedSize > MAX_EVIDENCE_SIZE_BYTES * 1.5) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: "La representación base64 del archivo es demasiado grande.",
        });
      }

      // Check storage quota
      const sub = await getSubscription(ctx.user.id);
      if (sub) {
        const newTotal = sub.storageUsedBytes + input.sizeBytes;
        if (newTotal > sub.storageLimitBytes) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Almacenamiento insuficiente. Tu plan ${sub.plan} tiene ${(sub.storageLimitBytes / 1024 / 1024).toFixed(0)} MB de límite.`,
          });
        }
      }

      // Upload to encrypted storage
      const fileBuffer = Buffer.from(input.base64Data, "base64");
      const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const rawKey = `evidence/${ctx.user.id}/${input.caseId}/${safeFilename}-${randomSuffix()}`;
      // storedKey carries the ".enc_" prefix: it is where the file actually lives
      const { key: storedKey } = await storagePut(
        rawKey,
        fileBuffer,
        input.mimeType,
        true // encrypt at rest
      );

      // Extract metadata via AI
      const metadata = await extractFileMetadata(
        input.filename,
        input.mimeType,
        input.extractedText
      );

      const evidenceType = detectEvidenceType(
        input.mimeType,
        input.filename
      ) as
        | "documento"
        | "imagen"
        | "video"
        | "audio"
        | "chat"
        | "log"
        | "zip"
        | "otro";

      // For images: mark as pending analysis, don't block upload
      let finalExtractedText = input.extractedText;
      let finalMetadata = metadata;

      if (isImageMimeType(input.mimeType)) {
        finalMetadata = {
          ...metadata,
          imageAnalysisPending: true,
        };
      }

      const result = await createEvidence({
        caseId: input.caseId,
        userId: ctx.user.id,
        originalName: input.filename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        s3Key: storedKey,
        s3Url: "",
        evidenceType,
        metadata:
          typeof finalMetadata === "string"
            ? finalMetadata
            : JSON.stringify(finalMetadata),
        extractedText: finalExtractedText,
        description: input.description,
      });

      // Run image analysis in background without blocking response
      if (isImageMimeType(input.mimeType)) {
        (async () => {
          try {
            // Use a data URL for analysis (S3 file is encrypted)
            const dataUrl = `data:${input.mimeType};base64,${input.base64Data}`;
            const [exif, vision] = await Promise.all([
              extractExifFromBase64(
                input.base64Data,
                input.mimeType,
                input.filename
              ),
              analyzeImageForensics(dataUrl, input.filename, input.mimeType),
            ]);

            if (vision.ocrText?.trim()) {
              await updateEvidenceImageAnalysis(
                result,
                ctx.user.id,
                { vision, analysisTimestamp: new Date().toISOString() },
                vision.ocrText
              );
            }
          } catch (e) {
            console.warn("[ImageAnalysis] Background analysis failed:", e);
          }
        })();
      }

      // Files are encrypted at rest, so clients always go through the
      // authenticated, decrypting endpoint rather than a raw storage URL
      const fileUrl = evidenceFileUrl(result);
      await updateEvidence(result, ctx.user.id, { s3Url: fileUrl });

      // Update storage usage
      await updateStorageUsed(ctx.user.id, input.sizeBytes);

      return {
        id: result,
        s3Url: fileUrl,
        hasImageAnalysis: isImageMimeType(input.mimeType),
      };
    }),

  // Dedicated procedure to (re-)analyze an image on demand
  analyzeImage: protectedProcedure
    .input(
      z.object({
        evidenceId: z.number(),
        caseContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await getEvidenceById(input.evidenceId, ctx.user.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      if (!isImageMimeType(item.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Este archivo no es una imagen. El análisis visual solo está disponible para imágenes.",
        });
      }

      // Read and decrypt the image from storage, then convert to data URL
      const decrypted = item.s3Key
        ? await storageRead(item.s3Key).catch(err => {
            console.warn("[Evidence] Could not read stored image:", err);
            return null;
          })
        : null;
      if (!decrypted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No se pudo leer el archivo de esta evidencia.",
        });
      }
      const imageUrl = `data:${item.mimeType ?? "application/octet-stream"};base64,${decrypted.toString("base64")}`;

      const vision = await analyzeImageForensics(
        imageUrl,
        item.originalName,
        item.mimeType ?? "application/octet-stream",
        input.caseContext
      );

      // Build forensic text summary for inclusion in case analysis
      const forensicSummary = buildImageForensicSummary(item.originalName, {
        exif:
          ((typeof item.metadata === "string"
            ? JSON.parse(item.metadata || "{}")
            : item.metadata
          )?.exif as Record<string, unknown>) ?? {},
        vision,
        analysisTimestamp: new Date().toISOString(),
        imageUrl: item.s3Url,
      });

      // Persist results
      await updateEvidenceImageAnalysis(
        input.evidenceId,
        ctx.user.id,
        { vision, analysisTimestamp: new Date().toISOString() },
        vision.ocrText || item.extractedText || ""
      );

      return {
        success: true,
        vision,
        forensicSummary,
        ocrText: vision.ocrText,
        legalRelevance: vision.legalRelevance,
        manipulationLikelihood: vision.manipulationAssessment.likelihood,
      };
    }),

  // Get image analysis results for an evidence item
  getImageAnalysis: protectedProcedure
    .input(z.object({ evidenceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const item = await getEvidenceById(input.evidenceId, ctx.user.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });

      const meta = item.metadata as Record<string, unknown> | null;
      const imageAnalysis = meta?.imageAnalysis as
        | Record<string, unknown>
        | undefined;
      const exif = meta?.exif as Record<string, unknown> | undefined;

      return {
        evidenceId: item.id,
        filename: item.originalName,
        mimeType: item.mimeType,
        s3Url: item.s3Url,
        isImage: isImageMimeType(item.mimeType),
        hasAnalysis: !!imageAnalysis,
        exif: exif ?? null,
        imageAnalysis: imageAnalysis ?? null,
        ocrText: item.extractedText ?? null,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        description: sanitizedTextarea().optional(),
        isKeyEvidence: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await getEvidenceById(id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await updateEvidence(id, ctx.user.id, data);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const item = await getEvidenceById(input.id, ctx.user.id);
      const bytesFreed = await deleteEvidence(input.id, ctx.user.id);
      if (bytesFreed > 0) {
        await updateStorageUsed(ctx.user.id, -bytesFreed);
      }

      // Remove the stored file only after the record is gone: a failed file
      // delete leaves an orphan (logged), never a record pointing at nothing.
      if (item?.s3Key) {
        await storageDelete(item.s3Key).catch(err =>
          console.error(
            `[Evidence] Record ${input.id} deleted but its file could not be:`,
            err
          )
        );
      }
      return { success: true };
    }),
});
