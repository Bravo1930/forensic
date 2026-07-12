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
