import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getCaseById, getEvidenceByCase } from "../db";
import {
  extractLegalEntities,
  extractLegalReferences,
  buildLegalTimeline,
  extractLegalArguments,
  findPrecedents,
  analyzeContractClauses,
  performDeepLegalAnalysis,
} from "../legalAnalysis";
import { protectedProcedure, router } from "../_core/trpc";
import { logSecurityEvent } from "../_core/audit";

export const legalAnalysisRouter = router({
  extractEntities: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      const evidence = await getEvidenceByCase(input.caseId, ctx.user.id);
      const textContent = evidence
        .map(e => e.extractedText || e.originalName)
        .filter(Boolean)
        .join("\n\n");

      if (!textContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay contenido de texto para analizar",
        });
      }

      logSecurityEvent(
        "data_access",
        {
          ip: ctx.req?.ip,
          user: { id: ctx.user.id, email: ctx.user.email ?? undefined },
        },
        {
          action: "Extracted legal entities",
          resource: "case",
          resourceId: input.caseId,
        }
      );

      return extractLegalEntities(textContent);
    }),

  extractReferences: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      const evidence = await getEvidenceByCase(input.caseId, ctx.user.id);
      const textContent = evidence
        .map(e => e.extractedText || e.originalName)
        .filter(Boolean)
        .join("\n\n");

      if (!textContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay contenido de texto para analizar",
        });
      }

      return extractLegalReferences(textContent);
    }),

  buildTimeline: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      const evidence = await getEvidenceByCase(input.caseId, ctx.user.id);
      const textContent = evidence
        .map(e => e.extractedText || e.originalName)
        .filter(Boolean)
        .join("\n\n");

      if (!textContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay contenido de texto para analizar",
        });
      }

      logSecurityEvent(
        "data_access",
        {
          ip: ctx.req?.ip,
          user: { id: ctx.user.id, email: ctx.user.email ?? undefined },
        },
        {
          action: "Built legal timeline",
          resource: "case",
          resourceId: input.caseId,
        }
      );

      return buildLegalTimeline(textContent, caseData.caseType);
    }),

  extractArguments: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      const evidence = await getEvidenceByCase(input.caseId, ctx.user.id);
      const textContent = evidence
        .map(e => e.extractedText || e.originalName)
        .filter(Boolean)
        .join("\n\n");

      if (!textContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay contenido de texto para analizar",
        });
      }

      return extractLegalArguments(textContent);
    }),

  findPrecedents: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      const evidence = await getEvidenceByCase(input.caseId, ctx.user.id);
      const textContent = evidence
        .map(e => e.extractedText || e.originalName)
        .filter(Boolean)
        .join("\n\n");

      if (!textContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay contenido de texto para analizar",
        });
      }

      logSecurityEvent(
        "data_access",
        {
          ip: ctx.req?.ip,
          user: { id: ctx.user.id, email: ctx.user.email ?? undefined },
        },
        {
          action: "Found legal precedents",
          resource: "case",
          resourceId: input.caseId,
        }
      );

      return findPrecedents(textContent, caseData.caseType);
    }),

  analyzeClauses: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      const evidence = await getEvidenceByCase(input.caseId, ctx.user.id);
      const textContent = evidence
        .map(e => e.extractedText || e.originalName)
        .filter(Boolean)
        .join("\n\n");

      if (!textContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay contenido de texto para analizar",
        });
      }

      return analyzeContractClauses(textContent);
    }),

  deepAnalysis: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const caseData = await getCaseById(input.caseId, ctx.user.id);
      if (!caseData) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      }

      const evidence = await getEvidenceByCase(input.caseId, ctx.user.id);
      const textContent = evidence
        .map(e => e.extractedText || e.originalName)
        .filter(Boolean)
        .join("\n\n");

      if (!textContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay contenido de texto para analizar",
        });
      }

      logSecurityEvent(
        "analysis_run",
        {
          ip: ctx.req?.ip,
          user: { id: ctx.user.id, email: ctx.user.email ?? undefined },
        },
        {
          action: "Performed deep legal analysis",
          resource: "case",
          resourceId: input.caseId,
          metadata: { caseType: caseData.caseType },
        }
      );

      return performDeepLegalAnalysis(textContent, caseData.caseType);
    }),
});
