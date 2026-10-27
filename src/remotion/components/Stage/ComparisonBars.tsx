import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneBar, VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';

const CHART_HEIGHT = 470;
const CRITICAL = "#FF3B3B";

function num(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function Bar({
  bar,
  max,
  accent,
  progress,
}: {
  bar: SceneBar;
  max: number;
  accent: string;
  progress: number;
}) {
  const ratio = Math.min(1, Math.max(0.02, bar.value / max));
  const height = Math.round(ratio * CHART_HEIGHT * progress);
  const color = bar.highlight ? CRITICAL : accent;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-end",
        height: CHART_HEIGHT + 118,
        width: 214,
      }}
    >
      <div
        style={{
          fontFamily: ANTON_FAMILY,
          fontSize: 76,
          lineHeight: 1,
          color: bar.highlight ? CRITICAL : "#FFFFFF",
          textShadow: `0 0 32px ${color}55`,
          opacity: interpolate(progress, [0, 0.45, 1], [0, 0.4, 1]),
          marginBottom: 12,
        }}
      >
        {num(bar.value)}
      </div>
      <div
        style={{
          width: 132,
          height,
          background: `linear-gradient(180deg, ${color} 0%, ${color}44 100%)`,
          border: `3px solid ${color}`,
          borderRadius: "6px 6px 0 0",
          boxShadow: `0 0 46px ${color}44`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 2,
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.24) 0px, rgba(0,0,0,0.24) 2px, transparent 2px, transparent 8px)",
          }}
        />
      </div>
      <div
        style={{
          width: 172,
          marginTop: 16,
          padding: "8px 6px 6px",
          borderTop: `3px solid ${color}`,
          fontFamily: MONO,
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: 3,
          textAlign: "center",
          textTransform: "uppercase",
          color: bar.highlight ? CRITICAL : "rgba(255,255,255,0.8)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {bar.label}
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: 2,
          color: "rgba(255,255,255,0.45)",
        }}
      >
        {bar.unit}
      </div>
    </div>
  );
}

/**
 * Vertical comparison bars with spring physics. Labels are at most two words;
 * every value is a number that already exists in the narration.
 */
export const ComparisonBars: React.FC<{ scene: VisualScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = scene.accentColor || "#39FF14";
  const bars = (scene.bars ?? []).slice(0, 3);
  if (bars.length === 0) return null;

  const max = Math.max(...bars.map((bar) => bar.value), 1) * 1.12;
  const enter = spring({
    frame,
    fps,
    durationInFrames: Math.round(
      Math.max(0.8, Math.min(1.5, (scene.duration ?? 2.4) * 0.66)) * fps,
    ),
    config: { damping: 16, mass: 0.8, stiffness: 90 },
  });
  const progress = interpolate(enter, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #080b10 0%, #0b1118 58%, #050608 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage: `linear-gradient(${accent}44 1px, transparent 1px)`,
          backgroundSize: "100% 86px",
          backgroundPosition: "0 150px",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 26,
          left: 26,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontFamily: MONO,
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.62)",
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
          }}
        />
        {scene.stageLabel || "PERBANDINGAN"}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 22,
          paddingBottom: 54,
        }}
      >
        {bars.map((bar, index) => {
          const stagger = Math.max(
            0,
            Math.min(
              1,
              (progress - index * 0.12) / Math.max(0.4, 1 - index * 0.12),
            ),
          );
          return (
            <Bar
              key={`${bar.label}-${index}`}
              bar={bar}
              max={max}
              accent={accent}
              progress={stagger}
            />
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 30,
          right: 30,
          bottom: 46,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "2px solid rgba(255,255,255,0.07)",
        }}
      />
    </AbsoluteFill>
  );
};
