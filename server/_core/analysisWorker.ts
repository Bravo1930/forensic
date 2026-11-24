import type { Job } from "bullmq";
import {
  processForensicAnalysis,
  processContradictionAnalysis,
  toAnalysisErrorMessage,
} from "../analysisProcessor";
import { updateAnalysis } from "../db";
import type { AnalysisJobData } from "./queue";

export async function handleAnalysisJob(
  job: Job<AnalysisJobData>
): Promise<void> {
  const data = job.data;
  const caseData = {
    caseTitle: data.caseTitle,
    caseDescription: data.caseDescription,
    caseType: data.caseType,
    evidenceList: data.evidenceList,
    userName: data.userName,
    startTime: data.startTime,
    forceFresh: data.forceFresh,
  };

  try {
    switch (data.type) {
      case "forensic":
        await processForensicAnalysis(
          data.analysisId,
          data.userId,
          data.title,
          caseData
        );
        break;
      case "contradiction":
        await processContradictionAnalysis(
          data.analysisId,
          data.userId,
          data.title,
          caseData
        );
        break;
    }
  } catch (error) {
    // The processor already marks the row "error" with a reason; this is
    // a safety net for the last attempt in case that write failed, so a
    // failed job can never leave the analysis stuck in "procesando".
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade + 1 >= attempts) {
      try {
        await updateAnalysis(data.analysisId, data.userId, {
          status: "error",
          error: toAnalysisErrorMessage(error),
        });
      } catch {
        // Nothing else we can do; the error is re-thrown and logged below.
      }
    }
    throw error;
  }
}
