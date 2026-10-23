import { Worker, type Job } from "bullmq";
import { createWorkerRedisConnection } from "@/config/redis";
import { QUEUE_NAMES, type PipelineJobPayload } from "./flow";
import { runDeconstructorAgent } from "@/services/agents/deconstructor.service";
import { updateJobState } from "@/services/job-store";
import type { DeconstructionBlueprint } from "@/schemas/video-blueprint";

export function startDeconstructorWorker(): Worker {
  const worker = new Worker<PipelineJobPayload, DeconstructionBlueprint>(
    QUEUE_NAMES.DECONSTRUCTOR,
    async (job: Job<PipelineJobPayload>) => {
      const { jobId, topic } = job.data;

      await updateJobState(
        jobId,
        (prev) => ({
          status: "DECONSTRUCTING",
          progressPercent: 10,
          steps: { ...prev.steps, deconstructor: "ACTIVE" },
        }),
        {
          agent: "AGENT_1_DECONSTRUCTOR",
          level: "INFO",
          message: `Building 4-act layman cutaway storyboard for "${topic}"...`,
        }
      );

      try {
        const { blueprint, modelUsed } = await runDeconstructorAgent(topic);

        await updateJobState(
          jobId,
          (prev) => ({
            progressPercent: 24,
            blueprint,
            steps: { ...prev.steps, deconstructor: "COMPLETED" },
          }),
          {
            agent: "AGENT_1_DECONSTRUCTOR",
            level: "SUCCESS",
            message: `Layman Storyboard ready (${modelUsed}): ${blueprint.components.length} 3D cutaway parts, 4 acts (${blueprint.everydayCategory}).`,
          }
        );

        return blueprint;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateJobState(
          jobId,
          (prev) => ({
            status: "FAILED",
            error: msg,
            steps: { ...prev.steps, deconstructor: "FAILED" },
          }),
          {
            agent: "AGENT_1_DECONSTRUCTOR",
            level: "ERROR",
            message: `Deconstructor failed: ${msg}`,
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
