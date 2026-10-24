import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TelemetryData } from "../lib/types";

interface TopTelemetryDeckProps {
  sceneId: number;
  durationInFrames: number;
  telemetry?: TelemetryData;
  headline?: string;
  themeColor: string;
}

export const TopTelemetryDeck: React.FC<TopTelemetryDeckProps> = ({
  sceneId,
  durationInFrames,
  telemetry,
  headline,
  themeColor = "#38BDF8",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fallback defaults if LLM did not provide telemetry for a scene
  const objectName = telemetry?.objectName || headline || `KOMPONEN // SEC_${sceneId}`;
  const categoryTag = telemetry?.categoryTag || `SUBSYS: CAD_CORE_${sceneId}`;
  const label = telemetry?.label || "PARAMETER TERUKUR";
  const startValue = telemetry?.startValue ?? 0;
  const endValue = telemetry?.endValue ?? 100;
  const unit = telemetry?.unit || "";
  const trendLabel = telemetry?.trendLabel || "● NOMINAL";
  const chartType = telemetry?.chartType || "LINE_SPIKE";
  const rawDataPoints = telemetry?.dataPoints && telemetry.dataPoints.length >= 6
    ? telemetry.dataPoints.slice(0, 6)
    : [15, 30, 48, 62, 80, 100];

  // Smooth live numerical interpolation
  const interpolatedValue = interpolate(
    frame,
    [0, Math.max(1, durationInFrames * 0.75)],
    [startValue, endValue],
    { extrapolateRight: "clamp" }
  );

  const formattedValue =
    Number.isInteger(startValue) && Number.isInteger(endValue)
      ? Math.round(interpolatedValue).toLocaleString()
      : interpolatedValue.toFixed(1);

  // Entrance spring animation for the deck
  const deckSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 140, mass: 0.7 },
  });

  // Calculate SVG line points for LINE_SPIKE
  // ViewBox: 300 x 100
  const svgWidth = 280;
  const svgHeight = 75;
  const paddingX = 10;
  const stepX = (svgWidth - paddingX * 2) / (rawDataPoints.length - 1);

  const points = rawDataPoints.map((val, idx) => {
    const x = paddingX + idx * stepX;
    // val is 0-100, invert Y so 100 is at top
    const y = svgHeight - (Math.max(5, Math.min(95, val)) / 100) * (svgHeight - 15) - 5;
    return { x, y };
  });

  const linePathD = points.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  const areaPathD = `${linePathD} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`;

  // Progressive line animation
  const totalLength = 350;
  const strokeOffset = interpolate(
    frame,
    [0, Math.max(1, durationInFrames * 0.7)],
    [totalLength, 0],
    { extrapolateRight: "clamp" }
  );

  // Current riding dot position
  const progressRatio = Math.min(1, frame / Math.max(1, durationInFrames * 0.7));
  const activePointIdx = Math.min(
    points.length - 1,
    Math.floor(progressRatio * (points.length - 1))
  );
  const nextPointIdx = Math.min(points.length - 1, activePointIdx + 1);
  const segmentRatio =
    (progressRatio * (points.length - 1)) - activePointIdx;

  const currentX =
    points[activePointIdx].x +
    (points[nextPointIdx].x - points[activePointIdx].x) * segmentRatio;
  const currentY =
    points[activePointIdx].y +
    (points[nextPointIdx].y - points[activePointIdx].y) * segmentRatio;

  return (
    <>
      {/* 1. Contrast Protection Header Scrim */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 340,
          background:
            "linear-gradient(180deg, rgba(7,19,36,0.92) 0%, rgba(7,19,36,0.7) 60%, rgba(7,19,36,0) 100%)",
          zIndex: 40,
          pointerEvents: "none",
        }}
      />

      {/* 2. Top Telemetry Deck Main Container */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 40,
          right: 40,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          transform: `translateY(${(1 - deckSpring) * -30}px)`,
          opacity: deckSpring,
          fontFamily: "Inter, 'JetBrains Mono', -apple-system, sans-serif",
        }}
      >
        {/* Top Row: Scene Context & Technical Specs */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left badge: [SEC_0X] // OBJECT */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "rgba(7, 19, 36, 0.92)",
              border: `1.5px solid ${themeColor}`,
              borderRadius: 4,
              padding: "6px 14px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
            }}
          >
            <span
              style={{
                color: themeColor,
                fontWeight: 900,
                fontSize: 16,
                letterSpacing: "0.08em",
              }}
            >
              [SEC_0{sceneId}]
            </span>
            <span
              style={{
                color: "#94A3B8",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              //
            </span>
            <span
              style={{
                color: "#F0F9FF",
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {objectName}
            </span>
          </div>

          {/* Right badge: Subsystem Tag + Live Frame Counter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(7, 19, 36, 0.88)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 4,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 700,
              color: "#94A3B8",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            <span style={{ color: themeColor }}>{categoryTag}</span>
            <span>|</span>
            <span style={{ color: "#F0F9FF" }}>
              FRM: {String(frame).padStart(4, "0")}
            </span>
          </div>
        </div>

        {/* Main Telemetry Card (Dynamic Animated Chart + Live Ticker) */}
        <div
          style={{
            position: "relative",
            marginTop: 12,
            width: "100%",
            height: 150,
            backgroundColor: "rgba(7, 19, 36, 0.92)",
            border: "1px solid rgba(56, 189, 248, 0.45)",
            borderRadius: 6,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)",
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* Subtle Blueprint grid watermark inside card */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(to right, rgba(56, 189, 248, 0.05) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
              pointerEvents: "none",
            }}
          />

          {/* Left Column (45% width): Live Metric Counter */}
          <div
            style={{
              width: "45%",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRight: "1px solid rgba(56, 189, 248, 0.25)",
              zIndex: 2,
            }}
          >
            {/* Metric Label */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#94A3B8",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {label}
            </div>

            {/* Numerical Ticker */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 6,
                fontFamily: "Inter, sans-serif",
                fontWeight: 900,
                fontSize: 44,
                color: "#F0F9FF",
                lineHeight: 1,
                letterSpacing: "-0.02em",
                textShadow: `0 0 16px ${themeColor}60`,
              }}
            >
              <span>{formattedValue}</span>
              {unit && (
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: themeColor,
                    textTransform: "lowercase",
                  }}
                >
                  {unit}
                </span>
              )}
            </div>

            {/* Status / Trend Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: themeColor,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: themeColor,
                  boxShadow: `0 0 8px ${themeColor}`,
                }}
              />
              <span>{trendLabel}</span>
            </div>
          </div>

          {/* Right Column (55% width): Animated Kitabedah-Style SVG Chart */}
          <div
            style={{
              width: "55%",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 2,
              position: "relative",
            }}
          >
            {/* MODE 1: LINE_SPIKE */}
            {chartType === "LINE_SPIKE" && (
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{ width: "100%", height: "100%", overflow: "visible" }}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={themeColor} stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line
                  x1="10"
                  y1={svgHeight / 2}
                  x2={svgWidth - 10}
                  y2={svgHeight / 2}
                  stroke="rgba(56, 189, 248, 0.15)"
                  strokeDasharray="4 4"
                />

                {/* Area under curve */}
                <path d={areaPathD} fill="url(#areaGradient)" />

                {/* Animated Line Stroke */}
                <path
                  d={linePathD}
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={totalLength}
                  strokeDashoffset={strokeOffset}
                  style={{ filter: `drop-shadow(0 0 6px ${themeColor})` }}
                />

                {/* Pulsing leading indicator circle */}
                {progressRatio > 0.05 && (
                  <>
                    <circle
                      cx={currentX}
                      cy={currentY}
                      r="7"
                      fill={themeColor}
                      opacity="0.3"
                      style={{
                        transformOrigin: `${currentX}px ${currentY}px`,
                        transform: `scale(${1 + Math.sin(frame * 0.2) * 0.3})`,
                      }}
                    />
                    <circle
                      cx={currentX}
                      cy={currentY}
                      r="4"
                      fill="#FFFFFF"
                      stroke={themeColor}
                      strokeWidth="2"
                    />
                  </>
                )}
              </svg>
            )}

            {/* MODE 2: BAR_SURGE */}
            {chartType === "BAR_SURGE" && (
              <div
                style={{
                  width: "100%",
                  height: 80,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "0 10px",
                }}
              >
                {rawDataPoints.map((val, idx) => {
                  const barSpring = spring({
                    frame: frame - idx * 3,
                    fps,
                    config: { damping: 12, stiffness: 160 },
                  });

                  const barHeight = Math.max(
                    12,
                    (val / 100) * 75 * Math.max(0, barSpring)
                  );
                  const isLast = idx === rawDataPoints.length - 1;

                  return (
                    <div
                      key={`bar-${idx}`}
                      style={{
                        flex: 1,
                        height: barHeight,
                        backgroundColor: isLast
                          ? themeColor
                          : "rgba(56, 189, 248, 0.4)",
                        borderRadius: "2px 2px 0 0",
                        boxShadow: isLast ? `0 0 12px ${themeColor}` : "none",
                        transition: "height 0.05s ease-out",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: -16,
                          left: "50%",
                          transform: "translateX(-50%)",
                          fontSize: 10,
                          fontWeight: 700,
                          color: isLast ? "#F0F9FF" : "#94A3B8",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {val}%
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MODE 3: GAUGE_METER */}
            {chartType === "GAUGE_METER" && (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  padding: "0 10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#94A3B8",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <span>METER_CAPACITY</span>
                  <span style={{ color: themeColor }}>
                    {Math.round(progressRatio * 100)}%
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    height: 24,
                    width: "100%",
                  }}
                >
                  {Array.from({ length: 20 }).map((_, idx) => {
                    const threshold = idx / 20;
                    const isActive = progressRatio >= threshold;
                    return (
                      <div
                        key={`seg-${idx}`}
                        style={{
                          flex: 1,
                          height: "100%",
                          backgroundColor: isActive
                            ? themeColor
                            : "rgba(56, 189, 248, 0.15)",
                          borderRadius: 1,
                          boxShadow:
                            isActive && idx === Math.floor(progressRatio * 20)
                              ? `0 0 8px ${themeColor}`
                              : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
