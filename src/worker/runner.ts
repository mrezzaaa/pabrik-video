import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { env } from "../lib/env";
import { prisma } from "../lib/prisma";
import { failProject } from "../lib/pipeline";
import { getQueue } from "../lib/queue";
import { runRender } from "../lib/agents/render";
import { runResearch } from "../lib/agents/research";
import { runScriptwriter } from "../lib/agents/scriptwriter";
import { runTts } from "../lib/agents/tts";
import { runVisualPlanner } from "../lib/agents/visual-planner";
import type { JobType } from "../lib/types";

const HEARTBEAT_KEY = "pabrik:video:worker:heartbeat";

type JobData = { projectId: string };

async function processJob(job: Job<JobData>) {
  const { projectId } = job.data;
  if (!projectId) throw new Error("Job tidak punya projectId.");

  const stage = job.name as JobType;
  console.info(`[worker] ${stage} start project=${projectId} attempt=${job.attemptsMade + 1}`);

  switch (stage) {
    case "research":
      await runResearch(projectId);
      break;
    case "scriptwriting":
      await runScriptwriter(projectId);
      break;
    case "tts":
      await runTts(projectId);
      break;
    case "visual-planning":
      await runVisualPlanner(projectId);
      break;
    case "render":
      await runRender(projectId);
      break;
    default:
      throw new Error(`Stage tidak dikenal: ${stage}`);
  }

  console.info(`[worker] ${stage} done project=${projectId}`);
}

export function startWorker() {
  const workerConnection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  const heartbeatConnection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const concurrency = Math.max(
    1,
    Number(process.env.WORKER_CONCURRENCY ?? 1),
  );

  const worker = new Worker<JobData>(env.queueName, processJob, {
    connection: workerConnection,
    concurrency,
    lockDuration: 15 * 60 * 1000,
    maxStalledCount: 1,
  });

  worker.on("active", (job) => {
    console.info(`[worker] active ${job.name} (${job.id})`);
  });

  worker.on("failed", async (job, error) => {
    if (!job) return;
    const attempts = job.opts.attempts ?? 1;
    const isFinal = job.attemptsMade >= attempts;
    const message = error instanceof Error ? error.message : String(error);

    console.error(
      `[worker] failed ${job.name} attempt=${job.attemptsMade}/${attempts} final=${isFinal}: ${message}`,
    );

    try {
      await prisma.job.updateMany({
        where: { projectId: job.data.projectId, type: job.name },
        data: { error: message.slice(0, 2000) },
      });
      if (isFinal) {
        await failProject(job.data.projectId, job.name as JobType, message);
      }
    } catch (dbError) {
      console.error("[worker] gagal update status kegagalan:", dbError);
    }
  });

  worker.on("error", (error) => {
    console.error("[worker] redis error:", error.message);
  });

  const heartbeat = setInterval(() => {
    heartbeatConnection
      .set(HEARTBEAT_KEY, String(Date.now()), "EX", 20)
      .catch((error) =>
        console.warn("[worker] heartbeat gagal:", (error as Error).message),
      );
  }, 5_000);

  heartbeatConnection
    .set(HEARTBEAT_KEY, String(Date.now()), "EX", 20)
    .catch(() => undefined);

  const shutdown = async (signal: string) => {
    console.info(`[worker] ${signal} diterima, menutup...`);
    clearInterval(heartbeat);
    await worker.close().catch(() => undefined);
    await heartbeatConnection.quit().catch(() => undefined);
    await workerConnection.quit().catch(() => undefined);
    await getQueue()
      .close()
      .catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  console.info(
    `[worker] online queue=${env.queueName} redis=${env.redisUrl} concurrency=${concurrency}`,
  );

  return worker;
}
