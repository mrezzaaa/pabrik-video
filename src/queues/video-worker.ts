import { Worker, Job } from "bullmq";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { redisConnection } from "../lib/redis";
import { VIDEO_PIPELINE_QUEUE_NAME, VideoJobData } from "./queue";
import { omniroute } from "../lib/omniroute";
import { searxng } from "../lib/searxng";
import { ttsEngine } from "../lib/tts-ethan";
import { AssetFetcher } from "../lib/asset-fetcher";
import { remotionRenderer } from "../lib/renderer";
import { Storyboard, VideoProps } from "../lib/types";

/**
 * Approximate spoken word alignment for dynamic subtitles
 */
function computeWordTimestamps(
  narration: string,
  totalDurationMs: number
): Array<{ word: string; startMs: number; endMs: number }> {
  const words = narration.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const intervalMs = totalDurationMs / words.length;
  return words.map((word, idx) => ({
    word,
    startMs: Math.round(idx * intervalMs),
    endMs: Math.round((idx + 1) * intervalMs),
  }));
}

async function logTelemetry(
  jobId: string,
  stage: string,
  message: string,
  level: "INFO" | "WARN" | "ERROR" = "INFO",
  metadata?: any
) {
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

    // Check existing state to allow granular resume without re-running earlier stages
    const existingJob = await prisma.videoJob.findUnique({
      where: { id: jobId },
    });

    await logTelemetry(
      jobId,
      "INIT",
      `Booting pipeline orchestrator for topic: "${topic}" using model: "${modelId}"`
    );

    try {
      // ----------------------------------------------------------------------
      // STAGE 1: SearXNG Fact Extraction (Skip if already completed)
      // ----------------------------------------------------------------------
      let knowledgeBase = (existingJob?.knowledgeBase as unknown as string) || "";
      let queries = existingJob?.searchQueries as string[] | null;

      if (!knowledgeBase || knowledgeBase.length === 0) {
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

        queries = await omniroute.generateSearchQueries(topic, modelId);
        await logTelemetry(
          jobId,
          "01_SEARXNG_RECON",
          `Dispatching ${queries.length} queries to SearXNG`,
          "INFO",
          { queries }
        );

        knowledgeBase = await searxng.aggregateKnowledge(queries);
        const t1Elapsed = Date.now() - t1Start;

        await prisma.videoJob.update({
          where: { id: jobId },
          data: {
            searchQueries: queries,
            knowledgeBase: knowledgeBase as any,
            progress: 25,
          },
        });

        await logTelemetry(
          jobId,
          "01_SEARXNG_RECON",
          `SearXNG Recon Completed in ${t1Elapsed}ms. Aggregated facts ready.`
        );
      } else {
        await logTelemetry(
          jobId,
          "01_SEARXNG_RECON",
          `Resumed: Using existing knowledge base facts. Skipping Stage 1.`
        );
      }

      // ----------------------------------------------------------------------
      // STAGE 2: Model-Agnostic Master Prompt & Storyboard Director (Skip if exists)
      // ----------------------------------------------------------------------
      let storyboard = existingJob?.storyboard as unknown as Storyboard | null;

      if (!storyboard || !storyboard.scenes || storyboard.scenes.length === 0) {
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

        storyboard = await omniroute.generateStoryboard(
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
      } else {
        await logTelemetry(
          jobId,
          "02_LLM_DIRECTOR",
          `Resumed: Using existing storyboard (${storyboard.scenes.length} scenes). Skipping Stage 2.`
        );
      }

      // ----------------------------------------------------------------------
      // STAGE 3: UnlimitedTTS Automation & Word-Level Sync (Resume per scene)
      // ----------------------------------------------------------------------
      const FPS = 30;
      const audioDir = path.join(
        process.cwd(),
        "public",
        "assets",
        jobId,
        "audio"
      );
      if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

      // Check which scenes already have valid audio files
      const scenesNeedAudio = storyboard.scenes.some((s) => {
        const p = path.join(audioDir, `scene-${s.sceneId}.mp3`);
        return !fs.existsSync(p) || fs.statSync(p).size < 1000 || !s.durationInFrames;
      });

      let totalVideoFrames = 0;

      if (scenesNeedAudio) {
        await prisma.videoJob.update({
          where: { id: jobId },
          data: {
            status: "STAGE_3_TTS_SYNC",
            currentStage: "03_ETHAN_TTS_SYNC",
            progress: 50,
          },
        });

        const t3Start = Date.now();

        for (let i = 0; i < storyboard.scenes.length; i++) {
          const scene = storyboard.scenes[i];
          const audioPath = path.join(audioDir, `scene-${scene.sceneId}.mp3`);

          // Reuse audio file if it already exists from prior run
          if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 1000 && scene.durationInFrames) {
            totalVideoFrames += scene.durationInFrames;
            await logTelemetry(
              jobId,
              "03_ETHAN_TTS_SYNC",
              `Resumed: Audio already exists for scene ${scene.sceneId}. Reusing cached audio.`
            );
            continue;
          }

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
      } else {
        totalVideoFrames = storyboard.scenes.reduce(
          (sum, s) => sum + (s.durationInFrames || 30),
          0
        );
        await logTelemetry(
          jobId,
          "03_ETHAN_TTS_SYNC",
          `Resumed: All ${storyboard.scenes.length} scene audios exist and verified. Skipping Stage 3.`
        );
      }

      // ----------------------------------------------------------------------
      // STAGE 4: Hybrid Visual Asset Fetcher (Resume per asset)
      // ----------------------------------------------------------------------
      const visualsDir = path.join(
        process.cwd(),
        "public",
        "assets",
        jobId,
        "visuals"
      );

      const scenesNeedVisuals = storyboard.scenes.some((s) => {
        if (!s.mainVisual?.localAssetUrl) return true;
        const mainFs = path.join(process.cwd(), "public", s.mainVisual.localAssetUrl.replace(/^\/+/, ""));
        return !fs.existsSync(mainFs) || fs.statSync(mainFs).size < 100;
      });

      if (scenesNeedVisuals) {
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

          // Check if visual files already exist on disk
          const existingMain = path.join(visualsDir, `scene-${scene.sceneId}-main.jpg`);
          const existingCutawayJpg = path.join(visualsDir, `scene-${scene.sceneId}-cutaway.jpg`);
          const existingCutawayMp4 = path.join(visualsDir, `scene-${scene.sceneId}-cutaway.mp4`);

          let mainAssetPath = existingMain;
          let cutawayAssetPath = fs.existsSync(existingCutawayMp4) ? existingCutawayMp4 : existingCutawayJpg;

          if (!fs.existsSync(mainAssetPath) || fs.statSync(mainAssetPath).size < 500) {
            await logTelemetry(
              jobId,
              "04_HYBRID_ASSET_DL",
              `Fetching assets for scene ${scene.sceneId}: Main("${scene.mainVisual.searchQuery}") Cutaway("${scene.cutaway.searchQuery}")`
            );

            const fetched = await assetFetcher.resolveSceneAssets(
              jobId,
              scene.sceneId,
              scene.mainVisual.searchQuery,
              scene.cutaway.searchQuery,
              scene.cutaway.sourceType
            );
            mainAssetPath = fetched.mainAssetPath;
            cutawayAssetPath = fetched.cutawayAssetPath;
          } else {
            await logTelemetry(
              jobId,
              "04_HYBRID_ASSET_DL",
              `Resumed: Visual assets for scene ${scene.sceneId} already downloaded. Reusing cached files.`
            );
          }

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
      } else {
        await logTelemetry(
          jobId,
          "04_HYBRID_ASSET_DL",
          `Resumed: Visual assets verified for all scenes. Skipping Stage 4.`
        );
      }

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
