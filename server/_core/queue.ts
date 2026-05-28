import { Queue as BullQueue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import type { ForensicEvidence } from "../forensicAI";

const REDIS_URL = process.env.REDIS_URL ?? "";

let redisAvailable = false;
let redis: Redis | null = null;
let analysisQueue: BullQueue | null = null;

export interface ForensicAnalysisJobData {
  type: "forensic";
  analysisId: number;
  userId: number;
  caseId: number;
  caseTitle: string;
  caseDescription: string | null;
  caseType: string;
  title: string;
  evidenceList: ForensicEvidence[];
  userName: string;
  startTime: number;
  forceFresh?: boolean;
}

export interface ContradictionAnalysisJobData {
  type: "contradiction";
  analysisId: number;
  userId: number;
  caseId: number;
  caseTitle: string;
  caseDescription: string | null;
  caseType: string;
  title: string;
  evidenceList: ForensicEvidence[];
  userName: string;
  startTime: number;
  forceFresh?: boolean;
}

export type AnalysisJobData =
  | ForensicAnalysisJobData
  | ContradictionAnalysisJobData;

async function tryConnectRedis(): Promise<boolean> {
  if (!REDIS_URL) {
    return false;
  }

  try {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      retryStrategy: () => null,
      lazyConnect: true,
    });

    await redis.connect();
    redisAvailable = true;

    analysisQueue = new BullQueue("forensic-legal", {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
      },
    });

    return true;
  } catch {
    redis = null;
    analysisQueue = null;
    return false;
  }
}

export async function enqueueAnalysis(
  data: ForensicAnalysisJobData
): Promise<boolean> {
  if (redisAvailable && analysisQueue) {
    await analysisQueue.add("forensic-analysis", data);
    return true;
  }
  return false;
}

export async function enqueueContradictionAnalysis(
  data: ContradictionAnalysisJobData
): Promise<boolean> {
  if (redisAvailable && analysisQueue) {
    await analysisQueue.add("contradiction-analysis", data);
    return true;
  }
  return false;
}

export type JobHandler = (job: Job<AnalysisJobData>) => Promise<void>;

let worker: Worker | null = null;

export async function startWorker(handler: JobHandler): Promise<boolean> {
  if (worker) return true;

  const connected = await tryConnectRedis();
  if (!connected) {
    return false;
  }

  worker = new Worker<AnalysisJobData>(
    "forensic-legal",
    async job => {
      await handler(job);
    },
    {
      connection: redis!,
      concurrency: 3,
      lockDuration: 300000,
      stalledInterval: 60000,
    }
  );

  worker.on("completed", job => {
    console.log(`[Queue] Job ${job.id} (${job.data.type}) completed`);
  });

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(
        `[Queue] Job ${job.id} (${job.data.type}) failed:`,
        err.message
      );
    }
  });

  worker.on("error", err => {
    if (!err.message.includes("ECONNREFUSED")) {
      console.error("[Queue] Worker error:", err.message);
    }
  });

  return true;
}

export async function shutdownQueue(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
  if (redis) {
    await redis.quit();
    redis = null;
  }
  redisAvailable = false;
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}
