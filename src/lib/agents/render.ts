import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../env";
import {
  ensureMediaDirs,
  ffprobeDuration,
  makeThumbnail,
  publicUrl,
  removeFile,
  TMP_DIR,
  VIDEO_DIR,
  THUMB_DIR,
  PUBLIC_DIR,
} from "../media";
import { attachSceneImages } from "../images";
import { asJson, completeStage, startStage } from "../pipeline";
import { prisma } from "../prisma";
import type {
  FullScript,
  VisualPlan,
  WordTimestamp,
} from "../types";

const execFileAsync = promisify(execFile);

function stripPublicPrefix(url: string) {
  return url.replace(/^\/+/, "");
}

export async function runRender(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error(`Project ${projectId} tidak ditemukan.`);

  const fullScript = project.fullScript as unknown as FullScript | null;
  const plan = project.visualPlan as unknown as VisualPlan | null;
  const words = project.wordTimestamps as unknown as WordTimestamp[] | null;

  if (!fullScript || !plan || !Array.isArray(plan.scenes)) {
    throw new Error("Visual plan / naskah belum siap untuk render.");
  }
  if (!project.audioUrl) throw new Error("Audio belum tersedia untuk render.");
  if (!project.duration) throw new Error("Durasi audio belum diketahui.");

  await startStage(projectId, "render");
  await ensureMediaDirs();

  const audioPath = path.join(
    PUBLIC_DIR,
    stripPublicPrefix(project.audioUrl),
  );
  try {
    await fs.access(audioPath);
  } catch {
    throw new Error(`File audio tidak ditemukan di ${audioPath}.`);
  }

  const videoPath = path.join(VIDEO_DIR, `${projectId}.mp4`);
  const thumbnailPath = path.join(THUMB_DIR, `${projectId}.jpg`);
  const propsPath = path.join(TMP_DIR, `${projectId}-reels-props.json`);

  // Download real SearXNG b-roll before Remotion starts. Failures are
  // non-fatal: the stage falls back to a procedural dark plate.
  const rawSearchTopic = (project.researchData as { searchTopic?: unknown } | null)
    ?.searchTopic;
  const scenes = await attachSceneImages(
    plan.scenes,
    projectId,
    project.topic,
    typeof rawSearchTopic === "string" ? rawSearchTopic : "",
  );
  const enrichedPlan: VisualPlan = { ...plan, scenes };
  await prisma.project.update({
    where: { id: projectId },
    data: { visualPlan: asJson(enrichedPlan) },
  });

  const props = {
    audioSrc: stripPublicPrefix(project.audioUrl),
    duration: project.duration,
    fps: env.remotionFps,
    hook: project.hook ?? fullScript.hook,
    topic: project.topic,
    scenes,
    words: words ?? [],
  };

  await fs.writeFile(propsPath, JSON.stringify(props, null, 2), "utf8");

  const args = [
    "remotion",
    "render",
    "src/remotion/index.ts",
    "Reels",
    videoPath,
    `--props=${propsPath}`,
    `--gl=${env.remotionGl}`,
    `--concurrency=${env.remotionConcurrency}`,
    "--codec=h264",
    "--overwrite",
    "--log=error",
  ];

  try {
    const result = await execFileAsync("npx", args, {
      cwd: process.cwd(),
      timeout: 15 * 60 * 1000,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        REMOTION_CONCURRENCY: String(env.remotionConcurrency),
      },
    });
    if (result.stderr) {
      console.info(`[render:${projectId}] ${result.stderr.slice(-2000)}`);
    }
  } catch (error) {
    const err = error as Error & { stderr?: string; stdout?: string };
    const detail = (err.stderr || err.stdout || err.message || "").slice(-4000);
    throw new Error(
      `Remotion render gagal. Pastikan Chromium/ffmpeg tersedia. Detail: ${detail}`,
    );
  }

  const stat = await fs.stat(videoPath).catch(() => null);
  if (!stat || stat.size < 10_000) {
    throw new Error("Render selesai tetapi file MP4 tidak valid / kosong.");
  }

  const videoDuration = await ffprobeDuration(videoPath).catch(
    () => project.duration ?? 0,
  );

  try {
    await makeThumbnail(videoPath, thumbnailPath, Math.min(1.2, videoDuration / 3));
  } catch (error) {
    console.warn(
      "[render] Thumbnail gagal dibuat:",
      error instanceof Error ? error.message : error,
    );
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: "DONE",
      videoUrl: publicUrl(videoPath),
      thumbnailUrl: publicUrl(thumbnailPath),
      // The audio-derived duration from the TTS stage is the source of truth.
      // Never overwrite it with the rendered video length: rendering rounds up
      // to whole frames, so repeating that would slowly inflate the reel and
      // leave a captionless tail.
      duration:
        project.duration ?? Math.round(videoDuration * 100) / 100,
      error: null,
    },
  });

  await completeStage(projectId, "render", {
    videoUrl: publicUrl(videoPath),
    duration: Math.round(videoDuration * 100) / 100,
    bytes: stat.size,
  });

  await removeFile(propsPath).catch(() => undefined);

  return {
    videoUrl: publicUrl(videoPath),
    thumbnailUrl: publicUrl(thumbnailPath),
    duration: videoDuration,
    bytes: stat.size,
  };
}
