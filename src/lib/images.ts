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

async function normalizeImage(raw: Buffer, outputPath: string) {
  const tempPath = `${outputPath}.src`;
  try {
    await fs.writeFile(tempPath, raw);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      tempPath,
      "-vf",
      "scale=1080:1350:force_original_aspect_ratio=increase,crop=1080:1350",
      "-frames:v",
      "1",
      "-q:v",
      "3",
      outputPath,
    ]);
    const stat = await fs.stat(outputPath);
    if (stat.size < 8_000) throw new Error("normalized image too small");
    return true;
  } catch {
    // Last resort: keep the original bytes if ffmpeg cannot decode it.
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

  const results = await searchImages(normalized, 24).catch(() => []);
  const relevanceQuery = /photo|photograph/i.test(normalized)
    ? normalized
    : `${normalized} photo`;
  const ranked: Candidate[] = results
    .map((item) => ({
      imgSrc: item.imgSrc,
      source: item.source,
      title: item.title,
      score: scoreCandidate(item.imgSrc, item.source, item.title, relevanceQuery),
    }))
    .filter((item) => item.score > -6 && !usedSources.has(item.imgSrc))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  if (ranked.length === 0) return null;

  await fs.mkdir(path.join(IMAGE_DIR, projectId), { recursive: true });
  const dir = path.join(IMAGE_DIR, projectId);

  for (const candidate of ranked) {
    if (usedSources.has(candidate.imgSrc)) continue;
    usedSources.add(candidate.imgSrc);
    const raw = await fetchImage(candidate.imgSrc);
    if (!raw) continue;
    const filename = `scene-${String(index + 1).padStart(2, "0")}.jpg`;
    const outputPath = path.join(dir, filename);
    if (await normalizeImage(raw, outputPath)) {
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
    .filter(
      (entry) =>
        entry.scene.visualType === "B_ROLL_IMAGE" && !entry.scene.imageUrl,
    );

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

  return scenes.map((scene, index) => {
    const imageUrl = resolved.get(index);
    return imageUrl ? { ...scene, imageUrl } : scene;
  });
}
