import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { omniroute } from "../lib/omniroute";
import { ttsEngine } from "../lib/tts-ethan";
import { remotionRenderer } from "../lib/renderer";
import { logTelemetry } from "../lib/job-log";
import { computeWordTimestamps } from "../lib/subtitle-sync";
import { ASSEMBLY_IDS } from "../remotion/tech3d/assemblies";
import {
  TechStoryboard,
  TechVideoProps,
  totalFrames,
} from "../lib/tech-storyboard";

const FPS = 30;
/** durasi minimum satu beat */
const MIN_BEAT_FRAMES = 60;
/** jeda napas setelah narasi beat selesai, supaya antar beat tidak terasa tergesa */
const TAIL_FRAMES = 8;

export interface TechStagesInput {
  jobId: string;
  topic: string;
  modelId: string;
  knowledgeBase: string;
  existingStoryboard: unknown;
  startTime: number;
}

/**
 * Stage 2, 3, dan 5 untuk gaya "gambar teknik 3D".
 * Stage 4 (download foto/B-roll) tidak dipakai: visualnya digenerate dari katalog assembly.
 */
export async function runTechStages(input: TechStagesInput): Promise<void> {
  const { jobId, topic, modelId, knowledgeBase, startTime } = input;

  /* ------------------------- STAGE 2: LLM director ------------------------ */
  let storyboard = input.existingStoryboard as TechStoryboard | null;
  const hasTechStoryboard =
    !!storyboard && Array.isArray(storyboard.beats) && storyboard.beats.length > 0;

  if (!hasTechStoryboard) {
    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        status: "STAGE_2_DIRECTOR",
        currentStage: "02_LLM_DIRECTOR",
        progress: 30,
      },
    });

    const t2 = Date.now();
    await logTelemetry(
      jobId,
      "02_LLM_DIRECTOR",
      `Director (mode TECH-3D): memilih assembly dari katalog [${ASSEMBLY_IDS.join(", ")}] dan menulis beat narasi...`
    );

    const generated = await omniroute.generateTechStoryboard(
      topic,
      knowledgeBase,
      modelId
    );

    if (generated.assemblyId === "NONE") {
      throw new Error(
        `Topik "${topic}" belum cocok dengan library assembly yang tersedia (${ASSEMBLY_IDS.join(", ")}). ` +
          `Alasan director: ${generated.fitReason || "-"}. ` +
          `Tambahkan assembly baru di src/remotion/tech3d/assemblies.ts, atau pilih topik lain.`
      );
    }

    storyboard = generated;
    await prisma.videoJob.update({
      where: { id: jobId },
      data: { storyboard: storyboard as any, progress: 45 },
    });
    await logTelemetry(
      jobId,
      "02_LLM_DIRECTOR",
      `Storyboard TECH-3D siap dalam ${Date.now() - t2}ms: assembly "${storyboard.assemblyId}", ${storyboard.beats.length} beat.`,
      "INFO",
      { title: storyboard.videoTitle, assemblyId: storyboard.assemblyId }
    );
  } else {
    await logTelemetry(
      jobId,
      "02_LLM_DIRECTOR",
      `Resumed: storyboard TECH-3D sudah ada (${storyboard!.beats.length} beat). Skip Stage 2.`
    );
  }

  const sb = storyboard as TechStoryboard;

  /* ----------------------- STAGE 3: TTS per beat -------------------------- */
  const audioDir = path.join(process.cwd(), "public", "assets", jobId, "audio");
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

  await prisma.videoJob.update({
    where: { id: jobId },
    data: {
      status: "STAGE_3_TTS_SYNC",
      currentStage: "03_ETHAN_TTS_SYNC",
      progress: 50,
    },
  });

  for (let i = 0; i < sb.beats.length; i++) {
    const beat = sb.beats[i];
    const audioPath = path.join(audioDir, `beat-${beat.beatId}.mp3`);

    if (
      beat.durationInFrames &&
      fs.existsSync(audioPath) &&
      fs.statSync(audioPath).size > 1000
    ) {
      await logTelemetry(
        jobId,
        "03_ETHAN_TTS_SYNC",
        `Resumed: audio beat ${beat.beatId} sudah ada, dipakai ulang.`
      );
      continue;
    }

    await logTelemetry(
      jobId,
      "03_ETHAN_TTS_SYNC",
      `Sintesis beat ${beat.beatId}/${sb.beats.length}: "${beat.narration.slice(0, 40)}..."`
    );

    const tts = await ttsEngine.synthesizeNarration(beat.narration, audioPath);
    beat.audioUrl = `/assets/${jobId}/audio/beat-${beat.beatId}.mp3`;
    beat.durationMs = tts.durationMs;
    beat.durationInFrames =
      Math.max(MIN_BEAT_FRAMES, Math.round((tts.durationMs / 1000) * FPS)) +
      TAIL_FRAMES;
    beat.wordTimestamps = computeWordTimestamps(beat.narration, tts.durationMs);

    // simpan per beat supaya resume tidak mengulang TTS yang sudah jadi
    await prisma.videoJob.update({
      where: { id: jobId },
      data: {
        storyboard: sb as any,
        progress: 50 + Math.floor(((i + 1) / sb.beats.length) * 25),
      },
    });
    await logTelemetry(
      jobId,
      "03_ETHAN_TTS_SYNC",
      `Beat ${beat.beatId} sinkron: ${tts.durationMs}ms (${beat.durationInFrames} frame) via ${tts.engineUsed}`
    );
  }

  const totalVideoFrames = totalFrames(sb.beats);
  await logTelemetry(
    jobId,
    "03_ETHAN_TTS_SYNC",
    `TTS selesai. Total timeline ${totalVideoFrames} frame (${(totalVideoFrames / FPS).toFixed(1)} detik).`
  );

  /* -------------------------- STAGE 5: Render 3D -------------------------- */
  await prisma.videoJob.update({
    where: { id: jobId },
    data: {
      status: "STAGE_5_RENDER",
      currentStage: "05_REMOTION_RENDER",
      progress: 85,
    },
  });

  const t5 = Date.now();
  await logTelemetry(
    jobId,
    "05_REMOTION_RENDER",
    `Render TECH-3D (WebGL, gl=${process.env.REMOTION_GL || "swiftshader"}) untuk ${totalVideoFrames} frame @ ${FPS}FPS...`
  );

  const videoProps: TechVideoProps = {
    videoTitle: sb.videoTitle,
    themeColor: sb.themeColor || "#38BDF8",
    assemblyId: sb.assemblyId,
    totalDurationInFrames: totalVideoFrames,
    fps: FPS,
    width: 1080,
    height: 1920,
    beats: sb.beats,
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
    "TechVideo"
  );

  await prisma.videoJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      currentStage: "COMPLETED",
      progress: 100,
      videoProps: videoProps as any,
      renderOutputUrl: render.outputUrl,
      renderDurationMs: render.durationMs,
    },
  });

  await logTelemetry(
    jobId,
    "05_REMOTION_RENDER",
    `Render selesai dalam ${Date.now() - t5}ms. Video: ${render.outputUrl}`,
    "INFO",
    { outputUrl: render.outputUrl, totalDurationMs: Date.now() - startTime }
  );
}
