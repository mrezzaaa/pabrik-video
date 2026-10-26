import React from "react";
import {
  OffthreadVideo,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";
import { PosterArt } from "./PosterArt";
import { CrossBody, TimelineBody } from "./VisualParts";

const MONO = "ui-monospace, Menlo, Consolas, monospace";

/**
 * B_ROLL_FRAME — a tilted "specimen" frame in the center of the canvas.
 * Shows a stock video (Pexels) when available, an informational SVG, or a
 * locally generated poster. Always Ken Burns, never a static card.
 */
export const BRollFrame: React.FC<{
  scene: VisualScene;
  index: number;
  accent: string;
  theme: "danger" | "warn" | "info" | "success";
}> = ({ scene, index, accent, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneSeconds = Math.max(0.5, scene.endTime - scene.startTime);
  const localFrames = Math.max(12, Math.round(sceneSeconds * fps));
  const progress = Math.min(1, frame / localFrames);
  const t = frame / fps;

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 170 },
  });
  const exit = interpolate(
    frame,
    [localFrames - 7, localFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const zoom = interpolate(progress, [0, 1], [1.02, 1.16]);
  const panX = interpolate(progress, [0, 1], [-16, 16]);
  const panY = interpolate(progress, [0, 1], [10, -10]);
  const videoUrl = scene.background.videoUrl;
  const visual = scene.visual;
  const tilt = index % 2 === 0 ? -2.2 : 1.8;
  const subheadline =
    scene.subheadline || scene.overlay?.textHook || scene.tags?.[0] || "";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 70}px) scale(${0.92 + 0.08 * enter})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "6px 12px 2px",
          background: "#F2EDE1",
          padding: "16px 16px 0",
          borderRadius: 8,
          transform: `rotate(${tilt}deg)`,
          boxShadow:
            "0 34px 70px rgba(0,0,0,0.62), 0 10px 0 rgba(0,0,0,0.28)",
        }}
      >
        {/* tape strips */}
        <div
          style={{
            position: "absolute",
            top: -16,
            left: 38,
            width: 128,
            height: 34,
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(0,0,0,0.08)",
            transform: "rotate(-8deg)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -14,
            right: 44,
            width: 112,
            height: 30,
            background: "rgba(255,255,255,0.45)",
            transform: "rotate(7deg)",
            boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
          }}
        />

        <div
          style={{
            position: "relative",
            height: 640,
            overflow: "hidden",
            background: "#04070d",
            borderRadius: 4,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: -24,
              transform: `scale(${zoom}) translate3d(${panX}px, ${panY}px, 0)`,
              transformOrigin: "center center",
            }}
          >
            {videoUrl && scene.background.type === "video" ? (
              <OffthreadVideo
                src={videoUrl}
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "saturate(1.08) contrast(1.06)",
                }}
              />
            ) : visual?.kind === "crosssection" ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(circle at 55% 40%, ${accent}22 0%, #04070d 70%)`,
                }}
              >
                <CrossBody cross={visual} t={t} fps={fps} accent={accent} />
              </div>
            ) : visual?.kind === "timeline" ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(circle at 55% 40%, ${accent}22 0%, #04070d 70%)`,
                }}
              >
                <TimelineBody timeline={visual} t={t} fps={fps} accent={accent} />
              </div>
            ) : (
              <PosterArt
                headline={scene.headline}
                keywords={scene.tags?.length ? scene.tags : scene.bRollKeywords}
                emoji={scene.overlayEmoji}
                accent={accent}
                progress={progress}
                theme={theme}
              />
            )}
          </div>

          {/* subtle photographic grade + scanlines */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.24) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.5) 100%)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.14,
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent 5px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              padding: "6px 12px",
              background: accent,
              color: "#050505",
              fontFamily: MONO,
              fontSize: 18,
              letterSpacing: 3,
              fontWeight: 800,
              transform: "rotate(-2deg)",
            }}
          >
            {scene.tags?.[0] ?? "FAKTA"}
          </div>
        </div>

        {/* polaroid caption */}
        <div
          style={{
            padding: "18px 10px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              fontFamily: ANTON_FAMILY,
              fontSize: scene.headline.length > 18 ? 50 : 60,
              lineHeight: 0.95,
              color: "#101010",
              textTransform: "uppercase",
              letterSpacing: -1,
            }}
          >
            {scene.headline}
          </div>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              letterSpacing: 2,
              color: theme === "danger" ? "#B00020" : "#3A3A3A",
              textTransform: "uppercase",
            }}
          >
            {subheadline}
          </div>
        </div>
      </div>
    </div>
  );
};
