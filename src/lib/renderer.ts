import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { VideoProps } from "./types";

export class RemotionRendererService {
  private bundleLocationPromise: Promise<string> | null = null;

  private async getBundleLocation(): Promise<string> {
    if (!this.bundleLocationPromise) {
      this.bundleLocationPromise = bundle({
        entryPoint: path.join(process.cwd(), "src", "remotion", "index.ts"),
        webpackOverride: (config) => config,
      });
    }
    return this.bundleLocationPromise;
  }

  /**
   * STAGE 5: Render composition to vertical 1080x1920 MP4
   */
  async renderVideo(
    jobId: string,
    videoProps: VideoProps,
    onProgress?: (progress: number) => void
  ): Promise<{ outputPath: string; outputUrl: string; durationMs: number }> {
    const startTime = Date.now();
    const bundleLocation = await this.getBundleLocation();

    const outputDir = path.join(
      process.cwd(),
      "public",
      "assets",
      jobId,
      "renders"
    );
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFileName = `render-${Date.now()}.mp4`;
    const outputPath = path.join(outputDir, outputFileName);
    const outputUrl = `/assets/${jobId}/renders/${outputFileName}`;

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: "MainVideo",
      inputProps: videoProps,
    });

    const concurrency = parseInt(process.env.REMOTION_CONCURRENCY || "2", 10);

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: videoProps.totalDurationInFrames,
      },
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: outputPath,
      inputProps: videoProps,
      concurrency,
      onProgress: ({ renderedFrames, progress }) => {
        const percent = Math.floor(progress * 100);
        if (onProgress) {
          onProgress(percent);
        }
      },
    });

    const durationMs = Date.now() - startTime;
    return {
      outputPath,
      outputUrl,
      durationMs,
    };
  }
}

export const remotionRenderer = new RemotionRendererService();
