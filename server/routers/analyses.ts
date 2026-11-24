import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createAnalysis,
  getAllAnalysesByUser,
  getAnalysesByCase,
  getAnalysisById,
  getCaseById,
  getEvidenceByCase,
  getSubscription,
  incrementAnalysesUsed,
  updateAnalysis,
} from "../db";
import { enqueueAnalysis, enqueueContradictionAnalysis } from "../_core/queue";
import {
  processForensicAnalysis,
  processContradictionAnalysis,
  toAnalysisErrorMessage,
} from "../analysisProcessor";
import { logSecurityEvent } from "../_core/audit";
import { protectedProcedure, router } from "../_core/trpc";

const DEMO_USER_ID = 999999;

const DEMO_ANALYSES = [
  {
    id: 1,
    userId: DEMO_USER_ID,
    caseId: 1,
    type: "forense" as const,
    title: "Análisis de demanda laboral",
    status: "completado" as const,
    executiveSummary:
      "El caso presenta sólida fundamentación jurídica para el demandante.",
    expertOpinion:
      "Existen elementos suficientes para demostrar el despido injustificado.",
    prosecutionTheory:
      "El patrón conocía las políticas de la empresa y decidió vulnerarlas.",
    defenseTheory: "El empleado incumplió las obligaciones contractuales.",
    inconsistencies: ["Inconsistencia en fechas de notificación"],
    suspiciousPatterns: [],
    keyFindings: [
      "Testigos disponibles para declarar",
      "Documentación completa del contrato",
    ],
    timelineEvents: [
      {
        date: "2024-01-15",
        description: "Contratación",
        type: "info" as const,
      },
      {
        date: "2024-03-01",
        description: "Primera queja registrada",
        type: "warning" as const,
      },
      { date: "2024-04-10", description: "Despido", type: "critical" as const },
    ],
    relationshipGraph: null,
    evidenceCount: 3,
    processingTimeMs: 15000,
    hasCriticalFindings: false,
    criticalAlertSent: false,
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 3600000),
  },
  {
    id: 2,
    userId: DEMO_USER_ID,
    caseId: 2,
    type: "forense" as const,
    title: "Revisión de contrato de arrendamiento",
    status: "completado" as const,
    executiveSummary: "El contrato contiene cláusulas potencialmente abusivas.",
    expertOpinion: "Se recomienda negociar modificaciones antes de firma.",
    prosecutionTheory: null,
    defenseTheory: null,
    inconsistencies: [],
    suspiciousPatterns: ["Cláusula de penalización excesiva"],
    keyFindings: [
      "Cláusula 5.2 requiere revisión",
      "Depósito garantía fuera de mercado",
    ],
    timelineEvents: [],
    relationshipGraph: null,
    evidenceCount: 1,
    processingTimeMs: 8000,
    hasCriticalFindings: true,
    criticalAlertSent: true,
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 86400000),
  },
];

function buildEvidencePayload(
  evidenceList: Awaited<ReturnType<typeof getEvidenceByCase>>
) {
  return evidenceList.map(e => ({
    id: e.id,
    originalName: e.originalName,
    evidenceType: e.evidenceType ?? "documento",
    mimeType: e.mimeType ?? "application/octet-stream",
    sizeBytes: e.sizeBytes,
    metadata:
      typeof e.metadata === "string"
        ? JSON.parse(e.metadata || "{}")
        : (e.metadata ?? {}),
    extractedText: e.extractedText,
    description: e.description,
    createdAt: e.createdAt,
  }));
}

function getEvidenceText(
  evidenceList: Awaited<ReturnType<typeof getEvidenceByCase>>
) {
  return buildEvidencePayload(evidenceList);
}

export const analysesRouter = router({
  listAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.id === DEMO_USER_ID) {
      return DEMO_ANALYSES;
    }
    try {
      return await getAllAnalysesByUser(ctx.user.id);
    } catch {
      console.warn("[Analyses] DB unavailable, returning empty");
      return [];
    }
  }),

  listByCase: protectedProcedure
    .input(z.object({ caseId: z.coerce.number().positive() }))
    .query(async ({ ctx, input }) => {
      return getAnalysesByCase(input.caseId, ctx.user.id);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.coerce.number().positive() }))
    .query(async ({ ctx, input }) => {
      const analysis = await getAnalysisById(input.id, ctx.user.id);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      return analysis;
    }),

  run: protectedProcedure
    .input(
      z.object({
        caseId: z.coerce.number().positive(),
        type: z.string().optional(),
        title: z.string().min(1).max(255).optional(),
        forceFresh: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData) {
        logSecurityEvent(
          "access_denied",
          {
            ip: ctx.req?.ip,
            user: { id: ctx.user.id },
          },
          {
            action: "Attempted to run analysis on non-owned case",
            resource: "case",
            resourceId: input.caseId,
            success: false,
          }
        );
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      logSecurityEvent(
        "analysis_run",
        {
          ip: ctx.req?.ip,
          user: { id: ctx.user.id },
        },
        {
          action: "Started forensic analysis",
          resource: "case",
          resourceId: input.caseId,
          metadata: { type: input.type },
        }
      );

      const sub = await getSubscription(ctx.user.id);
      if (sub && sub.analysesUsed >= sub.analysesLimit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Has alcanzado el límite de ${sub.analysesLimit} análisis en tu plan ${sub.plan}. Actualiza tu suscripción para continuar.`,
        });
      }

      const evidenceList = await getEvidenceByCase(input.caseId, ctx.user.id);
      if (evidenceList.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El caso no tiene evidencia cargada. Sube al menos un archivo antes de analizar.",
        });
      }

      const title =
        input.title ??
        `Análisis Forense - ${new Date().toLocaleDateString("es-MX")}`;
      const analysisId = await createAnalysis({
        caseId: input.caseId,
        userId: ctx.user.id,
        type: input.type ?? "forense",
        title,
        status: "procesando",
        evidenceCount: evidenceList.length,
      });

      const evidencePayload = getEvidenceText(evidenceList);
      const userName = ctx.user.name ?? ctx.user.email ?? "Perito";

      const forceFresh = input.forceFresh ?? false;

      const queued = await enqueueAnalysis({
        type: "forensic",
        analysisId,
        userId: ctx.user.id,
        caseId: input.caseId,
        caseTitle: caseData.title,
        caseDescription: caseData.description ?? null,
        caseType: caseData.caseType,
        title,
        evidenceList: evidencePayload,
        userName,
        startTime: Date.now(),
        forceFresh,
      });

      if (!queued) {
        (async () => {
          try {
            await processForensicAnalysis(analysisId, ctx.user.id, title, {
              caseTitle: caseData.title,
              caseDescription: caseData.description ?? null,
              caseType: caseData.caseType,
              evidenceList: evidencePayload,
              userName,
              startTime: Date.now(),
              forceFresh,
            });
          } catch (error) {
            console.error("[Analysis] AI processing failed:", error);
            await updateAnalysis(analysisId, ctx.user.id, {
              status: "error",
              error: toAnalysisErrorMessage(error),
            });
          }
        })();
      }

      return { id: analysisId, status: "procesando" };
    }),

  runContradiction: protectedProcedure
    .input(
      z.object({
        caseId: z.coerce.number().positive(),
        title: z.string().min(1).max(255).optional(),
        forceFresh: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });

      const sub = await getSubscription(ctx.user.id);
      if (sub && sub.analysesUsed >= sub.analysesLimit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Has alcanzado el límite de ${sub.analysesLimit} análisis en tu plan ${sub.plan}. Actualiza tu suscripción para continuar.`,
        });
      }

      const evidenceList = await getEvidenceByCase(input.caseId, ctx.user.id);
      if (evidenceList.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El caso no tiene evidencia cargada. Sube al menos un archivo antes de analizar.",
        });
      }

      const title =
        input.title ??
        `Análisis de Contradicciones - ${new Date().toLocaleDateString("es-MX")}`;
      const analysisId = await createAnalysis({
        caseId: input.caseId,
        userId: ctx.user.id,
        type: "contradicciones",
        title,
        status: "procesando",
        evidenceCount: evidenceList.length,
      });

      const evidencePayload = getEvidenceText(evidenceList);
      const userName = ctx.user.name ?? ctx.user.email ?? "Perito";
      const forceFresh = input.forceFresh ?? false;

      const queued = await enqueueContradictionAnalysis({
        type: "contradiction",
        analysisId,
        userId: ctx.user.id,
        caseId: input.caseId,
        caseTitle: caseData.title,
        caseDescription: caseData.description ?? null,
        caseType: caseData.caseType,
        title,
        evidenceList: evidencePayload,
        userName,
        startTime: Date.now(),
        forceFresh,
      });

      if (!queued) {
        (async () => {
          try {
            await processContradictionAnalysis(analysisId, ctx.user.id, title, {
              caseTitle: caseData.title,
              caseDescription: caseData.description ?? null,
              caseType: caseData.caseType,
              evidenceList: evidencePayload,
              userName,
              startTime: Date.now(),
              forceFresh,
            });
          } catch (error) {
            console.error(
              "[Contradiction Analysis] AI processing failed:",
              error
            );
            await updateAnalysis(analysisId, ctx.user.id, {
              status: "error",
              error: toAnalysisErrorMessage(error),
            });
          }
        })();
      }

      return { id: analysisId, status: "procesando" };
    }),

  /**
   * Re-runs a failed analysis with the same evidence. Only analyses in
   * status "error" can be retried, and the retry does not count against
   * the subscription quota (the failed run never completed, so it never
   * incremented usage).
   */
  retry: protectedProcedure
    .input(z.object({ id: z.coerce.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getAnalysisById(input.id, ctx.user.id);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Análisis no encontrado",
        });
      }
      if (existing.status !== "error") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solo se pueden reintentar análisis en estado Error",
        });
      }

      const caseData = await getCaseById(existing.caseId, ctx.user.id);
      if (!caseData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      const evidenceList = await getEvidenceByCase(
        existing.caseId,
        ctx.user.id
      );
      if (evidenceList.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El caso ya no tiene evidencia cargada. Sube al menos un archivo antes de reintentar.",
        });
      }

      const evidencePayload = getEvidenceText(evidenceList);
      const userName = ctx.user.name ?? ctx.user.email ?? "Perito";
      const analysisTitle = existing.title ?? "Análisis Forense";

      await updateAnalysis(existing.id, ctx.user.id, {
        status: "procesando",
        error: null,
      });

      const jobData = {
        analysisId: existing.id,
        userId: ctx.user.id,
        caseId: existing.caseId,
        caseTitle: caseData.title,
        caseDescription: caseData.description ?? null,
        caseType: caseData.caseType,
        title: analysisTitle,
        evidenceList: evidencePayload,
        userName,
        startTime: Date.now(),
      };

      let queued = false;
      try {
        queued =
          existing.type === "contradicciones"
            ? await enqueueContradictionAnalysis({
                type: "contradiction",
                ...jobData,
              })
            : await enqueueAnalysis({ type: "forensic", ...jobData });
      } catch (error) {
        console.error("[Analysis] Retry enqueue failed, running inline:", error);
        queued = false;
      }

      if (!queued) {
        (async () => {
          try {
            if (existing.type === "contradicciones") {
              await processContradictionAnalysis(
                existing.id,
                ctx.user.id,
                analysisTitle,
                {
                  caseTitle: caseData.title,
                  caseDescription: caseData.description ?? null,
                  caseType: caseData.caseType,
                  evidenceList: evidencePayload,
                  userName,
                  startTime: Date.now(),
                }
              );
            } else {
              await processForensicAnalysis(
                existing.id,
                ctx.user.id,
                analysisTitle,
                {
                  caseTitle: caseData.title,
                  caseDescription: caseData.description ?? null,
                  caseType: caseData.caseType,
                  evidenceList: evidencePayload,
                  userName,
                  startTime: Date.now(),
                }
              );
            }
          } catch (error) {
            console.error("[Analysis] Retry processing failed:", error);
            // processForensicAnalysis/processContradictionAnalysis already
            // persisted the error reason; this is only a safety net.
            await updateAnalysis(existing.id, ctx.user.id, {
              status: "error",
              error: toAnalysisErrorMessage(error),
            });
          }
        })();
      }

      return { id: existing.id, status: "procesando" };
    }),

  getStatus: protectedProcedure
    .input(z.object({ id: z.coerce.number().positive() }))
    .query(async ({ ctx, input }) => {
      const analysis = await getAnalysisById(input.id, ctx.user.id);
      if (!analysis) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        id: analysis.id,
        status: analysis.status,
        updatedAt: analysis.updatedAt,
      };
    }),
});
