import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneProps } from "../types";

function imageSrc(scene: SceneProps["scene"]) {
  const value = scene.imageUrl?.replace(/^\/+/, "");
  return value ? staticFile(value) : null;
}

/**
 * Full-screen background provider across all scenes.
 * Renders real B-roll images or video behind everything (including Statistics,
 * Metrics, and Compare stages). Never uses artificial neon gradients.
 */
export const SceneBackground: React.FC<SceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(0.5, scene.endTime - scene.startTime);
  const progress = Math.min(1, frame / (duration * fps));
  const intensity = Math.min(0.5, Math.max(0.1, scene.motion.intensity));

  const kenBurns =
    scene.kenBurns === false
      ? 1.02
      : interpolate(progress, [0, 1], [1.02, 1.15], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  let scale = kenBurns;
  let translateX = 0;
  let translateY = 0;
  let rotate = 0;

  switch (scene.motion.type) {
    case "zoomIn":
      scale =
        kenBurns *
        interpolate(progress, [0, 1], [1, 1.04 + intensity * 0.15]);
      translateX = interpolate(progress, [0, 1], [-16, 16]);
      break;
    case "zoomOut":
      scale =
        kenBurns *
        interpolate(progress, [0, 1], [1.05 + intensity * 0.15, 1]);
      translateY = interpolate(progress, [0, 1], [-14, 14]);
      break;
    case "pan":
      scale = kenBurns * 1.04;
      translateX = interpolate(progress, [0, 1], [-45, 45]) * (1 + intensity);
      rotate = interpolate(progress, [0, 1], [-0.4, 0.4]);
      break;
    case "panLeft":
      scale = kenBurns * 1.04;
      translateX = interpolate(progress, [0, 1], [45, -45]) * (1 + intensity);
      rotate = interpolate(progress, [0, 1], [0.4, -0.4]);
      break;
    case "shake":
      scale = kenBurns * (1.02 + intensity * 0.08);
      translateX = Math.sin(frame * 2.2) * (5 + intensity * 18);
      translateY = Math.cos(frame * 2.9) * (4 + intensity * 16);
      rotate = Math.sin(frame * 1.6) * (0.2 + intensity * 0.5);
      break;
  }

  const danger = scene.theme === "danger";
  const hasVideo =
    scene.background.type === "video" && Boolean(scene.background.videoUrl);
  const src = imageSrc(scene);
  const isSvgStage = scene.visualType !== "B_ROLL_IMAGE";

  return (
    <AbsoluteFill style={{ backgroundColor: "#06080d", overflow: "hidden" }}>
      {/* Real B-roll Video or Photo with Ken Burns motion */}
      <div
        style={{
          position: "absolute",
          inset: -60,
          transform: `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotate}deg)`,
          transformOrigin: "center center",
        }}
      >
        {hasVideo ? (
          <OffthreadVideo
            src={scene.background.videoUrl as string}
            muted
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: danger
                ? "saturate(0.9) contrast(1.1) brightness(0.75)"
                : "saturate(1.02) contrast(1.05) brightness(0.8)",
            }}
          />
        ) : src ? (
          <Img
            src={src}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: danger
                ? "saturate(0.9) contrast(1.1) brightness(0.8) hue-rotate(-6deg)"
                : "saturate(1.05) contrast(1.08) brightness(0.85)",
            }}
          />
        ) : (
          /* Neutral dark plate only if no image/video is available (never colorful gradient) */
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#070a0f",
            }}
          />
        )}
      </div>

      {/* When displaying Statistics / Metrics / Compare stages, darken slightly so data text is crisp */}
      {isSvgStage ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(3, 6, 12, 0.56)",
            backdropFilter: "blur(1.5px)",
          }}
        />
      ) : null}

      {/* Top & bottom cinematic gradients for TopBar and Caption legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: danger
            ? "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(20,0,0,0.1) 22%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.85) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.08) 22%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Subtle cinematic texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.85) 1px, transparent 1px, transparent 4px)",
        }}
      />
    </AbsoluteFill>
  );
};
