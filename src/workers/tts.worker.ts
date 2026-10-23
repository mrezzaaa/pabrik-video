import { Worker, type Job } from "bullmq";
import { createWorkerRedisConnection } from "@/config/redis";
import { QUEUE_NAMES, type PipelineJobPayload } from "./flow";
import { runTtsSynchronizerAgent } from "@/services/agents/tts.service";
import { getJobState, updateJobState } from "@/services/job-store";
import type {
  ScriptArchitectOutput,
  TtsSynchronizerOutput,
} from "@/schemas/video-blueprint";

export function startTtsWorker(): Worker {
  const worker = new Worker<PipelineJobPayload, TtsSynchronizerOutput>(
    QUEUE_NAMES.TTS,
    async (job: Job<PipelineJobPayload>) => {
      const { jobId } = job.data;

      await updateJobState(
        jobId,
        (prev) => ({
          status: "SYNTHESIZING_TTS",
          progressPercent: 50,
          steps: { ...prev.steps, tts: "ACTIVE" },
        }),
        {
          agent: "AGENT_3_TTS",
          level: "INFO",
          message:
            "Synthesizing voiceover chunks via unlimitedtts.com (id-ID, Voice: Ethan, Speed: 1.1x) & extracting ffprobe frame timings...",
        }
      );

      try {
        const childrenValues = await job.getChildrenValues<ScriptArchitectOutput>();
        const childScript = Object.values(childrenValues)[0];
        const state = await getJobState(jobId);
        const script = childScript || state?.script;

        if (!script) {
          throw new Error("Missing ScriptArchitectOutput from Agent 2");
        }

        const ttsOutput = await runTtsSynchronizerAgent({
          jobId,
          script,
          onSegmentProgress: async (idx, total, audioUrl, durationSec) => {
            const pct = 50 + Math.round((idx / total) * 20);
            await updateJobState(
              jobId,
              () => ({
                progressPercent: pct,
              }),
              {
                agent: "AGENT_3_TTS",
                level: "INFO",
                message: `Segment ${idx}/${total} synthesized (${durationSec}s -> ${Math.ceil(durationSec * 60)} frames @ 60fps): ${audioUrl}`,
              }
            );
          },
        });

        await updateJobState(
          jobId,
          (prev) => ({
            progressPercent: 72,
            tts: ttsOutput,
            steps: { ...prev.steps, tts: "COMPLETED" },
          }),
          {
            agent: "AGENT_3_TTS",
            level: "SUCCESS",
            message: `Audio timing synchronized: ${ttsOutput.totalDurationInSeconds}s (${ttsOutput.totalDurationInFrames} frames @ 60fps) via ${ttsOutput.engineUsed}.`,
          }
        );

        return ttsOutput;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateJobState(
          jobId,
          (prev) => ({
            status: "FAILED",
            error: msg,
            steps: { ...prev.steps, tts: "FAILED" },
          }),
          {
            agent: "AGENT_3_TTS",
            level: "ERROR",
            message: `TTS Worker failed: ${msg}`,
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
