import { Worker, type Job } from "bullmq";
import { createWorkerRedisConnection } from "@/config/redis";
import { QUEUE_NAMES, type PipelineJobPayload } from "./flow";
import { runScriptwriterAgent } from "@/services/agents/scriptwriter.service";
import { getJobState, updateJobState } from "@/services/job-store";
import type {
  DeconstructionBlueprint,
  ScriptArchitectOutput,
} from "@/schemas/video-blueprint";

export function startScriptwriterWorker(): Worker {
  const worker = new Worker<PipelineJobPayload, ScriptArchitectOutput>(
    QUEUE_NAMES.SCRIPTWRITER,
    async (job: Job<PipelineJobPayload>) => {
      const { jobId } = job.data;

      await updateJobState(
        jobId,
        (prev) => ({
          status: "SCRIPTING",
          progressPercent: 28,
          steps: { ...prev.steps, scriptwriter: "ACTIVE" },
        }),
        {
          agent: "AGENT_2_SCRIPTWRITER",
          level: "INFO",
          message:
            'Writing Indonesian "bedah mekanisme" narration, synchronous top HUD telemetry channels, and callout triggers...',
        }
      );

      try {
        const childrenValues = await job.getChildrenValues<DeconstructionBlueprint>();
        const childBlueprint = Object.values(childrenValues)[0];
        const state = await getJobState(jobId);
        const blueprint = childBlueprint || state?.blueprint;

        if (!blueprint) {
          throw new Error("Missing DeconstructionBlueprint from Agent 1");
        }

        const { script, modelUsed } = await runScriptwriterAgent(blueprint);

        await updateJobState(
          jobId,
          (prev) => ({
            progressPercent: 45,
            script,
            steps: { ...prev.steps, scriptwriter: "COMPLETED" },
          }),
          {
            agent: "AGENT_2_SCRIPTWRITER",
            level: "SUCCESS",
            message: `Script & Telemetry architected (${modelUsed}): ${script.segments.length} segments, ${script.telemetryChannels.length} live telemetry channels.`,
          }
        );

        return script;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateJobState(
          jobId,
          (prev) => ({
            status: "FAILED",
            error: msg,
            steps: { ...prev.steps, scriptwriter: "FAILED" },
          }),
          {
            agent: "AGENT_2_SCRIPTWRITER",
            level: "ERROR",
            message: `Scriptwriter failed: ${msg}`,
          }
        );
        throw err;
      }
    },
    {
      connection: createWorkerRedisConnection(),
      concurrency: 2,
    }
  );

  return worker;
}
