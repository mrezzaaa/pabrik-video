import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PhaseTimelineBlock } from "@/schemas/video-blueprint";

interface TelemetryHUDProps {
  phases: PhaseTimelineBlock[];
}

/**
 * Parses `chapterTitle` containing `<highlight>...</highlight>` tags
 * so key action words render in coral red (#EF4444).
 */
function renderHighlightedTitle(rawTitle: string): React.ReactNode {
  const parts = rawTitle.split(/(<highlight>[\s\S]*?<\/highlight>)/gi);
  return parts.map((part, idx) => {
    const match = part.match(/^<highlight>([\s\S]*?)<\/highlight>$/i);
    if (match) {
      return (
        <span key={idx} style={{ color: "#EF4444" }}>
          {match[1]}
        </span>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({ phases }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activePhase =
    phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ??
    phases[phases.length - 1] ??
    phases[0];

  if (!activePhase) return null;

  const localFrame = Math.max(0, frame - activePhase.startFrame);
  const phaseDuration = Math.max(1, activePhase.durationInFrames);

  const phaseProgress = interpolate(localFrame, [0, phaseDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headerEnter = spring({
    frame: localFrame,
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const { primaryMetric, statusBadge, secondaryMetric, chapterTitle } =
    activePhase;

  const prevPhaseIndex = Math.max(0, (activePhase?.segmentIndex ?? 0) - 1);
  const prevPhase = phases[prevPhaseIndex] ?? activePhase;

  // Smoothly blend primary metric across beat boundaries so numbers glide continuously
  const prevEndingValue = prevPhase.primaryMetric.endValue;
  const currentTargetValue = interpolate(
    phaseProgress,
    [0, 0.75, 1],
    [primaryMetric.startValue, primaryMetric.endValue, primaryMetric.endValue],
  );

  const blendProgress = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const easedBlend = 0.5 - 0.5 * Math.cos(blendProgress * Math.PI);
  const rawValue =
    activePhase.segmentIndex === 0
      ? currentTargetValue
      : interpolate(easedBlend, [0, 1], [prevEndingValue, currentTargetValue]);

  // Format with Indonesian comma decimal separator (e.g., 120,5 °C)
  const formattedNumber = rawValue
    .toFixed(primaryMetric.decimals ?? 1)
    .replace(".", ",");

  const isRedState =
    primaryMetric.isHighActive || statusBadge.variant === "red";
  const bigNumberColor = isRedState ? "#EF4444" : "#0F172A";

  // Status Pill styling: Green #16A34A vs Red #EF4444 vs Amber #D97706
  const pillBgColor =
    statusBadge.variant === "red"
      ? "#EF4444"
      : statusBadge.variant === "amber"
        ? "#D97706"
        : "#16A34A";

  // Mini Step Graph geometry (Center element)
  const graphWidth = 220;
  const graphHeight = 74;
  const minVal =
    Math.min(primaryMetric.baselineValue, primaryMetric.peakValue) - 5;
  const maxVal =
    Math.max(primaryMetric.baselineValue, primaryMetric.peakValue) + 5;

  const baselineY = interpolate(
    primaryMetric.baselineValue,
    [minVal, maxVal],
    [graphHeight - 16, 16],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const peakY = interpolate(
    primaryMetric.peakValue,
    [minVal, maxVal],
    [graphHeight - 16, 16],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const pts = primaryMetric.sparklinePoints;
  const polylineCoords = pts.map((v, idx) => {
    const x = 36 + (idx / Math.max(1, pts.length - 1)) * (graphWidth - 48);
    const y = interpolate(v, [minVal, maxVal], [graphHeight - 16, 16], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return { x, y };
  });

  const pathD = polylineCoords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const pathLength = 260;
  const dashOffset = interpolate(phaseProgress, [0, 0.7], [pathLength, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lastPoint = polylineCoords[polylineCoords.length - 1] ?? {
    x: graphWidth - 12,
    y: peakY,
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 56,
        right: 56,
        zIndex: 25,
        pointerEvents: "none",
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* 1. Dynamic Chapter / Hook Title (Top Left) */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          lineHeight: 1.14,
          letterSpacing: "-0.025em",
          color: "#0F172A",
          marginBottom: 26,
          transform: `translateY(${interpolate(headerEnter, [0, 1], [10, 0])}px)`,
          opacity: interpolate(headerEnter, [0, 1], [0.25, 1]),
        }}
      >
        {renderHighlightedTitle(chapterTitle)}
      </div>

      {/* 2. 3-Element Layman Metric Row (Directly Below Title) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 14,
          paddingBottom: 14,
          borderTop: "2.5px solid #1E293B",
          borderBottom: "2.5px solid #1E293B",
          backgroundColor: "rgba(255, 255, 255, 0.75)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* LEFT: Primary Big Number (e.g., 100,0 °C -> 120,5 °C) */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span
            style={{
              fontSize: 66,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: bigNumberColor,
              lineHeight: 1,
            }}
          >
            {formattedNumber}
          </span>
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: bigNumberColor,
            }}
          >
            {primaryMetric.unit}
          </span>
        </div>

        {/* CENTER: Minimalist 2-Line Threshold Step Sparkline */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width={graphWidth} height={graphHeight}>
            {/* Top Peak Threshold Line (120) */}
            <line
              x1={34}
              y1={peakY}
              x2={graphWidth - 8}
              y2={peakY}
              stroke="#CBD5E1"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <text
              x={2}
              y={peakY + 4}
              fill="#64748B"
              fontSize={13}
              fontWeight={700}
              fontFamily="monospace"
            >
              {Math.round(primaryMetric.peakValue)}
            </text>

            {/* Bottom Baseline Threshold Line (100) */}
            <line
              x1={34}
              y1={baselineY}
              x2={graphWidth - 8}
              y2={baselineY}
              stroke="#94A3B8"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            <text
              x={2}
              y={baselineY + 4}
              fill="#475569"
              fontSize={13}
              fontWeight={700}
              fontFamily="monospace"
            >
              {Math.round(primaryMetric.baselineValue)}
            </text>

            {/* Live-Drawing Black Line Tracking the Rise */}
            <path
              d={pathD}
              fill="none"
              stroke="#0F172A"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathLength}
              strokeDashoffset={dashOffset}
            />

            {/* Active Tip Dot */}
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r={5.5}
              fill={isRedState ? "#EF4444" : "#0F172A"}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          </svg>
        </div>

        {/* RIGHT: Status Pill Badge + Secondary Context Label */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <div
            style={{
              backgroundColor: pillBgColor,
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: "0.04em",
              padding: "6px 18px",
              borderRadius: 9999,
              border: "2px solid #1E293B",
              boxShadow: "0 3px 0 #1E293B",
            }}
          >
            {statusBadge.text}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#334155",
              letterSpacing: "-0.01em",
            }}
          >
            {secondaryMetric}
          </div>
        </div>
      </div>
    </div>
  );
};
