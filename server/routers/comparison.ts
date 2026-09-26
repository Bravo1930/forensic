import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getScopedDb } from "../db";
import { evidence } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { desc } from "drizzle-orm";
import {
  compareImagesForensically,
  buildComparisonSummary,
  type ComparisonResult,
} from "../imageComparison";
import { isImageMimeType } from "../imageAnalysis";
import { notifyOwner } from "../_core/notification";
import { storageRead } from "../storage";

async function toDataUrl(
  s3Key: string | null,
  mimeType: string | null
): Promise<string> {
  if (!s3Key) throw new Error("Evidence has no stored file");
  const bytes = await storageRead(s3Key);
  return `data:${mimeType ?? "image/jpeg"};base64,${bytes.toString("base64")}`;
}

function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata || "{}");
    } catch {
      return {};
    }
  }
  return (metadata ?? {}) as Record<string, unknown>;
}

export const comparisonRouter = router({
  /** Start a new image comparison between two evidence items */
  compare: protectedProcedure
    .input(
      z.object({
        caseId: z.number().int().positive(),
        evidenceAId: z.number().int().positive(),
        evidenceBId: z.number().int().positive(),
        caseContext: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sdb = await getScopedDb(ctx.user.id);
      if (!sdb)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error interno del servidor",
        });

      // Fetch both evidence items (scopedDb ensures userId filtering)
      const [evA] = await sdb.evidence.selectById(input.evidenceAId);
      const [evB] = await sdb.evidence.selectById(input.evidenceBId);

      if (!evA || !evB) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Una o ambas evidencias no fueron encontradas",
        });
      }

      if (!isImageMimeType(evA.mimeType) || !isImageMimeType(evB.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Ambas evidencias deben ser imágenes para realizar la comparación",
        });
      }

      if (input.evidenceAId === input.evidenceBId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debes seleccionar dos imágenes diferentes para comparar",
        });
      }

      // Evidence is encrypted at rest and s3Url is an authenticated app route
      // the LLM can't reach, so send the decrypted bytes as data URLs.
      let imageAUrl: string;
      let imageBUrl: string;
      try {
        imageAUrl = await toDataUrl(evA.s3Key, evA.mimeType);
        imageBUrl = await toDataUrl(evB.s3Key, evB.mimeType);
      } catch (err) {
        console.error("[Comparison] Could not read evidence images:", err);
        throw new TRPCError({
          code: "NOT_FOUND",
          message:
            "No se pudo leer el archivo de una de las imágenes. Vuelve a subir la evidencia.",
        });
      }

      // Create comparison record (scopedDb auto-injects userId)
      const [insertResult] = await sdb.comparisons.insert({
        caseId: input.caseId,
        evidenceAId: input.evidenceAId,
        evidenceBId: input.evidenceBId,
        status: "procesando",
        manipulationLikelihood: "ninguna",
        differenceCount: 0,
      });

      const comparisonId = insertResult?.id ?? 0;

      // Extract existing analysis metadata if available
      const metaA = parseMetadata(evA.metadata);
      const metaB = parseMetadata(evB.metadata);

      // Run comparison asynchronously
      (async () => {
        try {
          const result = await compareImagesForensically({
            imageAUrl,
            imageAFilename: evA.originalName,
            imageAMimeType: evA.mimeType ?? "image/jpeg",
            imageBUrl,
            imageBFilename: evB.originalName,
            imageBMimeType: evB.mimeType ?? "image/jpeg",
            caseContext: input.caseContext,
            imageAExif: metaA.exif as Record<string, unknown> | undefined,
            imageBExif: metaB.exif as Record<string, unknown> | undefined,
            imageAAnalysis: metaA.imageAnalysis as
              | Record<string, unknown>
              | undefined,
            imageBAnalysis: metaB.imageAnalysis as
              | Record<string, unknown>
              | undefined,
          });

          await sdb.comparisons.update(comparisonId, {
            resultJson: JSON.stringify(result),
            manipulationLikelihood: result.manipulationLikelihood,
            differenceCount: result.differences.length,
            status: "completado",
          });

          // Notify owner if high/critical manipulation detected
          if (
            result.manipulationLikelihood === "alta" ||
            result.manipulationLikelihood === "critica"
          ) {
            await notifyOwner({
              title: `⚠️ Manipulación ${result.manipulationLikelihood.toUpperCase()} detectada en comparación forense`,
              content: `Caso ID: ${input.caseId}\nImagen A: ${evA.originalName}\nImagen B: ${evB.originalName}\n\nResumen: ${result.executiveSummary}\n\nDiferencias detectadas: ${result.differences.length}`,
            });
          }
        } catch (err) {
          console.error("[Comparison] Error:", err);
          await sdb.comparisons.update(comparisonId, {
            status: "error",
            errorMessage:
              err instanceof Error ? err.message : "Error desconocido",
          });
        }
      })();

      return { id: comparisonId, status: "procesando" as const };
    }),

  /** Get comparison status and result */
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const sdb = await getScopedDb(ctx.user.id);
      if (!sdb)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error interno del servidor",
        });

      const [comp] = await sdb.comparisons.selectById(input.id);

      if (!comp)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comparación no encontrada",
        });

      const result: ComparisonResult | null = comp.resultJson
        ? (JSON.parse(comp.resultJson) as ComparisonResult)
        : null;

      // Fetch evidence details (scopedDb ensures ownership)
      const [evA] = await sdb.evidence.selectById(comp.evidenceAId);
      const [evB] = await sdb.evidence.selectById(comp.evidenceBId);

      return {
        ...comp,
        result,
        evidenceA: evA ?? null,
        evidenceB: evB ?? null,
      };
    }),

  /** List all comparisons for a case */
  listByCase: protectedProcedure
    .input(z.object({ caseId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const sdb = await getScopedDb(ctx.user.id);
      if (!sdb) return [];

      const rows = await sdb.comparisons
        .select(input.caseId)
        .orderBy(desc((sdb.comparisons as any)._createdAt));

      // Fetch evidence names for each comparison
      const enriched = await Promise.all(
        rows.map(async row => {
          const [evA] = await sdb.evidence.selectById(row.evidenceAId);
          const [evB] = await sdb.evidence.selectById(row.evidenceBId);
          return {
            ...row,
            evidenceA: evA ?? null,
            evidenceB: evB ?? null,
          };
        })
      );

      return enriched;
    }),

  /** Delete a comparison */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const sdb = await getScopedDb(ctx.user.id);
      if (!sdb)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error interno del servidor",
        });

      await sdb.comparisons.delete(input.id);

      return { success: true };
    }),

  /** Get a text summary suitable for inclusion in reports */
  getSummary: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const sdb = await getScopedDb(ctx.user.id);
      if (!sdb)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error interno del servidor",
        });

      const [comp] = await sdb.comparisons.selectById(input.id);

      if (!comp || !comp.resultJson) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comparación no encontrada o sin resultados",
        });
      }

      const [evA] = await sdb.evidence.selectById(comp.evidenceAId);
      const [evB] = await sdb.evidence.selectById(comp.evidenceBId);

      const result = JSON.parse(comp.resultJson) as ComparisonResult;
      const summary = buildComparisonSummary(
        evA?.originalName ?? `Evidencia ${comp.evidenceAId}`,
        evB?.originalName ?? `Evidencia ${comp.evidenceBId}`,
        result
      );

      return { summary };
    }),
});
