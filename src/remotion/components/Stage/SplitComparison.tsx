import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneVisual, VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";
import { CompareBody } from "./VisualParts";

/**
 * SPLIT_COMPARISON — myth vs fact / danger vs safe, two glass columns with a
 * VS medallion. The layout is reserved for real comparisons so it never loses
 * information when rotated.
 */
export const SplitComparison: React.FC<{
  scene: VisualScene;
  index: number;
  accent: string;
  theme: "danger" | "warn" | "info" | "success";
}> = ({ scene, index, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneSeconds = Math.max(0.5, scene.endTime - scene.startTime);
  const localFrames = Math.max(12, Math.round(sceneSeconds * fps));
  const t = frame / fps;

  const enter = spring({
    frame,
    fps,
    config: { damping: 13, mass: 0.55, stiffness: 185 },
  });
  const exit = interpolate(frame, [localFrames - 7, localFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const compare: Extract<SceneVisual, { kind: "compare" }> =
    scene.visual?.kind === "compare"
      ? scene.visual
      : {
          kind: "compare",
          left: { title: "MITOS", items: [scene.headline] },
          right: {
            title: "FAKTA",
            items: [scene.subheadline || scene.overlay?.textHook || "BUKAN MITOS"],
          },
        };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 60}px) scale(${0.92 + 0.08 * enter})`,
        display: "flex",
        flexDirection: "column",
        padding: "10px 0 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: ANTON_FAMILY,
            fontSize: scene.headline.length > 18 ? 58 : 70,
            lineHeight: 0.92,
            color: "#FFFFFF",
            textTransform: "uppercase",
            letterSpacing: -1,
            textShadow: "0 6px 0 rgba(0,0,0,0.55)",
            flex: 1,
          }}
        >
          {scene.headline}
        </div>
        <div
          style={{
            padding: "8px 16px",
            background: accent,
            color: "#050505",
            fontFamily: ANTON_FAMILY,
            fontSize: 26,
            letterSpacing: 1,
            textTransform: "uppercase",
            transform: `rotate(${index % 2 === 0 ? -2 : 2}deg)`,
            whiteSpace: "nowrap",
            maxWidth: 320,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {scene.subheadline || scene.overlay?.textHook || "VS"}
        </div>
      </div>

      <div style={{ position: "relative", flex: 1 }}>
        <CompareBody compare={compare} t={t} fps={fps} accent={accent} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginTop: 14,
        }}
      >
        {(scene.tags ?? []).slice(0, 3).map((tag, tagIndex) => (
          <div
            key={`${tag}-${tagIndex}`}
            style={{
              padding: "6px 14px",
              border: `2px solid ${accent}77`,
              color: accent,
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 18,
              letterSpacing: 2,
              textTransform: "uppercase",
              background: "rgba(0,0,0,0.35)",
              transform: `rotate(${tagIndex === 1 ? -1.5 : 1.5}deg)`,
            }}
          >
            {tag}
          </div>
        ))}
      </div>
    </div>
  );
};
