import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { logTelemetry } from "../lib/job-log";
import { remotionRenderer } from "../lib/renderer";
import { deconstructTopicToBlueprint } from "../workers/deconstructor.worker";
import { generateScriptForBlueprint } from "../workers/scriptwriter.worker";
import { ttsWorker } from "../workers/tts.worker";
import { VideoBlueprint } from "../lib/scene/types";
import { KitabedahVideoProps } from "../remotion/KitabedahVideo";
import { VIDEO_FPS } from "../remotion/constants";

export interface KitabedahStagesInput {
  jobId: string;
  topic: string;
  modelId: string;
  knowledgeBase: string;
  existingStoryboard?: unknown;
  startTime: number;
}

/**
 * Universal Kitabedah 3D X-Ray Hologram Stages:
 * - Stage 2: Dynamic Deconstruction (9 Lego Primitives) & Scriptwriting
 * - Stage 3: VoiceStudio Local Cloned TTS (voice aad77d68, speed 1.1)
 * - Stage 5: Metal GPU Accelerated Remotion Render (Kitabedah 1080x1920 30fps)
 */
export async function runKitabedahStages(
  input: KitabedahStagesInput
): Promise<boolean> {
  const { jobId, topic, modelId, knowledgeBase, startTime } = input;

  try {
    /* ---------------- STAGE 2: LLM 3D Deconstructor & Director ------------- */
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
      `Deconstructing topic "${topic}" into 3D X-Ray Blueprint (Lego primitives)...`
    );

    const blueprint: VideoBlueprint = await deconstructTopicToBlueprint(
      topic,
      knowledgeBase,
      modelId
    );

    await logTelemetry(
      jobId,
      "02_LLM_DIRECTOR",
      `Blueprint created: archetype=${blueprint.subjectArchetype}, components=${blueprint.components.length}, phases=${blueprint.phases?.length}. Writing narration script...`
    );

    const script = await generateScriptForBlueprint(
      topic,
      knowledgeBase,
      blueprint,
      modelId
    );

    await logTelemetry(
      jobId,
      "02_LLM_DIRECTOR",
      `3D Blueprint & Script ready in ${Date.now() - t2Start}ms (${script.beats.length} beats).`
    );

    /* ---------------- STAGE 3: VoiceStudio Local Cloned TTS ----------------- */
    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status: "STAGE_3_TTS_SYNC",
        currentStage: "03_ETHAN_TTS_SYNC",
        progress: 50,
      },
    });

    const audioDir = path.join(process.cwd(), "public", "assets", jobId, "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const phases = blueprint.phases || [];
    let totalTimelineFrames = 0;

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const beat = script.beats[i] || {
        narration: `Penjelasan teknis fase ${phase.title}.`,
      };

      const audioFileName = `phase-${i + 1}.mp3`;
      await logTelemetry(
        jobId,
        "03_ETHAN_TTS_SYNC",
        `Synthesizing VoiceStudio audio for Phase ${i + 1}/${phases.length}: "${phase.title}"...`
      );

      const tts = await ttsWorker.synthesizeNarration({
        jobId,
        text: beat.narration,
        outputFileName: `audio/${audioFileName}`,
        voiceId: process.env.VOICE_DEFAULT_ID || "aad77d68",
        speed: 1.1,
      });

      phase.audioUrl = `/assets/${jobId}/audio/${audioFileName}`;
      phase.narration = beat.narration;
      phase.durationInFrames = tts.durationInFrames;
      phase.duration = tts.durationMs / 1000;
      totalTimelineFrames += tts.durationInFrames;

      await logTelemetry(
        jobId,
        "03_ETHAN_TTS_SYNC",
        `Phase ${i + 1} synced: ${tts.durationMs}ms (${tts.durationInFrames} frames @ ${VIDEO_FPS}fps).`
      );
    }

    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        storyboard: { blueprint, script } as any,
        progress: 75,
      },
    });

    /* ---------------- STAGE 5: Remotion Render (GPU Accelerated) ----------- */
    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status: "STAGE_5_RENDER",
        currentStage: "05_REMOTION_RENDER",
        progress: 85,
      },
    });

    await logTelemetry(
      jobId,
      "05_REMOTION_RENDER",
      `Starting Kitabedah 3D X-Ray rendering (${totalTimelineFrames} frames @ ${VIDEO_FPS}fps) via Metal GPU...`
    );

    const videoProps: KitabedahVideoProps = {
      blueprint,
      visualStyle: (blueprint.visualStyle as any) || "xray",
      totalDurationInFrames: totalTimelineFrames,
    };

    const render = await remotionRenderer.renderVideo(
      jobId,
      videoProps,
      async (percent) => {
        await prisma.videoJob.update({
          where: { id: jobId },
          data: { progress: 85 + Math.floor(percent * 0.14) },
        });
      },
      "Kitabedah"
    );

    const totalDuration = Date.now() - startTime;
    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        currentStage: "COMPLETED",
        progress: 100,
        videoProps: videoProps as any,
        renderOutputUrl: render.outputUrl,
      },
    });

    await logTelemetry(
      jobId,
      "COMPLETED",
      `Video Kitabedah 3D X-Ray selesai dalam ${(totalDuration / 1000).toFixed(1)}s! URL: ${render.outputUrl}`,
      "INFO",
      {
        renderMs: render.durationMs,
        totalDurationMs: totalDuration,
        outputUrl: render.outputUrl,
      }
    );

    return true;
  } catch (err: any) {
    console.error("[KITABEDAH STAGES] Error executing Kitabedah pipeline:", err);
    await logTelemetry(
      jobId,
      "05_REMOTION_RENDER",
      `Kitabedah pipeline failed: ${err.message}. Retrying fallback...`,
      "ERROR"
    );
    return false;
  }
}
