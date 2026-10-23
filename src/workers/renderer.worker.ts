import { Worker, type Job } from "bullmq";
import { createWorkerRedisConnection } from "@/config/redis";
import { QUEUE_NAMES, type PipelineJobPayload } from "./flow";
import { runRemotionRenderAgent } from "@/services/agents/renderer.service";
import { getJobState, updateJobState } from "@/services/job-store";
import type { RemotionCompositionProps } from "@/schemas/video-blueprint";

export function startRendererWorker(): Worker {
  const worker = new Worker<PipelineJobPayload, { outputMp4Url: string }>(
    QUEUE_NAMES.RENDERER,
    async (job: Job<PipelineJobPayload>) => {
      const { jobId, autoRenderMp4 = true } = job.data;

      const childrenValues = await job.getChildrenValues<RemotionCompositionProps>();
      const childProps = Object.values(childrenValues)[0];
      const state = await getJobState(jobId);
      const compositionProps = childProps || state?.compositionProps;

      if (!compositionProps) {
        throw new Error("Missing RemotionCompositionProps for Agent 5 Renderer");
      }

      if (!autoRenderMp4) {
        await updateJobState(
          jobId,
          (prev) => ({
            status: "READY_FOR_PREVIEW",
            progressPercent: 90,
            steps: { ...prev.steps, renderer: "PENDING" },
          }),
          {
            agent: "AGENT_5_RENDERER",
            level: "INFO",
            message:
              "Composition ready in Studio for interactive Remotion Player preview. Trigger MP4 render anytime.",
          }
        );
        return { outputMp4Url: "" };
      }

      await updateJobState(
        jobId,
        (prev) => ({
          status: "RENDERING_MP4",
          progressPercent: 88,
          steps: { ...prev.steps, renderer: "ACTIVE" },
        }),
        {
          agent: "AGENT_5_RENDERER",
          level: "INFO",
          message: `Executing @remotion/renderer (1080p @ ${compositionProps.fps}fps, ${compositionProps.durationInFrames} frames)...`,
        }
      );

      try {
        const { outputMp4Url } = await runRemotionRenderAgent({
          jobId,
          compositionProps,
          onProgress: async (pct) => {
            const overallPct = Math.min(99, 88 + Math.round((pct / 100) * 11));
            await updateJobState(
              jobId,
              () => ({
                progressPercent: overallPct,
              }),
              {
                agent: "AGENT_5_RENDERER",
                level: "INFO",
                message: `Remotion headless frame rendering: ${pct}% complete...`,
              }
            );
          },
        });

        await updateJobState(
          jobId,
          (prev) => ({
            status: "COMPLETED",
            progressPercent: 100,
            outputMp4Url,
            steps: { ...prev.steps, renderer: "COMPLETED" },
          }),
          {
            agent: "AGENT_5_RENDERER",
            level: "SUCCESS",
            message: `Final 1080p/60fps MP4 rendered to ${outputMp4Url}`,
          }
        );

        return { outputMp4Url };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateJobState(
          jobId,
          (prev) => ({
            status: "READY_FOR_PREVIEW",
            error: `MP4 Render Error: ${msg}`,
            steps: { ...prev.steps, renderer: "FAILED" },
          }),
          {
            agent: "AGENT_5_RENDERER",
            level: "ERROR",
            message: `Headless MP4 render failed (${msg}). Web Studio preview remains available.`,
          }
        );
        throw err;
      }
    },
    {
      connection: createWorkerRedisConnection(),
      concurrency: 1,
    }
  );

  return worker;
}
