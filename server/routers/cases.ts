import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  countCasesByUser,
  createCase,
  deleteCase,
  getCaseById,
  getCasesByUser,
  getSubscription,
  updateCase,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { sanitizedString, sanitizedTextarea } from "../_core/sanitization";

const DEMO_USER_ID = 999999;

const DEMO_CASES = [
  {
    id: 1,
    userId: DEMO_USER_ID,
    title: "Demanda laboral por despido injustificado",
    caseNumber: "JL-2024-001",
    caseType: "laboral" as const,
    status: "activo" as const,
    priority: "alta" as const,
    description: "El demandante fue despido sin justificación hace 3 meses",
    clientName: "Juan Pérez",
    opposingParty: "Empresa ABC S.A. de C.V.",
    court: "Juzgado Primero de lo Laboral",
    jurisdiction: "Ciudad de México",
    tags: ["despido", "indemnización", "laboral"],
    hearingDate: new Date("2024-06-15"),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    userId: DEMO_USER_ID,
    title: "División de bienes matrimoniales",
    caseNumber: "JC-2024-045",
    caseType: "familiar" as const,
    status: "activo" as const,
    priority: "media" as const,
    description: "División de propiedades tras divorcio",
    clientName: "María García",
    opposingParty: "Ex espos@",
    court: "Juzgado Familiar Cuarto",
    jurisdiction: "Estado de México",
    tags: ["divorcio", "bienes", "custodia"],
    hearingDate: null,
    createdAt: new Date(),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: 3,
    userId: DEMO_USER_ID,
    title: "Contrato de arrendamiento comercial",
    caseNumber: "CM-2024-012",
    caseType: "mercantil" as const,
    status: "activo" as const,
    priority: "baja" as const,
    description: "Conflicto por incumplimiento de contrato de renta",
    clientName: "Inmobiliaria XYZ",
    opposingParty: "Comercializadora 123",
    court: "Juzgado Mercantil Segundo",
    jurisdiction: "Guadalajara, Jalisco",
    tags: ["arrendamiento", "comercio", "contrato"],
    hearingDate: null,
    createdAt: new Date(),
    updatedAt: new Date(Date.now() - 172800000),
  },
  {
    id: 4,
    userId: DEMO_USER_ID,
    title: "Demanda de daño moral por difamación",
    caseNumber: "JC-2024-089",
    caseType: "civil" as const,
    status: "archivado" as const,
    priority: "baja" as const,
    description: "Caso concludedo",
    clientName: "Pedro López",
    opposingParty: "Periódico Nacional",
    court: "Juzgado Civil Tercero",
    jurisdiction: "Ciudad de México",
    tags: ["difamación", "daño moral"],
    hearingDate: null,
    createdAt: new Date(Date.now() - 2592000000),
    updatedAt: new Date(Date.now() - 604800000),
  },
];

export const casesRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.id === DEMO_USER_ID) {
        return DEMO_CASES;
      }
      try {
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        return await getCasesByUser(ctx.user.id, limit, offset);
      } catch (error) {
        console.warn("[Cases] DB unavailable, returning empty");
        return [];
      }
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const c = await getCaseById(input.id, ctx.user.id);
      if (!c)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Caso no encontrado",
        });
      return c;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: sanitizedString(255),
        caseNumber: sanitizedString(100).optional(),
        description: sanitizedTextarea().optional(),
        clientName: sanitizedString(255).optional(),
        opposingParty: sanitizedString(255).optional(),
        court: sanitizedString(255).optional(),
        jurisdiction: sanitizedString(255).optional(),
        caseType: z
          .enum([
            "civil",
            "penal",
            "laboral",
            "familiar",
            "mercantil",
            "administrativo",
            "otro",
          ])
          .default("civil"),
        priority: z.enum(["alta", "media", "baja"]).default("media"),
        tags: z.array(sanitizedString(50)).default([]),
        hearingDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check subscription limits
      const sub = await getSubscription(ctx.user.id);
      if (sub) {
        const count = await countCasesByUser(ctx.user.id);
        if (count >= sub.casesLimit) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Has alcanzado el límite de ${sub.casesLimit} casos activos en tu plan ${sub.plan}. Actualiza tu suscripción para crear más casos.`,
          });
        }
      }

      const result = await createCase({
        userId: ctx.user.id,
        title: input.title,
        caseNumber: input.caseNumber,
        description: input.description,
        clientName: input.clientName,
        opposingParty: input.opposingParty,
        court: input.court,
        jurisdiction: input.jurisdiction,
        caseType: input.caseType,
        priority: input.priority,
        tags: Array.isArray(input.tags)
          ? JSON.stringify(input.tags)
          : input.tags,
        status: "activo",
        hearingDate: input.hearingDate
          ? new Date(input.hearingDate)
          : undefined,
      });
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: sanitizedString(255).optional(),
        caseNumber: sanitizedString(100).optional(),
        description: sanitizedTextarea().optional(),
        clientName: sanitizedString(255).optional(),
        opposingParty: sanitizedString(255).optional(),
        court: sanitizedString(255).optional(),
        jurisdiction: sanitizedString(255).optional(),
        caseType: z
          .enum([
            "civil",
            "penal",
            "laboral",
            "familiar",
            "mercantil",
            "administrativo",
            "otro",
          ])
          .optional(),
        status: z
          .enum(["activo", "archivado", "cerrado", "en_revision"])
          .optional(),
        priority: z.enum(["alta", "media", "baja"]).optional(),
        tags: z.array(sanitizedString(50)).optional(),
        hearingDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, hearingDate, tags, ...rest } = input;
      const existing = await getCaseById(id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await updateCase(id, ctx.user.id, {
        ...rest,
        tags: tags ? JSON.stringify(tags) : undefined,
        hearingDate: hearingDate
          ? new Date(hearingDate)
          : hearingDate === null
            ? undefined
            : undefined,
      });
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getCaseById(input.id, ctx.user.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await deleteCase(input.id, ctx.user.id);
      return { success: true };
    }),
});
