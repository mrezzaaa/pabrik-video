import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";
import { StampBody } from "./VisualParts";

/**
 * FULL_KINETIC_IMPACT — 1-3 word punchline that takes over the center stage.
 * High-contrast strobe on entry, damped shake, giant Anton type.
 */
export const FullKineticImpact: React.FC<{
  scene: VisualScene;
  index: number;
  accent: string;
  theme: "danger" | "warn" | "info" | "success";
}> = ({ scene, index, accent, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneSeconds = Math.max(0.5, scene.endTime - scene.startTime);
  const localFrames = Math.max(12, Math.round(sceneSeconds * fps));
  const t = frame / fps;

  const enter = spring({
    frame,
    fps,
    config: { damping: 9, mass: 0.6, stiffness: 260 },
  });
  const exit = interpolate(frame, [localFrames - 6, localFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const danger = theme === "danger";
  const color = danger ? "#FF2D2D" : accent;
  const impact = Math.min(1, t / 0.32);
  const shake = Math.sin(t * 78) * 22 * (1 - impact);
  const strobe = frame < 4 ? 0.32 : 0;

  const stamp = scene.visual?.kind === "stamp" ? scene.visual : null;
  const words = (scene.headline || "FAKTA").split(/\s+/).filter(Boolean);
  const impactWord = words.slice(0, 3).join(" ");
  const fontSize =
    impactWord.length > 16 ? 116 : impactWord.length > 10 ? 148 : 196;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: exit,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -40,
          background: `radial-gradient(circle at 50% 46%, ${color}44 0%, transparent 62%)`,
          opacity: 0.8,
        }}
      />

      {stamp ? (
        <StampBody stamp={stamp} t={t} fps={fps} accent={accent} theme={theme} />
      ) : (
        <>
          <div
            style={{
              position: "relative",
              fontFamily: ANTON_FAMILY,
              fontSize,
              lineHeight: 0.9,
              letterSpacing: -3,
              color: frame < 6 ? "#050505" : "#FFFFFF",
              background: frame < 6 ? color : "transparent",
              padding: frame < 6 ? "8px 26px" : 0,
              textTransform: "uppercase",
              textAlign: "center",
              WebkitTextStroke: frame < 6 ? "0" : "7px #050505",
              paintOrder: "stroke fill",
              textShadow:
                frame < 6
                  ? "none"
                  : `10px 10px 0 ${color}, 0 0 60px ${color}77`,
              transform: `translate(${shake}px, ${shake * 0.55}px) rotate(${index % 2 === 0 ? -2 : 2}deg) scale(${2.1 - 1.1 * enter})`,
            }}
          >
            {impactWord}
          </div>

          <div
            style={{
              position: "relative",
              marginTop: 34,
              padding: "10px 24px",
              background: "#050505",
              border: `3px solid ${color}`,
              color: "#FFFFFF",
              fontFamily: ANTON_FAMILY,
              fontSize: 38,
              letterSpacing: 1,
              textTransform: "uppercase",
              textAlign: "center",
              transform: `translateY(${(1 - enter) * 30}px)`,
              maxWidth: 820,
            }}
          >
            {scene.subheadline || scene.overlay?.textHook || "FAKTA GILA"}
          </div>
        </>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: color,
          opacity: strobe,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
