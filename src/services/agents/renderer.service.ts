import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { env } from "@/config/env";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "@/remotion/constants";
import type { RemotionCompositionProps } from "@/schemas/video-blueprint";

export async function getOrCreateRemotionBundle(): Promise<string> {
  // Always bundle with current publicDir so new job audio chunks in /public/renders/[jobId]/audio/ are accessible
  const entryPoint = path.join(process.cwd(), "src", "remotion", "index.ts");
  const bundleLocation = await bundle({
    entryPoint,
    publicDir: path.join(process.cwd(), "public"),
    webpackOverride: (config) => {
      return {
        ...config,
        resolve: {
          ...config.resolve,
          alias: {
            ...(config.resolve?.alias ?? {}),
            "@": path.join(process.cwd(), "src"),
          },
        },
      };
    },
  });

  return bundleLocation;
}

export async function runRemotionRenderAgent(params: {
  jobId: string;
  compositionProps: RemotionCompositionProps;
  onProgress?: (percent: number) => Promise<void>;
}): Promise<{ outputMp4Url: string; outputFilePath: string }> {
  const { jobId, compositionProps, onProgress } = params;

  // Enforce strictly 1080x1920 @ 30fps
  compositionProps.fps = VIDEO_FPS;
  compositionProps.width = VIDEO_WIDTH;
  compositionProps.height = VIDEO_HEIGHT;

  const outputDir = path.join(process.cwd(), "public", "renders", jobId);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFilePath = path.join(outputDir, "output.mp4");
  const outputMp4Url = `/renders/${jobId}/output.mp4`;

  // Save compiled RemotionCompositionProps JSON alongside output.mp4 for inspection
  const propsJsonPath = path.join(outputDir, "composition-props.json");
  fs.writeFileSync(propsJsonPath, JSON.stringify(compositionProps, null, 2));

  const serveUrl = await getOrCreateRemotionBundle();
  const compositionId = "KitabedahMain";

  // Deterministic port offset based on jobId chars
  const portOffset = (jobId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 70);
  const safePort = 3320 + portOffset;

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps: compositionProps,
    port: safePort,
    chromiumOptions: {
      gl: "angle",
    },
  });

  let lastReportedPercent = -1;

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames: compositionProps.durationInFrames,
      fps: compositionProps.fps,
      width: compositionProps.width,
      height: compositionProps.height,
    },
    serveUrl,
    port: safePort + 1,
    codec: "h264",
    outputLocation: outputFilePath,
    inputProps: compositionProps,
    concurrency: env.REMOTION_CONCURRENCY || 4,
    chromiumOptions: {
      gl: "angle",
    },
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct !== lastReportedPercent && pct % 10 === 0 && onProgress) {
        lastReportedPercent = pct;
        void onProgress(pct);
      }
    },
  });

  return {
    outputMp4Url,
    outputFilePath,
  };
}
