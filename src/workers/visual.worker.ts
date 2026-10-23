import { Worker, type Job } from "bullmq";
import { createWorkerRedisConnection } from "@/config/redis";
import { QUEUE_NAMES, type PipelineJobPayload } from "./flow";
import { runVisualChoreographerAgent } from "@/services/agents/visual.service";
import { getJobState, updateJobState } from "@/services/job-store";
import type {
  RemotionCompositionProps,
  TtsSynchronizerOutput,
} from "@/schemas/video-blueprint";

export function startVisualWorker(): Worker {
  const worker = new Worker<PipelineJobPayload, RemotionCompositionProps>(
    QUEUE_NAMES.VISUAL,
    async (job: Job<PipelineJobPayload>) => {
      const { jobId, aspectRatioMode } = job.data;

      await updateJobState(
        jobId,
        (prev) => ({
          status: "CHOREOGRAPHING_VISUALS",
          progressPercent: 76,
          steps: { ...prev.steps, visual: "ACTIVE" },
        }),
        {
          agent: "AGENT_4_VISUAL",
          level: "INFO",
          message:
            "Choreographing Isometric 3D vector layers, camera exploded-view keyframes, and 45° leader-line callout anchors...",
        }
      );

      try {
        const childrenValues = await job.getChildrenValues<TtsSynchronizerOutput>();
        const childTts = Object.values(childrenValues)[0];
        const state = await getJobState(jobId);

        const blueprint = state?.blueprint;
        const script = state?.script;
        const tts = childTts || state?.tts;

        if (!blueprint || !script || !tts) {
          throw new Error("Missing upstream artifacts (blueprint, script, or tts) for Agent 4");
        }

        const compositionProps = await runVisualChoreographerAgent({
          jobId,
          aspectRatioMode: aspectRatioMode ?? state.aspectRatioMode,
          blueprint,
          script,
          tts,
        });

        await updateJobState(
          jobId,
          (prev) => ({
            status: "READY_FOR_PREVIEW",
            progressPercent: 85,
            compositionProps,
            steps: { ...prev.steps, visual: "COMPLETED" },
          }),
          {
            agent: "AGENT_4_VISUAL",
            level: "SUCCESS",
            message: `RemotionCompositionProps compiled: ${compositionProps.isometricLayers.length} isometric layers, ${compositionProps.callouts.length} frame-synced callouts (${compositionProps.width}x${compositionProps.height} @ ${compositionProps.fps}fps).`,
          }
        );

        return compositionProps;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateJobState(
          jobId,
          (prev) => ({
            status: "FAILED",
            error: msg,
            steps: { ...prev.steps, visual: "FAILED" },
          }),
          {
            agent: "AGENT_4_VISUAL",
            level: "ERROR",
            message: `Visual Worker failed: ${msg}`,
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
