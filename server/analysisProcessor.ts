import { updateAnalysis, incrementAnalysesUsed } from "./db";
import {
  runForensicAnalysis,
  runContradictionAnalysis,
  type ForensicEvidence,
} from "./forensicAI";
import { notifyOwner } from "./_core/notification";

interface AnalysisCaseData {
  caseTitle: string;
  caseDescription: string | null;
  caseType: string;
  evidenceList: ForensicEvidence[];
  userName: string;
  startTime: number;
  forceFresh?: boolean;
}

/**
 * Turns a raw failure into the short, user-facing reason stored on the
 * analysis row. AI jobs most often fail because the Ollama backend is
 * unreachable in cloud, so that case gets a plain-Spanish message instead
 * of a raw fetch/connection error.
 */
export function toAnalysisErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Error desconocido";
  const lower = message.toLowerCase();
  if (
    lower.includes("ollama") ||
    lower.includes("econnrefused") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("enotfound") ||
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("network")
  ) {
    return "El motor de IA (Ollama) no está disponible en este momento. Vuelve a intentarlo más tarde.";
  }
  return message.length > 300 ? message.slice(0, 300) + "…" : message;
}

export async function processForensicAnalysis(
  analysisId: number,
  userId: number,
  analysisTitle: string,
  caseData: AnalysisCaseData
): Promise<void> {
  const {
    caseTitle,
    caseDescription,
    caseType,
    evidenceList,
    userName,
    startTime,
    forceFresh,
  } = caseData;

  let aiResult;
  try {
    aiResult = await runForensicAnalysis(
      caseTitle,
      caseDescription,
      caseType,
      evidenceList,
      userName,
      forceFresh
    );
  } catch (error: unknown) {
    console.error("[AnalysisProcessor] ❌ ERROR in runForensicAnalysis:", {
      analysisId,
      userId,
      analysisTitle,
      caseTitle,
      caseType,
      evidenceCount: evidenceList?.length,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              cause: error.cause,
            }
          : error,
      timestamp: new Date().toISOString(),
    });
    // Persist the failure reason on the row so the UI can show it and
    // offer a retry, instead of leaving the analysis stuck in "procesando"
    // (queue path) or in "error" with no explanation (inline path).
    try {
      await updateAnalysis(analysisId, userId, {
        status: "error",
        error: toAnalysisErrorMessage(error),
      });
    } catch {
      // If the DB write itself fails, the worker/inline caller still
      // re-throws and logs; the row keeps its previous state.
    }
    throw error;
  }

  const processingTimeMs = Date.now() - startTime;

  await updateAnalysis(analysisId, userId, {
    status: "completado",
    executiveSummary: JSON.stringify(aiResult.executiveSummary),
    expertOpinion: JSON.stringify(aiResult.expertOpinion),
    prosecutionTheory: JSON.stringify(aiResult.prosecutionTheory),
    defenseTheory: JSON.stringify(aiResult.defenseTheory),
    inconsistencies: JSON.stringify(aiResult.inconsistencies),
    suspiciousPatterns: JSON.stringify(aiResult.suspiciousPatterns),
    keyFindings: JSON.stringify(aiResult.keyFindings),
    timelineEvents: JSON.stringify(aiResult.timelineEvents),
    relationshipGraph: JSON.stringify(aiResult.relationshipGraph),
    criticalAlertSent: aiResult.hasCriticalFindings,
    processingTimeMs,
  });

  await incrementAnalysesUsed(userId);

  try {
    await notifyOwner({
      title: "Análisis Forense Completado",
      content: `El usuario ${userName} completó el análisis "${analysisTitle}" del caso "${caseTitle}".\n\nHallazgos críticos: ${aiResult.hasCriticalFindings ? "SÍ" : "No"}\nEventos en timeline: ${aiResult.timelineEvents.length}\nHallazgos clave: ${aiResult.keyFindings.length}\n\nAnálisis ID: ${analysisId}`,
    });
  } catch (e) {
    console.warn("[AnalysisProcessor] Notification failed:", e);
  }
}

export async function processContradictionAnalysis(
  analysisId: number,
  userId: number,
  analysisTitle: string,
  caseData: AnalysisCaseData
): Promise<void> {
  const {
    caseTitle,
    caseDescription,
    caseType,
    evidenceList,
    userName,
    startTime,
    forceFresh,
  } = caseData;

  let aiResult;
  try {
    aiResult = await runContradictionAnalysis(
      caseTitle,
      caseDescription,
      caseType,
      evidenceList,
      userName,
      forceFresh
    );
  } catch (error: unknown) {
    console.error("[AnalysisProcessor] ❌ ERROR in runContradictionAnalysis:", {
      analysisId,
      userId,
      analysisTitle,
      caseTitle,
      caseType,
      evidenceCount: evidenceList?.length,
      error:
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              cause: error.cause,
            }
          : error,
      timestamp: new Date().toISOString(),
    });
    // Persist the failure reason on the row (see processForensicAnalysis).
    try {
      await updateAnalysis(analysisId, userId, {
        status: "error",
        error: toAnalysisErrorMessage(error),
      });
    } catch {
      // DB write failed; the caller still re-throws and logs.
    }
    throw error;
  }

  const processingTimeMs = Date.now() - startTime;

  await updateAnalysis(analysisId, userId, {
    status: "completado",
    contradictionSummary: JSON.stringify(aiResult.contradictionSummary),
    factsTable: JSON.stringify(aiResult.factsTable),
    weakPoints: JSON.stringify(aiResult.weakPoints),
    keyFindings: JSON.stringify(aiResult.keyFindings),
    timelineEvents: JSON.stringify(aiResult.timelineOfEvents),
    criticalAlertSent: aiResult.hasCriticalContradictions,
    processingTimeMs,
  });

  await incrementAnalysesUsed(userId);

  try {
    await notifyOwner({
      title: "Análisis de Contradicciones Completado",
      content: `El usuario ${userName} completó el análisis de contradicciones "${analysisTitle}" del caso "${caseTitle}".\n\nContradicciones críticas: ${aiResult.hasCriticalContradictions ? "SÍ" : "No"}\nHallazgos: ${aiResult.keyFindings.length}\n\nAnálisis ID: ${analysisId}`,
    });
  } catch (e) {
    console.warn("[AnalysisProcessor] Notification failed:", e);
  }
}

export type { AnalysisCaseData };
