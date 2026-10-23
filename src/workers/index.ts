import type { Worker } from "bullmq";
import { startDeconstructorWorker } from "./deconstructor.worker";
import { startScriptwriterWorker } from "./scriptwriter.worker";
import { startTtsWorker } from "./tts.worker";
import { startVisualWorker } from "./visual.worker";
import { startRendererWorker } from "./renderer.worker";

/**
 * Increment this version whenever worker logic, prompts, or renderer ports change
 * so Next.js dev mode automatically closes stale workers and boots the updated ones.
 */
const WORKER_CODE_VERSION = "v5-antigravity-cascade";

declare global {
  // eslint-disable-next-line no-var
  var __pabrikWorkersVersion: string | undefined;
  // eslint-disable-next-line no-var
  var __pabrikActiveWorkers: Worker[] | undefined;
}

export function ensureWorkersRunning(): Worker[] {
  if (
    global.__pabrikWorkersVersion === WORKER_CODE_VERSION &&
    global.__pabrikActiveWorkers
  ) {
    return global.__pabrikActiveWorkers;
  }

  // If an older version of workers is running in memory, close them first
  if (global.__pabrikActiveWorkers && global.__pabrikActiveWorkers.length > 0) {
    console.log(
      `[Pabrik Video Workers] Replacing stale workers (${global.__pabrikWorkersVersion ?? "v1"}) with ${WORKER_CODE_VERSION}...`
    );
    const oldWorkers = global.__pabrikActiveWorkers;
    void Promise.allSettled(oldWorkers.map((w) => w.close()));
  }

  global.__pabrikWorkersVersion = WORKER_CODE_VERSION;
  console.log(
    `[Pabrik Video Workers] Booting 5 BullMQ Sub-Agent Workers (${WORKER_CODE_VERSION})...`
  );

  const workers = [
    startDeconstructorWorker(),
    startScriptwriterWorker(),
    startTtsWorker(),
    startVisualWorker(),
    startRendererWorker(),
  ];

  global.__pabrikActiveWorkers = workers;

  return workers;
}

// Execute immediately if run directly via `tsx src/workers/index.ts`
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("workers/index.ts") ||
    process.argv[1].endsWith("workers\\index.ts"));

if (isDirectExecution) {
  const workers = ensureWorkersRunning();

  const shutdown = async () => {
    console.log("\n[Pabrik Video Workers] Gracefully closing workers...");
    await Promise.allSettled(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
