import type { Job } from "bullmq";
import {
  processForensicAnalysis,
  processContradictionAnalysis,
} from "../analysisProcessor";
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
}
