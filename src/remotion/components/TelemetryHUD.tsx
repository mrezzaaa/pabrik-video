import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type {
  PhaseTimelineBlock,
  TelemetryChannel,
} from "@/schemas/video-blueprint";

interface TelemetryHUDProps {
  normalizedTitle: string;
  engineeringCategory: string;
  channels: TelemetryChannel[];
  phases: PhaseTimelineBlock[];
  totalDurationInFrames: number;
}

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  OPTIMAL: { bg: "rgba(16, 185, 129, 0.16)", text: "#34D399", dot: "#10B981" },
  NOMINAL: { bg: "rgba(56, 189, 248, 0.16)", text: "#38BDF8", dot: "#0EA5E9" },
  WARNING: { bg: "rgba(245, 158, 11, 0.18)", text: "#FBBF24", dot: "#F59E0B" },
  CRITICAL: { bg: "rgba(244, 63, 94, 0.2)", text: "#FB7185", dot: "#F43F5E" },
};

export const TelemetryHUD: React.FC<TelemetryHUDProps> = ({
  normalizedTitle,
  engineeringCategory,
  channels,
  phases,
  totalDurationInFrames,
}) => {
  const frame = useCurrentFrame();

  const activePhase =
    phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ??
    phases[phases.length - 1] ??
    phases[0];

  const phaseProgress = activePhase
    ? interpolate(
        frame,
        [activePhase.startFrame, activePhase.endFrame],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  const overallProgress = interpolate(
    frame,
    [0, Math.max(1, totalDurationInFrames)],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: 36,
        right: 36,
        zIndex: 20,
        pointerEvents: "none",
        fontFamily: "monospace",
      }}
    >
      {/* Top Bar: Aerospace / Kitabedah.id Header & Phase Stepper */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(9, 13, 22, 0.86)",
          border: "1px solid rgba(56, 189, 248, 0.28)",
          borderRadius: 10,
          padding: "10px 20px",
          marginBottom: 12,
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#10B981",
              boxShadow: "0 0 12px #10B981",
            }}
          />
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#38BDF8",
                letterSpacing: "0.16em",
                fontWeight: 700,
              }}
            >
              KITABEDAH TELEMETRY HUD // {engineeringCategory}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#F8FAFC",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {normalizedTitle}
            </div>
          </div>
        </div>

        {/* 5-Phase Pipeline Progress Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {phases.map((p) => {
            const isCurrent = p.segmentIndex === activePhase?.segmentIndex;
            const isDone = frame >= p.endFrame;
            return (
              <div
                key={p.segmentIndex}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: isCurrent
                    ? "1px solid #38BDF8"
                    : "1px solid rgba(148, 163, 184, 0.2)",
                  background: isCurrent
                    ? "rgba(56, 189, 248, 0.16)"
                    : isDone
                      ? "rgba(16, 185, 129, 0.1)"
                      : "rgba(15, 23, 42, 0.6)",
                  color: isCurrent ? "#38BDF8" : isDone ? "#34D399" : "#64748B",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                0{p.segmentIndex + 1}.{p.phaseType}
              </div>
            );
          })}
        </div>

        {/* Frame & Timecode Readout */}
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>
            SYNC TIMECODE (60 FPS)
          </div>
          <div style={{ fontSize: 15, color: "#22D3EE", fontWeight: 700 }}>
            FRM {String(frame).padStart(4, "0")} // {(frame / 60).toFixed(2)}s (
            {overallProgress.toFixed(0)}%)
          </div>
        </div>
      </div>

      {/* Live-Ticking Telemetry Metric Cards with Mini Sparkline Graphs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${channels.length}, minmax(0, 1fr))`,
          gap: 14,
        }}
      >
        {channels.map((channel) => {
          const datapoint = activePhase?.telemetrySnapshot.find(
            (d) => d.channelId === channel.id
          );

          const startVal = datapoint?.startValue ?? channel.minVal;
          const endVal = datapoint?.endValue ?? channel.maxVal;

          // Smoothly interpolate live value with micro high-frequency sensor jitter
          const baseVal = interpolate(phaseProgress, [0, 1], [startVal, endVal]);
          const sensorJitter =
            Math.sin(frame * 0.45 + channel.label.length) *
            ((channel.maxVal - channel.minVal) * 0.0025);
          const liveValue = baseVal + sensorJitter;

          const statusKey = datapoint?.status ?? "NOMINAL";
          const badge = STATUS_BADGE_COLORS[statusKey] ?? STATUS_BADGE_COLORS.NOMINAL;

          const fillRatio = interpolate(
            liveValue,
            [channel.minVal, channel.maxVal],
            [0.05, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          // Build SVG sparkline polyline points
          const history = datapoint?.sparklineHistory ?? [
            startVal,
            (startVal + endVal) * 0.5,
            endVal,
            liveValue,
          ];
          const sparkWidth = 140;
          const sparkHeight = 32;
          const sparkPoints = history
            .map((val, idx) => {
              const x = (idx / Math.max(1, history.length - 1)) * sparkWidth;
              const normY = interpolate(
                val,
                [channel.minVal, channel.maxVal],
                [sparkHeight - 4, 4],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
              );
              return `${x.toFixed(1)},${normY.toFixed(1)}`;
            })
            .join(" ");

          return (
            <div
              key={channel.id}
              style={{
                background: "rgba(9, 13, 22, 0.84)",
                border: "1px solid rgba(30, 41, 59, 0.95)",
                borderTop: `2px solid ${channel.colorHex}`,
                borderRadius: 10,
                padding: "12px 16px",
                backdropFilter: "blur(12px)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                  }}
                >
                  {channel.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 4,
                    backgroundColor: badge.bg,
                    color: badge.text,
                    fontWeight: 700,
                  }}
                >
                  {statusKey}
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: "#F8FAFC",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {liveValue.toFixed(channel.decimals)}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: channel.colorHex,
                      marginLeft: 6,
                      fontWeight: 700,
                    }}
                  >
                    {channel.unit}
                  </span>
                </div>

                {/* Mini Sparkline Graph */}
                <svg width={sparkWidth} height={sparkHeight}>
                  <polyline
                    fill="none"
                    stroke={channel.colorHex}
                    strokeWidth={2}
                    points={sparkPoints}
                  />
                </svg>
              </div>

              {/* Telemetry Range Bar */}
              <div
                style={{
                  width: "100%",
                  height: 4,
                  backgroundColor: "rgba(30, 41, 59, 0.9)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(fillRatio * 100).toFixed(1)}%`,
                    backgroundColor: channel.colorHex,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
