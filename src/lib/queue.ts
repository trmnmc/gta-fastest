import { Queue, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { config } from "./config";
import type { AnalyzeJobData, RenderJobData } from "./types";

// Shared Redis connection + queue handles. Imported by the API (to enqueue) and
// the worker (to consume). BullMQ requires maxRetriesPerRequest=null.
export const QUEUE_NAMES = {
  analyze: "analyze",
  render: "render",
} as const;

const globalForQueue = globalThis as unknown as {
  __redis?: IORedis;
  __analyzeQueue?: Queue<AnalyzeJobData>;
  __renderQueue?: Queue<RenderJobData>;
};

export function getRedis(): IORedis {
  if (!globalForQueue.__redis) {
    globalForQueue.__redis = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: null,
    });
  }
  return globalForQueue.__redis;
}

export const connection: ConnectionOptions = { url: config.redisUrl } as ConnectionOptions;

const defaultJobOptions = {
  attempts: 2,
  backoff: { type: "exponential" as const, delay: 5000 },
  removeOnComplete: { count: 200 },
  removeOnFail: { count: 200 },
};

export function analyzeQueue(): Queue<AnalyzeJobData> {
  if (!globalForQueue.__analyzeQueue) {
    // Cast works around BullMQ v5's verbose inferred Queue generics.
    globalForQueue.__analyzeQueue = new Queue(QUEUE_NAMES.analyze, {
      connection,
      defaultJobOptions,
    }) as unknown as Queue<AnalyzeJobData>;
  }
  return globalForQueue.__analyzeQueue;
}

export function renderQueue(): Queue<RenderJobData> {
  if (!globalForQueue.__renderQueue) {
    globalForQueue.__renderQueue = new Queue(QUEUE_NAMES.render, {
      connection,
      defaultJobOptions,
    }) as unknown as Queue<RenderJobData>;
  }
  return globalForQueue.__renderQueue;
}

export async function enqueueAnalyze(sourceVideoId: string) {
  // NB: BullMQ forbids ':' in custom job ids.
  return analyzeQueue().add("analyze", { sourceVideoId }, { jobId: `analyze-${sourceVideoId}` });
}

export async function enqueueRender(clipId: string) {
  return renderQueue().add("render", { clipId }, { jobId: `render-${clipId}-${Date.now()}` });
}
