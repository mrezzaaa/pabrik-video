import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';

const WIDTH = 900;
const HEIGHT = 560;
const MID = 300;

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * ECG / cognitive-speed line. The trace keeps a healthy amplitude until the
 * dip point, then drops and flatlines to visualise a negative impact.
 */
export const CognitiveWave: React.FC<{ scene: VisualScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = scene.accentColor || "#39FF14";
  const danger = scene.theme === "danger";
  const dip = Math.min(0.84, Math.max(0.24, scene.wave?.dip ?? 0.58));
  const dipX = dip * WIDTH;

  const duration = Math.max(0.8, Math.min(1.8, (scene.duration ?? 2.4) * 0.7));
  const draw = Math.min(1, frame / (duration * fps));

  const samples = 96;
  const points = Array.from({ length: samples + 1 }, (_, index) => {
    const ratio = index / samples;
    const x = ratio * WIDTH;
    const gate = 1 - smoothstep(dipX - 46, dipX + 46, x);
    const amplitude = 18 + gate * 108;
    const base =
      Math.sin(x * 0.031 + 0.4) * 0.55 +
      Math.sin(x * 0.069 + 1.2) * 0.28 +
      Math.sin(x * 0.148) * 0.1;
    const jitter = Math.sin(index * 12.9898) * 5 * gate;
    return {
      x,
      y: MID - base * amplitude - jitter,
    };
  });

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L ${WIDTH} ${MID} L 0 ${MID} Z`;

  const headIndex = Math.min(
    points.length - 1,
    Math.max(0, Math.round(draw * samples)),
  );
  const head = points[headIndex];
  const pulse = 1 + Math.sin(frame / 3.2) * 0.16;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 52%, #101a20 0%, #06080b 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.24,
          backgroundImage: `linear-gradient(${accent}33 1px, transparent 1px), linear-gradient(90deg, ${accent}33 1px, transparent 1px)`,
          backgroundSize: "90px 90px",
          transform: `translateX(${-(frame / fps) * 22}px)`,
        }}
      />

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <linearGradient id="wave-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity={0.34} />
            <stop offset="100%" stopColor={accent} stopOpacity={0} />
          </linearGradient>
          <filter id="wave-glow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <line
          x1={0}
          y1={MID}
          x2={WIDTH}
          y2={MID}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={2}
          strokeDasharray="10 12"
        />

        <path d={area} fill="url(#wave-fill)" opacity={0.7} />
        <path
          d={line}
          fill="none"
          stroke={danger ? "#FF4D4D" : accent}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#wave-glow)"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - draw}
        />

        <line
          x1={dipX}
          y1={120}
          x2={dipX}
          y2={HEIGHT - 80}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={2}
          strokeDasharray="6 10"
        />

        <circle
          cx={head.x}
          cy={head.y}
          r={13 * pulse}
          fill="#FFFFFF"
          stroke={danger ? "#FF4D4D" : accent}
          strokeWidth={5}
        />
      </svg>

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
            background: danger ? "#FF4D4D" : accent,
            boxShadow: `0 0 12px ${danger ? "#FF4D4D" : accent}`,
          }}
        />
        {scene.stageLabel || scene.wave?.label || "SINYAL"}
      </div>

      <div
        style={{
          position: "absolute",
          right: 30,
          bottom: 34,
          fontFamily: ANTON_FAMILY,
          fontSize: 54,
          letterSpacing: 2,
          color: danger ? "#FF4D4D" : "rgba(255,255,255,0.5)",
          opacity: interpolate(draw, [0.45, 0.9], [0, 0.92], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {danger ? "DROP" : ""}
      </div>

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
