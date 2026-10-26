import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ANTON_FAMILY } from "../fonts";
import type { SceneProps } from "../types";

/**
 * Anti-boring patch overlays:
 * - textHook pops within the first 0.3s of a scene
 * - numbers animate as a counter with a big scale
 * The hook banner already owns scene 0, so the textHook is skipped there.
 */
export const SceneOverlay: React.FC<SceneProps> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneSeconds = Math.max(0.5, scene.endTime - scene.startTime);
  const sceneFrames = Math.max(12, Math.round(sceneSeconds * fps));

  const hookLength = Math.min(
    sceneFrames - 4,
    Math.max(14, Math.round(Math.min(1.5, sceneSeconds * 0.65) * fps)),
  );
  const hookExit = interpolate(
    frame,
    [hookLength - 8, hookLength],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const hookEnter = spring({
    frame,
    fps,
    config: { damping: 10, mass: 0.45, stiffness: 220 },
  });

  const textHook = scene.overlay?.textHook ?? "";
  const counter = scene.overlay?.counter;
  // A counter already spells the number out; showing both is redundant.
  const showTextHook =
    index > 0 && !counter && Boolean(textHook) && frame <= hookLength;

  const counterLength = Math.min(
    sceneFrames - 2,
    Math.round(Math.min(1.4, sceneSeconds * 0.6) * fps),
  );
  const counterExit = interpolate(
    frame,
    [counterLength - 8, counterLength],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const counterEnter = spring({
    frame,
    fps,
    config: { damping: 9, mass: 0.4, stiffness: 210 },
  });

  if (!showTextHook && !counter) return null;

  const countProgress = Math.min(1, frame / Math.max(1, fps * 0.55));
  const counterValue = counter
    ? Math.round(
        counter.value * interpolate(countProgress, [0, 1], [0, 1]),
      )
    : 0;
  const suffix = counter?.suffix ?? "";
  const accent = scene.accentColor || "#39FF14";

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 35 }}>
      {showTextHook ? (
        <div
          style={{
            position: "absolute",
            top: 590,
            left: 70,
            right: 70,
            display: "flex",
            justifyContent: "center",
            opacity: hookEnter * hookExit,
            transform: `translateY(${(1 - hookEnter) * 60}px) scale(${interpolate(
              hookEnter,
              [0, 1],
              [0.55, 1],
            )}) rotate(-2deg)`,
          }}
        >
          <div
            style={{
              backgroundColor: accent,
              color: "#050505",
              border: "5px solid #050505",
              boxShadow: `12px 12px 0 #050505, 0 0 44px ${accent}88`,
              padding: "12px 28px 16px",
              fontFamily: ANTON_FAMILY,
              fontSize: textHook.length > 12 ? 68 : 88,
              lineHeight: 0.95,
              letterSpacing: -1,
              textTransform: "uppercase",
              textAlign: "center",
              maxWidth: 900,
              WebkitTextStroke: "0",
              textShadow: "none",
            }}
          >
            {textHook}
          </div>
        </div>
      ) : null}

      {counter ? (
        <div
          style={{
            position: "absolute",
            top: showTextHook ? 780 : 700,
            left: 90,
            right: 90,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: 14,
            opacity: counterEnter * counterExit,
            transform: `scale(${interpolate(counterEnter, [0, 1], [0.4, 1.08])})`,
          }}
        >
          <div
            style={{
              fontFamily: ANTON_FAMILY,
              fontSize: 154,
              lineHeight: 0.85,
              color: "#FFFF00",
              WebkitTextStroke: "6px #000",
              paintOrder: "stroke fill",
              textShadow: "9px 9px 0 #000, 0 0 46px rgba(255,255,0,0.65)",
            }}
          >
            {counter.prefix ?? ""}
            {counterValue.toLocaleString("id-ID")}
          </div>
          {suffix ? (
            <div
              style={{
                fontFamily: ANTON_FAMILY,
                fontSize: 54,
                lineHeight: 0.9,
                color: "#fff",
                WebkitTextStroke: "4px #000",
                paintOrder: "stroke fill",
                textShadow: "6px 6px 0 #000",
                maxWidth: 420,
              }}
            >
              {suffix}
            </div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
