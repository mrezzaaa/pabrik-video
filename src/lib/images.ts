import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { PUBLIC_DIR } from "./media";
import { searchImages } from "./searxng";
import type { VisualScene } from "./types";

const execFileAsync = promisify(execFile);

export const IMAGE_DIR = path.join(PUBLIC_DIR, "images");

const BLOCKED_HOST =
  /(istockphoto|shutterstock|alamy|gettyimages|dreamstime|123rf|depositphotos|freepik|vectorstock|canstockphoto|adobe|lookaside|gstatic|pinimg|tripadvisor|booking\.com|agoda|expedia|hotels\.com|yelp|facebook|instagram|tiktok|youtube|reddit|quora|clipart|kindpng|pngitem|seekpng|cleanpng|pinclipart|pngwing|pngtree|vecteezy)/i;
const PREFERRED_HOST =
  /(wikimedia|unsplash|pexels|pixabay|flickr|nasa|nih|cdc|si\.edu|britannica|bbc|nytimes|smithsonian|sciencedirect|history|museum|archive)/i;

type Candidate = {
  imgSrc: string;
  source: string;
  title: string;
  score: number;
};

function queryTokens(query: string) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3)
    .slice(0, 8);
}

function scoreCandidate(
  imgSrc: string,
  source: string,
  title: string,
  query: string,
) {
  let score = 0;
  if (PREFERRED_HOST.test(source)) score += 4;
  if (BLOCKED_HOST.test(source)) score -= 14;
  if (imgSrc.startsWith("https://")) score += 1;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(imgSrc)) score += 1;
  if (/(thumb|thumbnail|small|icon|logo|avatar|sprite)/i.test(imgSrc)) score -= 3;
  // Poster/iklan/infografis penuh teks merusak b-roll (teks tumpang tindih caption).
  if (
    /\b(poster|iklan|promo|promosi|diskon|sale|banner|infografis|infographic|pamflet|brosur|flyer|meme|mockup|wallpaper|pernyataan)\b/i.test(
      title,
    )
  ) {
    score -= 8;
  }

  const haystack = `${title} ${source} ${imgSrc}`.toLowerCase();
  const tokens = queryTokens(query);
  const hits = tokens.filter((token) => haystack.includes(token)).length;
  score += Math.min(7, hits * 2);
  if (hits === 0 && tokens.length >= 2) score -= 2;

  return score;
}

async function fetchImage(url: string): Promise<Buffer | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        Referer: new URL(url).origin,
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("image") || type.includes("svg")) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength < 12_000) return null;
    return buffer;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function getImageDimensions(
  filePath: string,
): Promise<{ width: number; height: number } | null> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=s=x:p=0",
      filePath,
    ]);
    const [wStr, hStr] = stdout.trim().split("x");
    const width = parseInt(wStr, 10);
    const height = parseInt(hStr, 10);
    if (
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0
    ) {
      return { width, height };
    }
    return null;
  } catch {
    return null;
  }
}

async function normalizeImage(
  raw: Buffer,
  outputPath: string,
  isPortrait = true,
) {
  const tempPath = `${outputPath}.src`;
  try {
    await fs.writeFile(tempPath, raw);

    if (isPortrait) {
      // True portrait / vertical aspect ratio: scale & center crop cleanly to 1080x1920
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        tempPath,
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
        "-frames:v",
        "1",
        "-q:v",
        "2",
        outputPath,
      ]);
    } else {
      // Landscape fallback: DO NOT zoom excessively to avoid severe pixelation/blur.
      // Use cinematic stacked background blur + sharp native fit overlay.
      await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        tempPath,
        "-filter_complex",
        "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:24[bg];[0:v]scale=1080:-1[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2",
        "-frames:v",
        "1",
        "-q:v",
        "2",
        outputPath,
      ]);
    }

    const stat = await fs.stat(outputPath);
    if (stat.size < 8_000) throw new Error("normalized image too small");
    return true;
  } catch {
    try {
      await fs.rename(tempPath, outputPath);
      const stat = await fs.stat(outputPath);
      return stat.size >= 12_000;
    } catch {
      return false;
    }
  } finally {
    await fs.rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function downloadSceneImage(
  query: string,
  projectId: string,
  index: number,
  usedSources: Set<string>,
): Promise<string | null> {
  const normalized = query.replace(/\s+/g, " ").trim().slice(0, 100);
  if (normalized.length < 3) return null;

  // Tidak menambah "portrait vertical" ke query: kata itu menarik screenshot HP,
  // potret orang, dan ilustrasi anime ke topik teknis. Gambar landscape sudah
  // ditangani normalizeImage (latar blur + foreground native).
  const portraitQuery = normalized;

  const results = await searchImages(portraitQuery, 30, "en").catch(() => []);
  const ranked: Candidate[] = results
    .map((item) => ({
      imgSrc: item.imgSrc,
      source: item.source,
      title: item.title,
      score: scoreCandidate(item.imgSrc, item.source, item.title, normalized),
    }))
    .filter((item) => item.score > -6 && !usedSources.has(item.imgSrc))
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  if (ranked.length === 0) return null;

  await fs.mkdir(path.join(IMAGE_DIR, projectId), { recursive: true });
  const dir = path.join(IMAGE_DIR, projectId);
  const filename = `scene-${String(index + 1).padStart(2, "0")}.jpg`;
  const outputPath = path.join(dir, filename);
  const tempProbePath = path.join(dir, `probe-${index}.tmp`);

  let bestLandscapeBuffer: Buffer | null = null;

  for (const candidate of ranked) {
    if (usedSources.has(candidate.imgSrc)) continue;
    usedSources.add(candidate.imgSrc);
    const raw = await fetchImage(candidate.imgSrc);
    if (!raw) continue;

    // Probe dimensions to verify aspect ratio
    await fs.writeFile(tempProbePath, raw).catch(() => null);
    const dims = await getImageDimensions(tempProbePath);
    await fs.rm(tempProbePath, { force: true }).catch(() => null);

    if (dims) {
      const isPortrait = dims.height >= dims.width * 0.95; // portrait or square
      if (isPortrait && dims.height >= 700) {
        // High quality portrait found!
        if (await normalizeImage(raw, outputPath, true)) {
          return `/images/${projectId}/${filename}`;
        }
      } else if (!bestLandscapeBuffer) {
        // Keep first decent landscape as emergency fallback
        bestLandscapeBuffer = raw;
      }
    } else {
      // Dimension probe failed, try normalize as portrait
      if (await normalizeImage(raw, outputPath, true)) {
        return `/images/${projectId}/${filename}`;
      }
    }
  }

  // If no true portrait was found after inspecting all candidates,
  // use the best landscape image with cinematic blurred letterbox so it NEVER looks pixelated/stretched.
  if (bestLandscapeBuffer) {
    if (await normalizeImage(bestLandscapeBuffer, outputPath, false)) {
      return `/images/${projectId}/${filename}`;
    }
  }

  return null;
}

/**
 * Download one real image per B_ROLL_IMAGE scene before Remotion starts.
 * Images are unique across scenes, ranked by query relevance, and never hotlinked.
 * Failures are non-fatal: the stage falls back to a procedural dark plate.
 */
export async function attachSceneImages(
  scenes: VisualScene[],
  projectId: string,
  topic = "",
): Promise<VisualScene[]> {
  const targets = scenes
    .map((scene, index) => ({ scene, index }))
    .filter((entry) => !entry.scene.imageUrl);

  const resolved = new Map<number, string>();
  const usedSources = new Set<string>();
  const concurrency = 3;
  let cursor = 0;

  async function resolveScene(scene: VisualScene, index: number) {
    const query = scene.imageSearchQuery ?? "";
    let url = await downloadSceneImage(query, projectId, index, usedSources);

    if (!url && query) {
      // SearXNG may return nothing for a wordy or very specific query. Retry
      // with its three strongest tokens before falling back to the topic.
      const simplified = query
        .split(/\s+/)
        .filter((token) => token.length > 3)
        .slice(0, 3)
        .join(" ");
      if (simplified && simplified !== query.toLowerCase()) {
        url = await downloadSceneImage(
          simplified,
          projectId,
          index,
          usedSources,
        );
      }
    }

    if (!url && topic) {
      url = await downloadSceneImage(
        `${topic} cinematic dark`,
        projectId,
        index,
        usedSources,
      );
    }
    if (url) resolved.set(index, url);
  }

  async function worker() {
    while (cursor < targets.length) {
      const current = targets[cursor];
      cursor += 1;
      await resolveScene(current.scene, current.index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()),
  );

  if (resolved.size > 0) {
    console.info(
      `[images] ${resolved.size}/${targets.length} gambar b-roll berhasil diunduh.`,
    );
  } else if (targets.length > 0) {
    console.warn("[images] tidak ada gambar b-roll yang bisa diunduh.");
  }

  // Ensure 100% visual continuity across all scenes (statistics, metrics, compare):
  let lastImage = "";
  const withImages = scenes.map((scene, index) => {
    let imageUrl = resolved.get(index) ?? scene.imageUrl;
    if (imageUrl) {
      lastImage = imageUrl;
    } else if (lastImage) {
      imageUrl = lastImage;
    }
    return imageUrl ? { ...scene, imageUrl } : scene;
  });

  // If first scenes missed an image, backfill from the first available image
  if (lastImage) {
    for (let i = 0; i < withImages.length; i++) {
      if (!withImages[i].imageUrl) {
        withImages[i].imageUrl = lastImage;
      }
    }
  }

  return withImages;
}
