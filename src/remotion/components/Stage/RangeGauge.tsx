import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';

const CX = 450;
const CY = 392;
const RADIUS = 268;
const START = 150;
const SWEEP = 240;

function polar(radius: number, angle: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function arc(radius: number, from: number, to: number) {
  const start = polar(radius, from);
  const end = polar(radius, to);
  const large = Math.abs(to - from) > 180 ? 1 : 0;
  const sweep = to >= from ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} ${sweep} ${end.x} ${end.y}`;
}

function num(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

/**
 * Animated arc gauge for a numeric range. The highlighted zone is the range
 * from the narration; the needle sweeps across it and settles at the upper
 * bound. Only numbers and a 1-2 word axis label are rendered.
 */
export const RangeGauge: React.FC<{ scene: VisualScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = scene.accentColor || "#39FF14";

  const unit = (scene.range?.unit || scene.stageLabel || "").toUpperCase();
  const min = Math.max(0, scene.range?.min ?? 0);
  const max = Math.max(min + 1, scene.range?.max ?? 12);
  const from = Math.min(max, Math.max(min, scene.range?.from ?? min));
  const to = Math.min(max, Math.max(from, scene.range?.to ?? max));
  const label = scene.stageLabel ?? unit;

  const angleFor = (value: number) =>
    START + ((value - min) / (max - min)) * SWEEP;

  const sweep = spring({
    frame,
    fps,
    durationInFrames: Math.round(
      Math.max(0.9, Math.min(1.8, (scene.duration ?? 2.4) * 0.75)) * fps,
    ),
    config: { damping: 20, mass: 0.85, stiffness: 70 },
  });
  const value = interpolate(sweep, [0, 1], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const needle = polar(226, angleFor(value));
  const glow = interpolate(sweep, [0, 1], [0.25, 1]);

  const ticks = Array.from({ length: 13 }, (_, index) => {
    const ratio = index / 12;
    const tickValue = min + ratio * (max - min);
    const angle = START + ratio * SWEEP;
    const outer = polar(RADIUS + 26, angle);
    const inner = polar(RADIUS + (index % 3 === 0 ? 4 : 12), angle);
    return { tickValue, outer, inner, major: index % 3 === 0 };
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 42%, rgba(18,26,34,0.9) 0%, #06080b 68%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.2,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 6px)",
        }}
      />

      <svg
        viewBox="0 0 900 760"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <linearGradient id="gauge-zone" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={accent} stopOpacity={1} />
          </linearGradient>
          <filter id="gauge-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path
          d={arc(RADIUS, START, START + SWEEP)}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={32}
          strokeLinecap="round"
        />
        <path
          d={arc(RADIUS, START, START + SWEEP)}
          fill="none"
          stroke={accent}
          strokeOpacity={0.12}
          strokeWidth={64}
          strokeLinecap="round"
        />

        {/* Highlighted optimal range. */}
        <path
          d={arc(RADIUS, angleFor(from), angleFor(to))}
          fill="none"
          stroke="url(#gauge-zone)"
          strokeWidth={32}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - sweep}
          filter="url(#gauge-glow)"
        />

        {ticks.map((tick, index) => (
          <line
            key={`tick-${index}`}
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            stroke={tick.major ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.22)"}
            strokeWidth={tick.major ? 4 : 2}
            strokeLinecap="round"
          />
        ))}

        <line
          x1={CX}
          y1={CY}
          x2={needle.x}
          y2={needle.y}
          stroke="#FFFFFF"
          strokeWidth={7}
          strokeLinecap="round"
          filter="url(#gauge-glow)"
          opacity={0.96}
        />
        <circle cx={CX} cy={CY} r={18} fill="#0A0D12" stroke={accent} strokeWidth={5} />
        <circle cx={needle.x} cy={needle.y} r={13} fill={accent} opacity={glow} />

        <text
          x={CX}
          y={CY + 128}
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily={ANTON_FAMILY}
          fontSize={92}
          letterSpacing={-2}
        >
          {num(from)} – {num(to)}
        </text>
        <text
          x={CX}
          y={CY + 176}
          textAnchor="middle"
          fill={accent}
          fontFamily={MONO}
          fontSize={28}
          fontWeight={700}
          letterSpacing={9}
        >
          {unit.split(" ")[0] || ""}
        </text>

        <text
          x={polar(RADIUS + 66, START).x}
          y={polar(RADIUS + 66, START).y + 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontFamily={MONO}
          fontSize={22}
        >
          {num(min)}
        </text>
        <text
          x={polar(RADIUS + 66, START + SWEEP).x}
          y={polar(RADIUS + 66, START + SWEEP).y + 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.55)"
          fontFamily={MONO}
          fontSize={22}
        >
          {num(max)}
        </text>
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
            background: accent,
            boxShadow: `0 0 12px ${accent}`,
          }}
        />
        {label}
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
