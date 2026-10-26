import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneProps } from "../types";

export const SceneBackground: React.FC<SceneProps> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const duration = Math.max(0.5, scene.endTime - scene.startTime);
  const progress = Math.min(1, frame / (duration * fps));
  const t = frame / fps;
  const intensity = Math.min(0.5, Math.max(0.1, scene.motion.intensity));

  // Anti-boring patch: every scene gets a slow 1 -> 1.2 Ken Burns push.
  const kenBurns =
    scene.kenBurns === false
      ? 1
      : interpolate(progress, [0, 1], [1, 1.2], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  let scale = kenBurns;
  let translateX = 0;
  let translateY = 0;
  let rotate = 0;

  switch (scene.motion.type) {
    case "zoomIn":
      scale = kenBurns * interpolate(progress, [0, 1], [1, 1.05 + intensity * 0.2]);
      translateX = interpolate(progress, [0, 1], [-12, 12]);
      break;
    case "zoomOut":
      scale = kenBurns * interpolate(progress, [0, 1], [1.06 + intensity * 0.2, 1]);
      translateY = interpolate(progress, [0, 1], [-14, 14]);
      break;
    case "pan":
      scale = kenBurns * 1.04;
      translateX = interpolate(progress, [0, 1], [-70, 70]) * (1 + intensity);
      rotate = interpolate(progress, [0, 1], [-0.6, 0.6]);
      break;
    case "panLeft":
      scale = kenBurns * 1.04;
      translateX = interpolate(progress, [0, 1], [70, -70]) * (1 + intensity);
      rotate = interpolate(progress, [0, 1], [0.6, -0.6]);
      break;
    case "shake":
      scale = kenBurns * (1.02 + intensity * 0.12);
      translateX = Math.sin(frame * 2.4) * (8 + intensity * 40);
      translateY = Math.cos(frame * 3.1) * (6 + intensity * 30);
      rotate = Math.sin(frame * 1.7) * (0.4 + intensity);
      break;
  }

  // Micro cuts every 1.5s: a tiny punch + flash keeps the eye busy.
  const cut = Math.floor(t / 1.5);
  const cutPhase = (t % 1.5) / 1.5;
  const cutPunch = 1 + (cut % 2 === 0 ? 0.012 : -0.008) * (1 - cutPhase);
  scale *= cutPunch;
  translateX += Math.sin(cut * 1.9 + index) * 6;

  const flash = t % 1.5 < 0.075 ? 0.1 : 0;
  const accent = scene.accentColor || "#39FF14";
  const tickerWords = (
    scene.bRollKeywords.length > 0
      ? scene.bRollKeywords
      : ["VIRAL", "FAKTA"]
  )
    .slice(0, 2)
    .map((word) => word.slice(0, 14));
  const words = tickerWords.join("  •  ");
  const hasVideo =
    scene.background.type === "video" && Boolean(scene.background.videoUrl);

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
              opacity: 0.72,
              filter: "saturate(1.1) contrast(1.08)",
            }}
          />
        ) : null}
      </div>

      {/* Moving light blobs */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: -260 + Math.sin(t * 0.9 + index) * 90,
          top: 110 + Math.cos(t * 1.1 + index) * 70,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}66 0%, transparent 66%)`,
          filter: "blur(40px)",
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          right: -220 + Math.cos(t * 0.7 + index) * 70,
          bottom: 120 + Math.sin(t * 1.2) * 60,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,46,147,0.42) 0%, transparent 66%)",
          filter: "blur(50px)",
          mixBlendMode: "screen",
        }}
      />

      {/* Big parallax emoji — 400px, 20% opacity, 1px blur. */}
      <div
        style={{
          position: "absolute",
          right: -30 + Math.sin(progress * Math.PI * 2) * 42,
          top: 420 + interpolate(progress, [0, 1], [70, -70]),
          fontSize: 400,
          lineHeight: 1,
          opacity: 0.2,
          filter: "blur(1px) drop-shadow(0 0 50px rgba(0,0,0,0.55))",
          transform: `rotate(${Math.sin(t * 0.5 + index) * 9 - 6}deg) scale(${interpolate(
            progress,
            [0, 1],
            [1.05, 0.92],
          )})`,
        }}
      >
        {scene.overlay?.bigEmoji || scene.overlayEmoji}
      </div>

      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.14,
          backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
          backgroundSize: "96px 96px",
          transform: `perspective(700px) rotateX(58deg) translateY(${(t * 26) % 96}px) scale(1.8)`,
          transformOrigin: "center 75%",
        }}
      />

      {/* Diagonal stripes */}
      <div
        style={{
          position: "absolute",
          inset: -200,
          opacity: 0.08,
          backgroundImage: `repeating-linear-gradient(115deg, ${accent} 0px, ${accent} 2px, transparent 2px, transparent 46px)`,
          transform: `translateX(${(t * 34) % 46}px)`,
        }}
      />

      {/* Vertical ticker */}
      <div
        style={{
          position: "absolute",
          right: 8,
          top: 130,
          bottom: 400,
          writingMode: "vertical-rl",
          fontFamily: "monospace",
          fontSize: 30,
          letterSpacing: 8,
          whiteSpace: "nowrap",
          color: accent,
          opacity: 0.55,
          transform: `translateY(${Math.sin(t * 0.5) * 20}px)`,
        }}
      >
        {words.toUpperCase()}
      </div>

      {/* Flash cut */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: accent,
          opacity: flash,
          mixBlendMode: "screen",
        }}
      />

      {/* Scanlines + vignette (also darkens b-roll for caption contrast). */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.12,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 1px, transparent 1px, transparent 5px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 86%, rgba(0,0,0,0.92) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
