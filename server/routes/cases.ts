import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { z } from "zod";
import {
  createCase,
  getCasesByUser,
  getCaseById,
  updateCase,
  deleteCase,
  countCasesByUser,
  getSubscription,
  upsertUser,
  getUserByOpenId,
} from "../db";
import { sdk } from "../_core/sdk";
import type { User } from "../../drizzle/schema";

const router = Router();

// Demo user constants
const DEMO_OPENID = "demo-user-forensic-legal";
const DEMO_USER_NAME = "Usuario Demo";
const DEMO_USER_EMAIL = "demo@forensiclegal.local";

// Validation schema for creating a case
const createCaseSchema = z.object({
  title: z.string().min(1).max(255),
  caseNumber: z.string().max(100).optional(),
  description: z.string().optional(),
  clientName: z.string().max(255).optional(),
  opposingParty: z.string().max(255).optional(),
  court: z.string().max(255).optional(),
  jurisdiction: z.string().max(255).optional(),
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
  tags: z.array(z.string()).default([]),
  hearingDate: z.string().optional(),
});

/**
 * Get or create demo user for development/testing
 */
async function getOrCreateDemoUser(): Promise<User> {
  let user = await getUserByOpenId(DEMO_OPENID);

  if (!user) {
    console.log("[Demo] Creating demo user...");
    await upsertUser({
      openId: DEMO_OPENID,
      name: DEMO_USER_NAME,
      email: DEMO_USER_EMAIL,
      loginMethod: "demo",
      lastSignedIn: new Date(),
      role: "user",
    });
    user = await getUserByOpenId(DEMO_OPENID);
  }

  if (!user) {
    throw new Error("Failed to create demo user");
  }

  return user;
}

/**
 * Middleware to authenticate user
 * In development mode, falls back to demo user if no valid session
 */
async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Try to authenticate with real session
    const user = await sdk.authenticateRequest(req);
    (req as any).user = user;
    console.log(`[Auth] Authenticated user: ${user.name} (${user.id})`);
    next();
  } catch (error) {
    // In development, fall back to demo user
    if (process.env.NODE_ENV === "development") {
      try {
        const demoUser = await getOrCreateDemoUser();
        (req as any).user = demoUser;
        console.log(
          `[Auth] Using demo user in development mode: ${demoUser.name} (${demoUser.id})`
        );
        next();
      } catch (demoError) {
        console.error("[Auth] Failed to create demo user:", demoError);
        return res.status(401).json({
          error: "No autenticado",
          message:
            "Por favor inicia sesión o verifica la conexión a la base de datos",
        });
      }
    } else {
      return res
        .status(401)
        .json({ error: "No autenticado", message: "Por favor inicia sesión" });
    }
  }
}

// GET /api/cases - List all cases for the authenticated user
router.get("/", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const cases = await getCasesByUser(user.id);
    return res.json({ success: true, cases });
  } catch (error) {
    console.error("Error fetching cases:", error);
    return res.status(500).json({
      error: "Error interno",
      message: "No se pudieron obtener los casos",
    });
  }
});

// POST /api/cases - Create a new case
router.post("/", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;

    // Validate input
    const parseResult = createCaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Datos inválidos",
        message: parseResult.error.issues
          .map(e => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
    }

    const input = parseResult.data;

    // Check subscription limits (skip for demo user)
    if (user.openId !== DEMO_OPENID) {
      const sub = await getSubscription(user.id);
      if (sub) {
        const count = await countCasesByUser(user.id);
        if (count >= sub.casesLimit) {
          return res.status(403).json({
            error: "Límite alcanzado",
            message: `Has alcanzado el límite de ${sub.casesLimit} casos activos en tu plan ${sub.plan}. Actualiza tu suscripción para crear más casos.`,
          });
        }
      }
    }

    // Create the case
    const result = await createCase({
      userId: user.id,
      title: input.title,
      caseNumber: input.caseNumber,
      description: input.description,
      clientName: input.clientName,
      opposingParty: input.opposingParty,
      court: input.court,
      jurisdiction: input.jurisdiction,
      caseType: input.caseType,
      priority: input.priority,
      tags: Array.isArray(input.tags) ? JSON.stringify(input.tags) : input.tags,
      status: "activo",
      hearingDate: input.hearingDate ? new Date(input.hearingDate) : undefined,
    });

    console.log(`[Cases] Created case for user ${user.id}: ${input.title}`);
    return res.status(201).json({ success: true, case: result });
  } catch (error) {
    console.error("Error creating case:", error);
    return res
      .status(500)
      .json({ error: "Error interno", message: "No se pudo crear el caso" });
  }
});

// GET /api/cases/:id - Get a specific case
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const caseId = parseInt(req.params.id);

    if (isNaN(caseId)) {
      return res.status(400).json({
        error: "ID inválido",
        message: "El ID del caso debe ser un número",
      });
    }

    const caseData = await getCaseById(caseId, user.id);
    if (!caseData) {
      return res
        .status(404)
        .json({ error: "No encontrado", message: "Caso no encontrado" });
    }

    return res.json({ success: true, case: caseData });
  } catch (error) {
    console.error("Error fetching case:", error);
    return res
      .status(500)
      .json({ error: "Error interno", message: "No se pudo obtener el caso" });
  }
});

// Allowed fields for PATCH (whitelist)
const updateCaseSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  caseNumber: z.string().max(100).optional(),
  description: z.string().optional(),
  clientName: z.string().max(255).optional(),
  opposingParty: z.string().max(255).optional(),
  court: z.string().max(255).optional(),
  jurisdiction: z.string().max(255).optional(),
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
  priority: z.enum(["alta", "media", "baja"]).optional(),
  tags: z.array(z.string()).optional(),
  hearingDate: z.string().optional(),
  status: z.enum(["activo", "cerrado", "archivado"]).optional(),
});

// PATCH /api/cases/:id - Update a case
router.patch("/:id", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const caseId = parseInt(req.params.id);

    if (isNaN(caseId)) {
      return res.status(400).json({
        error: "ID inválido",
        message: "El ID del caso debe ser un número",
      });
    }

    const existing = await getCaseById(caseId, user.id);
    if (!existing) {
      return res
        .status(404)
        .json({ error: "No encontrado", message: "Caso no encontrado" });
    }

    const parseResult = updateCaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Datos inválidos",
        message: parseResult.error.issues
          .map(e => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      });
    }

    const updateData: Record<string, unknown> = {};
    if (parseResult.data.hearingDate !== undefined) {
      updateData.hearingDate = parseResult.data.hearingDate
        ? new Date(parseResult.data.hearingDate)
        : null;
    }
    for (const [key, value] of Object.entries(parseResult.data)) {
      if (key !== "hearingDate" && value !== undefined) {
        updateData[key] = value;
      }
    }

    await updateCase(caseId, user.id, updateData);

    return res.json({
      success: true,
      message: "Caso actualizado exitosamente",
    });
  } catch (error) {
    console.error("Error updating case:", error);
    return res.status(500).json({
      error: "Error interno",
      message: "No se pudo actualizar el caso",
    });
  }
});

// DELETE /api/cases/:id - Delete a case
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const caseId = parseInt(req.params.id);

    if (isNaN(caseId)) {
      return res.status(400).json({
        error: "ID inválido",
        message: "El ID del caso debe ser un número",
      });
    }

    const existing = await getCaseById(caseId, user.id);
    if (!existing) {
      return res
        .status(404)
        .json({ error: "No encontrado", message: "Caso no encontrado" });
    }

    await deleteCase(caseId, user.id);

    return res.json({ success: true, message: "Caso eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting case:", error);
    return res
      .status(500)
      .json({ error: "Error interno", message: "No se pudo eliminar el caso" });
  }
});

export default router;
