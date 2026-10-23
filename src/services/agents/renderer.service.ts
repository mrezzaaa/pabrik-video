import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { env } from "@/config/env";
import type { RemotionCompositionProps } from "@/schemas/video-blueprint";

let cachedBundleLocation: string | null = null;

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

  cachedBundleLocation = bundleLocation;
  return bundleLocation;
}

export async function runRemotionRenderAgent(params: {
  jobId: string;
  compositionProps: RemotionCompositionProps;
  onProgress?: (percent: number) => Promise<void>;
}): Promise<{ outputMp4Url: string; outputFilePath: string }> {
  const { jobId, compositionProps, onProgress } = params;

  const outputDir = path.join(process.cwd(), "public", "renders", jobId);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputFilePath = path.join(outputDir, "output.mp4");
  const outputMp4Url = `/renders/${jobId}/output.mp4`;

  // Save compiled RemotionCompositionProps JSON alongside output.mp4 for inspection
  const propsJsonPath = path.join(outputDir, "composition-props.json");
  fs.writeFileSync(propsJsonPath, JSON.stringify(compositionProps, null, 2));

  const serveUrl = await getOrCreateRemotionBundle();
  const compositionId =
    compositionProps.aspectRatioMode === "SHORTS_9_16"
      ? "BedahVideoShorts"
      : "BedahVideoComposition";

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps: compositionProps,
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
    codec: "h264",
    outputLocation: outputFilePath,
    inputProps: compositionProps,
    concurrency: env.REMOTION_CONCURRENCY || 4,
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
