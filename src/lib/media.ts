import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const PUBLIC_DIR = path.join(process.cwd(), "public");
export const AUDIO_DIR = path.join(PUBLIC_DIR, "audio");
export const VIDEO_DIR = path.join(PUBLIC_DIR, "videos");
export const THUMB_DIR = path.join(PUBLIC_DIR, "thumbnails");
export const TMP_DIR = path.join(process.cwd(), ".pabrik-tmp");

export async function ensureMediaDirs() {
  await Promise.all(
    [AUDIO_DIR, VIDEO_DIR, THUMB_DIR, TMP_DIR].map((dir) =>
      fs.mkdir(dir, { recursive: true }),
    ),
  );
}

export async function ffprobeDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const duration = Number.parseFloat(stdout.trim());
    return Number.isFinite(duration) ? duration : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Gagal membaca durasi audio/video dengan ffprobe: ${message}`,
    );
  }
}

export async function makeThumbnail(
  videoPath: string,
  outputPath: string,
  atSecond = 1.2,
) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-ss",
    String(atSecond),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    outputPath,
  ]);
}

/** Hard-cap audio to the Reels limit (60 seconds) without re-encoding. */
export async function trimAudio(filePath: string, maxSeconds: number) {
  const tempPath = `${filePath}.trim.mp3`;
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      filePath,
      "-t",
      String(maxSeconds),
      "-c",
      "copy",
      tempPath,
    ]);
    await fs.rename(tempPath, filePath);
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function removeFile(filePath: string) {
  await fs.rm(filePath, { force: true });
}

export async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function publicUrl(filePath: string) {
  const relative = path.relative(PUBLIC_DIR, filePath).split(path.sep).join("/");
  return `/${relative}`;
}

export function remotionStaticPath(filePath: string) {
  return path
    .relative(PUBLIC_DIR, filePath)
    .split(path.sep)
    .join("/");
}
