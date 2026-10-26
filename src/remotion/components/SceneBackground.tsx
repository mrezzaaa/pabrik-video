import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneProps } from "../types";

/**
 * Moving background only: gradient/video, Ken Burns, light blobs and a subtle
 * grid. No emoji watermark and no developer ticker — the center stage owns
 * the attention now.
 */
export const SceneBackground: React.FC<SceneProps> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(0.5, scene.endTime - scene.startTime);
  const progress = Math.min(1, frame / (duration * fps));
  const t = frame / fps;
  const intensity = Math.min(0.5, Math.max(0.1, scene.motion.intensity));

  const kenBurns =
    scene.kenBurns === false
      ? 1
      : interpolate(progress, [0, 1], [1, 1.18], {
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
        interpolate(progress, [0, 1], [1, 1.05 + intensity * 0.2]);
      translateX = interpolate(progress, [0, 1], [-14, 14]);
      break;
    case "zoomOut":
      scale =
        kenBurns *
        interpolate(progress, [0, 1], [1.06 + intensity * 0.2, 1]);
      translateY = interpolate(progress, [0, 1], [-16, 16]);
      break;
    case "pan":
      scale = kenBurns * 1.05;
      translateX = interpolate(progress, [0, 1], [-70, 70]) * (1 + intensity);
      rotate = interpolate(progress, [0, 1], [-0.5, 0.5]);
      break;
    case "panLeft":
      scale = kenBurns * 1.05;
      translateX = interpolate(progress, [0, 1], [70, -70]) * (1 + intensity);
      rotate = interpolate(progress, [0, 1], [0.5, -0.5]);
      break;
    case "shake":
      scale = kenBurns * (1.02 + intensity * 0.1);
      translateX = Math.sin(frame * 2.2) * (6 + intensity * 28);
      translateY = Math.cos(frame * 2.9) * (5 + intensity * 22);
      rotate = Math.sin(frame * 1.6) * (0.3 + intensity * 0.7);
      break;
  }

  const accent = scene.accentColor || "#39FF14";
  const hasVideo =
    scene.background.type === "video" && Boolean(scene.background.videoUrl);
  const danger = scene.theme === "danger";

  return (
    <AbsoluteFill style={{ backgroundColor: "#050505", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -80,
          transform: `scale(${scale}) translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotate}deg)`,
          transformOrigin: "center center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              scene.background.fallback ||
              (scene.background.type === "gradient"
                ? scene.background.value
                : "#050505"),
          }}
        />
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
              opacity: 0.55,
              filter: "saturate(1.05) contrast(1.05) brightness(0.72)",
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: -260 + Math.sin(t * 0.9 + index) * 90,
          top: 240 + Math.cos(t * 1.1 + index) * 70,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${danger ? "#FF3B3B" : accent}55 0%, transparent 66%)`,
          filter: "blur(48px)",
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          right: -220 + Math.cos(t * 0.7 + index) * 70,
          bottom: 160 + Math.sin(t * 1.2) * 60,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,46,147,0.32) 0%, transparent 66%)",
          filter: "blur(52px)",
          mixBlendMode: "screen",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          transform: `perspective(700px) rotateX(58deg) translateY(${(t * 26) % 96}px) scale(1.8)`,
          transformOrigin: "center 78%",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: -200,
          opacity: 0.06,
          backgroundImage: `repeating-linear-gradient(115deg, ${accent} 0px, ${accent} 2px, transparent 2px, transparent 46px)`,
          transform: `translateX(${(t * 30) % 46}px)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent 5px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.32) 82%, rgba(0,0,0,0.72) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
