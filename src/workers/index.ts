import type { Worker } from "bullmq";
import { startDeconstructorWorker } from "./deconstructor.worker";
import { startScriptwriterWorker } from "./scriptwriter.worker";
import { startTtsWorker } from "./tts.worker";
import { startVisualWorker } from "./visual.worker";
import { startRendererWorker } from "./renderer.worker";

declare global {
  // eslint-disable-next-line no-var
  var __pabrikWorkersStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __pabrikActiveWorkers: Worker[] | undefined;
}

/**
 * Boots all 5 isolated BullMQ sub-agent workers.
 * Safe to invoke both as a standalone CLI worker runner (`npm run workers`)
 * and idempotently from the Next.js server process so jobs always execute out-of-the-box.
 */
export function ensureWorkersRunning(): Worker[] {
  if (global.__pabrikWorkersStarted && global.__pabrikActiveWorkers) {
    return global.__pabrikActiveWorkers;
  }

  global.__pabrikWorkersStarted = true;
  console.log("[Pabrik Video Workers] Booting 5 BullMQ Sub-Agent Workers...");

  const workers = [
    startDeconstructorWorker(),
    startScriptwriterWorker(),
    startTtsWorker(),
    startVisualWorker(),
    startRendererWorker(),
  ];

  global.__pabrikActiveWorkers = workers;

  console.log(
    "[Pabrik Video Workers] Active DAG Workers: Agent 1 (Deconstructor) -> Agent 2 (Scriptwriter) -> Agent 3 (TTS) -> Agent 4 (Visual) -> Agent 5 (Renderer)"
  );

  return workers;
}

// Execute immediately if run directly via `tsx src/workers/index.ts`
const isDirectExecution =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("workers/index.ts") || process.argv[1].endsWith("workers\\index.ts"));

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
