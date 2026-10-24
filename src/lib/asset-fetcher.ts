import fs from "fs";
import path from "path";
import { searxng } from "./searxng";

export class AssetFetcher {
  private pexelsApiKey?: string;

  constructor(pexelsApiKey?: string) {
    this.pexelsApiKey = pexelsApiKey || process.env.PEXELS_API_KEY;
  }

  /**
   * Helper to verify file magic bytes for JPEG/PNG/WebP
   */
  private isValidImage(buffer: Buffer): boolean {
    if (buffer.length < 12) return false;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return true;
    }
    // WEBP: RIFF....WEBP
    if (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      return true;
    }
    return false;
  }

  /**
   * STAGE 4.1: Download and validate image from URL
   */
  async downloadAndSaveImage(
    url: string,
    outputPath: string
  ): Promise<boolean> {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) return false;

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 5000) return false; // Too small or icon
      if (!this.isValidImage(buffer)) return false;

      fs.writeFileSync(outputPath, buffer);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * STAGE 4.1: SearXNG Image Search & Downloader with fallback
   */
  async fetchSearxngImage(
    searchQuery: string,
    outputFilePath: string
  ): Promise<string | null> {
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const imageUrls = await searxng.searchImages(searchQuery);

    for (const imgUrl of imageUrls.slice(0, 8)) {
      const success = await this.downloadAndSaveImage(imgUrl, outputFilePath);
      if (success) {
        return outputFilePath;
      }
    }

    // Try secondary broadened query if specific query returned no valid image
    const broadQuery = searchQuery.split(" ").slice(0, 3).join(" ");
    if (broadQuery !== searchQuery) {
      const secondaryUrls = await searxng.searchImages(broadQuery);
      for (const imgUrl of secondaryUrls.slice(0, 6)) {
        const success = await this.downloadAndSaveImage(imgUrl, outputFilePath);
        if (success) {
          return outputFilePath;
        }
      }
    }

    return null;
  }

  /**
   * STAGE 4.2: Pexels Vertical Video B-Roll Fetcher
   */
  async fetchPexelsVideo(
    searchQuery: string,
    outputFilePath: string
  ): Promise<string | null> {
    if (!this.pexelsApiKey) {
      return null; // Fallback to SearXNG image
    }

    try {
      const dir = path.dirname(outputFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(
        searchQuery
      )}&orientation=portrait&per_page=5`;

      const res = await fetch(url, {
        headers: { Authorization: this.pexelsApiKey },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (!data.videos || data.videos.length === 0) return null;

      // Find an HD vertical video file
      const video = data.videos[0];
      const videoFile = video.video_files?.find(
        (f: any) => f.quality === "hd" || f.width >= 720
      ) || video.video_files?.[0];

      if (!videoFile || !videoFile.link) return null;

      const videoRes = await fetch(videoFile.link, {
        signal: AbortSignal.timeout(25000),
      });
      if (!videoRes.ok) return null;

      const buffer = Buffer.from(await videoRes.arrayBuffer());
      fs.writeFileSync(outputFilePath, buffer);
      return outputFilePath;
    } catch (err) {
      console.warn("[ASSET-FETCHER] Pexels video fetch error:", err);
      return null;
    }
  }

  /**
   * Unified Visual Resolver: Fetch main visual and cutaway visual
   */
  async resolveSceneAssets(
    jobId: string,
    sceneId: number,
    mainQuery: string,
    cutawayQuery: string,
    cutawaySourceType: "SEARXNG_IMAGE" | "PEXELS_VIDEO"
  ): Promise<{ mainAssetPath: string; cutawayAssetPath: string }> {
    const assetsDir = path.join(
      process.cwd(),
      "public",
      "assets",
      jobId,
      "visuals"
    );
    if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

    // 1. Resolve Main Visual
    const mainImgPath = path.join(assetsDir, `scene-${sceneId}-main.jpg`);
    let mainResult = await this.fetchSearxngImage(mainQuery, mainImgPath);
    if (!mainResult) {
      // Fallback generator for emergency high-tech placeholder graphic
      mainResult = this.createFallbackGraphic(
        mainImgPath,
        mainQuery,
        "#071324"
      );
    }

    // 2. Resolve Cutaway Visual
    let cutawayResult: string | null = null;
    if (cutawaySourceType === "PEXELS_VIDEO" && this.pexelsApiKey) {
      const cutawayVideoPath = path.join(
        assetsDir,
        `scene-${sceneId}-cutaway.mp4`
      );
      cutawayResult = await this.fetchPexelsVideo(
        cutawayQuery,
        cutawayVideoPath
      );
    }

    // If Pexels video missed or not selected, use SearXNG image
    if (!cutawayResult) {
      const cutawayImgPath = path.join(
        assetsDir,
        `scene-${sceneId}-cutaway.jpg`
      );
      cutawayResult = await this.fetchSearxngImage(
        cutawayQuery,
        cutawayImgPath
      );
    }

    if (!cutawayResult) {
      const cutawayImgPath = path.join(
        assetsDir,
        `scene-${sceneId}-cutaway.jpg`
      );
      cutawayResult = this.createFallbackGraphic(
        cutawayImgPath,
        cutawayQuery,
        "#0B1D36"
      );
    }

    return {
      mainAssetPath: mainResult,
      cutawayAssetPath: cutawayResult,
    };
  }

  /**
   * Generates a sleek technical SVG and writes to file if network image download fails
   */
  private createFallbackGraphic(
    filePath: string,
    label: string,
    bgColor: string
  ): string {
    const svg = `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
      <rect width="1080" height="1920" fill="${bgColor}" />
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#38BDF8" stroke-width="0.7" opacity="0.25" />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill="url(#grid)" />
      <circle cx="540" cy="960" r="320" stroke="#38BDF8" stroke-width="2" fill="none" stroke-dasharray="10, 15" opacity="0.4" />
      <circle cx="540" cy="960" r="260" stroke="#38BDF8" stroke-width="1.5" fill="none" opacity="0.6" />
      <text x="540" y="930" font-family="monospace" font-size="34" font-weight="bold" fill="#38BDF8" text-anchor="middle" letter-spacing="3">[OPTICAL RECON FEED]</text>
      <text x="540" y="990" font-family="monospace" font-size="28" fill="#F0F9FF" text-anchor="middle">${label.slice(0, 32).toUpperCase()}</text>
      <text x="540" y="1030" font-family="monospace" font-size="20" fill="#94A3B8" text-anchor="middle">STATUS: ACTIVE SENSOR RADAR</text>
    </svg>`;

    // Save as svg or replace ext
    const svgPath = filePath.replace(/\.(jpg|png|webp|mp4)$/, ".svg");
    fs.writeFileSync(svgPath, svg, "utf8");
    return svgPath;
  }
}
