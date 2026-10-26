import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "./env";
import type { JobType } from "./types";

const globalForQueue = globalThis as unknown as {
  pabrikRedis: IORedis | undefined;
  pabrikQueue: Queue | undefined;
};

export function getRedisConnection() {
  if (!globalForQueue.pabrikRedis) {
    globalForQueue.pabrikRedis = new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return globalForQueue.pabrikRedis;
}

export function getQueue() {
  if (!globalForQueue.pabrikQueue) {
    globalForQueue.pabrikQueue = new Queue(env.queueName, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 4_000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return globalForQueue.pabrikQueue;
}

export const STAGE_SEQUENCE: JobType[] = [
  "research",
  "scriptwriting",
  "tts",
  "visual-planning",
  "render",
];

export function nextStage(stage: JobType): JobType | null {
  const index = STAGE_SEQUENCE.indexOf(stage);
  if (index === -1 || index === STAGE_SEQUENCE.length - 1) return null;
  return STAGE_SEQUENCE[index + 1];
}

export async function removeStageJob(projectId: string, stage: JobType) {
  const queue = getQueue();
  const job = await queue.getJob(`${projectId}-${stage}`);
  if (job) {
    await job.remove().catch(() => undefined);
  }
}

export async function enqueueStage(
  projectId: string,
  stage: JobType,
  options: { force?: boolean } = {},
) {
  const queue = getQueue();
  if (options.force) {
    await removeStageJob(projectId, stage);
  }
  return queue.add(
    stage,
    { projectId },
    {
      jobId: `${projectId}-${stage}`,
    },
  );
}

export async function getQueueSnapshot() {
  const queue = getQueue();
  const counts = await queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
  );

  return {
    waiting: counts.waiting ?? 0,
    active: counts.active ?? 0,
    completed: counts.completed ?? 0,
    failed: counts.failed ?? 0,
    delayed: counts.delayed ?? 0,
  };
}
