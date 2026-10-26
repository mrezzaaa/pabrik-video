import { env } from "./env";

type PexelsVideoFile = {
  id: number;
  quality: string;
  file_type: string;
  width: number | null;
  height: number | null;
  link: string;
};

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  video_files: PexelsVideoFile[];
};

type PexelsResponse = {
  videos?: PexelsVideo[];
};

const cache = new Map<string, string | null>();

function pickFile(video: PexelsVideo): PexelsVideoFile | null {
  const files = (video.video_files ?? []).filter(
    (file) => file.file_type === "video/mp4" && file.link,
  );
  if (files.length === 0) return null;

  // Prefer a portrait clip that is light enough for fast renders.
  const portrait = files.filter(
    (file) => (file.height ?? 0) > (file.width ?? 0),
  );
  const pool = portrait.length > 0 ? portrait : files;

  const sorted = [...pool].sort((a, b) => {
    const aWidth = a.width ?? 0;
    const bWidth = b.width ?? 0;
    const aScore = aWidth >= 540 && aWidth <= 1080 ? 0 : 1;
    const bScore = bWidth >= 540 && bWidth <= 1080 ? 0 : 1;
    if (aScore !== bScore) return aScore - bScore;
    return bWidth - aWidth;
  });

  return sorted[0] ?? null;
}

/**
 * Search Pexels for a portrait b-roll clip.
 * Returns null when no API key is configured or nothing suitable is found.
 * Pexels is free; the pipeline keeps working with animated gradients.
 */
export async function searchPexelsVideo(
  query: string,
): Promise<string | null> {
  const key = env.pexelsApiKey;
  const normalized = query.trim().toLowerCase().slice(0, 80);
  // Placeholder keys like "xxx" are treated as disabled.
  if (!key || key.length < 20 || normalized.length < 2) return null;
  if (cache.has(normalized)) return cache.get(normalized) ?? null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const url = new URL("https://api.pexels.com/videos/search");
    url.searchParams.set("query", normalized);
    url.searchParams.set("orientation", "portrait");
    url.searchParams.set("per_page", "6");
    url.searchParams.set("size", "medium");

    const response = await fetch(url, {
      headers: { Authorization: key },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Pexels HTTP ${response.status}`);
    }

    const data = (await response.json()) as PexelsResponse;
    const videos = (data.videos ?? []).filter(
      (video) => (video.duration ?? 0) >= 2,
    );

    for (const video of videos) {
      const file = pickFile(video);
      if (file) {
        cache.set(normalized, file.link);
        return file.link;
      }
    }

    cache.set(normalized, null);
    return null;
  } catch (error) {
    console.warn(
      "[pexels] gagal mencari b-roll:",
      error instanceof Error ? error.message : error,
    );
    cache.set(normalized, null);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchPexelsVideos(
  queries: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
  if (!env.pexelsApiKey || env.pexelsApiKey.length < 20 || unique.length === 0) {
    return new Map();
  }

  const results = await Promise.all(
    unique.slice(0, 8).map(async (query) => {
      const url = await searchPexelsVideo(query);
      return [query, url] as const;
    }),
  );

  return new Map(
    results.filter((entry): entry is readonly [string, string] =>
      Boolean(entry[1]),
    ),
  );
}
