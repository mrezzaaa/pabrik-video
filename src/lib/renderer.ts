import path from "path";
import fs from "fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { VideoProps } from "./types";
import type { TechVideoProps } from "./tech-storyboard";

export class RemotionRendererService {
  private bundleLocationPromise: Promise<string> | null = null;

  private async getBundleLocation(): Promise<string> {
    if (!this.bundleLocationPromise) {
      this.bundleLocationPromise = (async () => {
        const publicSource = path.join(process.cwd(), "public");
        const bundleLoc = await bundle({
          entryPoint: path.join(process.cwd(), "src", "remotion", "index.ts"),
          publicDir: publicSource,
          webpackOverride: (config) => config,
        });

        // Ensure bundle's public directory is a live symlink to project's public folder
        // Remotion bundler copies publicDir at bundle start time, so dynamic assets downloaded
        // in Stage 3 & 4 for subsequent jobs wouldn't exist in the bundle unless symlinked.
        try {
          const bundlePublicDir = path.join(bundleLoc, "public");
          if (fs.existsSync(bundlePublicDir)) {
            const stat = fs.lstatSync(bundlePublicDir);
            if (!stat.isSymbolicLink()) {
              fs.rmSync(bundlePublicDir, { recursive: true, force: true });
              fs.symlinkSync(publicSource, bundlePublicDir, "dir");
            }
          } else {
            fs.symlinkSync(publicSource, bundlePublicDir, "dir");
          }
        } catch (symlinkErr) {
          console.warn("[REMOTION] Warning: Could not create live public symlink:", symlinkErr);
        }

        return bundleLoc;
      })();
    }

    const bundleLoc = await this.bundleLocationPromise;
    // Keep bundle public folder fresh for every render
    try {
      const publicSource = path.join(process.cwd(), "public");
      const bundlePublicDir = path.join(bundleLoc, "public");
      if (!fs.existsSync(bundlePublicDir) || !fs.lstatSync(bundlePublicDir).isSymbolicLink()) {
        fs.rmSync(bundlePublicDir, { recursive: true, force: true });
        fs.symlinkSync(publicSource, bundlePublicDir, "dir");
      }
    } catch (_) {}

    return bundleLoc;
  }

  /**
   * STAGE 5: Render composition to vertical 1080x1920 MP4
   */
  async renderVideo(
    jobId: string,
    videoProps: VideoProps | TechVideoProps,
    onProgress?: (progress: number) => void,
    compositionId: "MainVideo" | "TechVideo" = "MainVideo"
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

    // Use a dedicated high port (3123) for Remotion's internal HTTP server to avoid Vite collision on 3000
    const remotionPort = 3123;

    // Komposisi 3D memakai WebGL:
    // - Di macOS (Apple Silicon / Intel): gunakan "angle" untuk akselerasi hardware GPU via Metal API
    // - Di Linux/Docker tanpa hardware GPU: fallback ke software rasterizer "swangle" (SwiftShader CPU)
    const defaultGl = process.platform === "darwin" ? "angle" : "swangle";
    const glRenderer = (process.env.REMOTION_GL || defaultGl) as
      | "swangle"
      | "swiftshader"
      | "angle"
      | "egl";

    const chromiumOptions = {
      gl: glRenderer,
    };

    console.log(
      `[REMOTION] Starting render pipeline: composition=${compositionId}, gl=${glRenderer} (GPU accelerated: ${glRenderer === "angle"}), platform=${process.platform}`
    );

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: videoProps,
      port: remotionPort,
      chromiumOptions,
    });

    const cpuCount = typeof require !== "undefined" ? require("os").cpus().length : 4;
    const defaultConcurrency = process.platform === "darwin" ? Math.min(4, Math.max(2, Math.floor(cpuCount / 2))) : 2;
    const concurrency = parseInt(
      process.env.REMOTION_CONCURRENCY || String(defaultConcurrency),
      10
    );

    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: videoProps.totalDurationInFrames,
      },
      serveUrl: bundleLocation,
      codec: "h264",
      port: remotionPort,
      chromiumOptions,
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
