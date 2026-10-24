import path from "path";
import fs from "fs";
import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redis";
import { prisma } from "../lib/prisma";
import { searxng } from "../lib/searxng";
import { omniroute } from "../lib/omniroute";
import { ttsEngine } from "../lib/tts-ethan";
import { computeWordTimestamps } from "../lib/subtitle-sync";
import { AssetFetcher } from "../lib/asset-fetcher";
import { remotionRenderer } from "../lib/renderer";
import { VideoJobData, VIDEO_PIPELINE_QUEUE_NAME } from "./queue";
import { Storyboard, VideoProps } from "../lib/types";

async function logTelemetry(
  jobId: string,
  stage: string,
  message: string,
  level: "INFO" | "WARN" | "ERROR" | "TELEMETRY" = "INFO",
  metadata?: any
) {
  console.log(`[${level}][${stage}] [Job ${jobId}]: ${message}`);
  try {
    await prisma.jobLog.create({
      data: {
        jobId,
        stage,
        level,
        message,
        metadata: metadata ? metadata : undefined,
      },
    });
  } catch (err) {
    console.error("Failed to write job log:", err);
  }
}

export const videoWorker = new Worker<VideoJobData>(
  VIDEO_PIPELINE_QUEUE_NAME,
  async (job: Job<VideoJobData>) => {
    const { jobId, topic, modelId, pexelsApiKey } = job.data;
    const startTime = Date.now();

    await logTelemetry(
      jobId,
      "INIT",
      `Booting pipeline orchestrator for topic: "${topic}" using model: "${modelId}"`
    );

    try {
      // ----------------------------------------------------------------------
      // STAGE 1: SearXNG Fact Extraction
      // ----------------------------------------------------------------------
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          status: "STAGE_1_RECON",
          currentStage: "01_SEARXNG_RECON",
          progress: 10,
        },
      });

      const t1Start = Date.now();
      await logTelemetry(
        jobId,
        "01_SEARXNG_RECON",
        "Synthesizing targeted search queries..."
      );

      const queries = await omniroute.generateSearchQueries(topic, modelId);
      await logTelemetry(
        jobId,
        "01_SEARXNG_RECON",
        `Dispatching ${queries.length} queries to SearXNG`,
        "INFO",
        { queries }
      );

      const knowledgeBase = await searxng.aggregateKnowledge(queries);
      const t1Elapsed = Date.now() - t1Start;

      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          searchQueries: queries,
          knowledgeBase,
          progress: 25,
        },
      });

      await logTelemetry(
        jobId,
        "01_SEARXNG_RECON",
        `SearXNG Recon Completed in ${t1Elapsed}ms. Aggregated facts ready.`
      );

      // ----------------------------------------------------------------------
      // STAGE 2: Model-Agnostic Master Prompt & Storyboard Director
      // ----------------------------------------------------------------------
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          status: "STAGE_2_DIRECTOR",
          currentStage: "02_LLM_DIRECTOR",
          progress: 30,
        },
      });

      const t2Start = Date.now();
      await logTelemetry(
        jobId,
        "02_LLM_DIRECTOR",
        "Executing Director LLM with strict spoken Indonesian & cutaway architecture..."
      );

      const storyboard: Storyboard = await omniroute.generateStoryboard(
        topic,
        knowledgeBase,
        modelId
      );

      const t2Elapsed = Date.now() - t2Start;
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          storyboard: storyboard as any,
          progress: 45,
        },
      });

      await logTelemetry(
        jobId,
        "02_LLM_DIRECTOR",
        `Storyboard compiled in ${t2Elapsed}ms. Generated ${storyboard.scenes.length} scenes.`,
        "INFO",
        { title: storyboard.videoTitle, sceneCount: storyboard.scenes.length }
      );

      // ----------------------------------------------------------------------
      // STAGE 3: UnlimitedTTS Automation & Word-Level Sync
      // ----------------------------------------------------------------------
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          status: "STAGE_3_TTS_SYNC",
          currentStage: "03_ETHAN_TTS_SYNC",
          progress: 50,
        },
      });

      const t3Start = Date.now();
      const audioDir = path.join(
        process.cwd(),
        "public",
        "assets",
        jobId,
        "audio"
      );
      if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

      const FPS = 30;
      let totalVideoFrames = 0;

      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scene = storyboard.scenes[i];
        const audioPath = path.join(audioDir, `scene-${scene.sceneId}.mp3`);

        await logTelemetry(
          jobId,
          "03_ETHAN_TTS_SYNC",
          `Synthesizing scene ${scene.sceneId}/${storyboard.scenes.length}: "${scene.narration.slice(0, 35)}..."`
        );

        const ttsResult = await ttsEngine.synthesizeNarration(
          scene.narration,
          audioPath
        );

        const durationMs = ttsResult.durationMs;
        const durationInFrames = Math.max(
          30,
          Math.round((durationMs / 1000) * FPS)
        );

        const wordTimestamps = computeWordTimestamps(
          scene.narration,
          durationMs
        );

        scene.audioUrl = `/assets/${jobId}/audio/scene-${scene.sceneId}.mp3`;
        scene.durationMs = durationMs;
        scene.durationInFrames = durationInFrames;
        scene.wordTimestamps = wordTimestamps;

        totalVideoFrames += durationInFrames;

        await logTelemetry(
          jobId,
          "03_ETHAN_TTS_SYNC",
          `Scene ${scene.sceneId} synced: ${durationMs}ms (${durationInFrames} frames) via ${ttsResult.engineUsed}`
        );
      }

      const t3Elapsed = Date.now() - t3Start;
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          storyboard: storyboard as any,
          progress: 65,
        },
      });

      await logTelemetry(
        jobId,
        "03_ETHAN_TTS_SYNC",
        `TTS & Subtitle Alignment complete in ${t3Elapsed}ms. Total timeline: ${totalVideoFrames} frames.`
      );

      // ----------------------------------------------------------------------
      // STAGE 4: Hybrid Visual Asset Fetcher
      // ----------------------------------------------------------------------
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          status: "STAGE_4_ASSETS",
          currentStage: "04_HYBRID_ASSET_DL",
          progress: 70,
        },
      });

      const t4Start = Date.now();
      const assetFetcher = new AssetFetcher(pexelsApiKey);

      for (let i = 0; i < storyboard.scenes.length; i++) {
        const scene = storyboard.scenes[i];

        await logTelemetry(
          jobId,
          "04_HYBRID_ASSET_DL",
          `Fetching assets for scene ${scene.sceneId}: Main("${scene.mainVisual.searchQuery}") Cutaway("${scene.cutaway.searchQuery}")`
        );

        const { mainAssetPath, cutawayAssetPath } =
          await assetFetcher.resolveSceneAssets(
            jobId,
            scene.sceneId,
            scene.mainVisual.searchQuery,
            scene.cutaway.searchQuery,
            scene.cutaway.sourceType
          );

        // Convert filesystem path to web URL
        const mainRelative = path.relative(
          path.join(process.cwd(), "public"),
          mainAssetPath
        );
        const cutawayRelative = path.relative(
          path.join(process.cwd(), "public"),
          cutawayAssetPath
        );

        scene.mainVisual.localAssetUrl = `/${mainRelative.replace(/\\/g, "/")}`;
        scene.cutaway.localAssetUrl = `/${cutawayRelative.replace(/\\/g, "/")}`;
      }

      const t4Elapsed = Date.now() - t4Start;
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          storyboard: storyboard as any,
          progress: 80,
        },
      });

      await logTelemetry(
        jobId,
        "04_HYBRID_ASSET_DL",
        `All visual assets retrieved and mapped in ${t4Elapsed}ms.`
      );

      // ----------------------------------------------------------------------
      // STAGE 5: Remotion Hybrid Visual Engine Render
      // ----------------------------------------------------------------------
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          status: "STAGE_5_RENDER",
          currentStage: "05_REMOTION_RENDER",
          progress: 85,
        },
      });

      const t5Start = Date.now();
      await logTelemetry(
        jobId,
        "05_REMOTION_RENDER",
        `Spawning Remotion Chromium render pipeline for ${totalVideoFrames} frames @ 30FPS...`
      );

      const videoProps: VideoProps = {
        videoTitle: storyboard.videoTitle,
        themeColor: storyboard.themeColor || "#38BDF8",
        totalDurationInFrames: totalVideoFrames,
        fps: FPS,
        width: 1080,
        height: 1920,
        scenes: storyboard.scenes,
      };

      const renderResult = await remotionRenderer.renderVideo(
        jobId,
        videoProps,
        async (percent) => {
          const scaledProgress = 85 + Math.floor(percent * 0.14);
          await prisma.videoJob.update({
            where: { id: jobId },
            data: { progress: scaledProgress },
          });
        }
      );

      const t5Elapsed = Date.now() - t5Start;
      const totalElapsed = Date.now() - startTime;

      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          currentStage: "COMPLETED",
          progress: 100,
          videoProps: videoProps as any,
          renderOutputUrl: renderResult.outputUrl,
          renderDurationMs: renderResult.durationMs,
        },
      });

      await logTelemetry(
        jobId,
        "05_REMOTION_RENDER",
        `Remotion render finished in ${t5Elapsed}ms. Video ready at: ${renderResult.outputUrl}`,
        "INFO",
        {
          outputUrl: renderResult.outputUrl,
          totalDurationMs: totalElapsed,
        }
      );
    } catch (error: any) {
      console.error(`[WORKER FAULT] Job ${jobId} failed:`, error);
      await prisma.videoJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          errorMessage: error.message || "Unknown worker error",
        },
      });
      await logTelemetry(
        jobId,
        "FAULT",
        `Pipeline failed: ${error.message}`,
        "ERROR"
      );
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1,
  }
);

videoWorker.on("ready", () => {
  console.log("⚡ [BULLMQ] Video Worker is active and awaiting jobs...");
});

videoWorker.on("error", (err) => {
  console.error("❌ [BULLMQ] Video Worker runtime error:", err);
});
