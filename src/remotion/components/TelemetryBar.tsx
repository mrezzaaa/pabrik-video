import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS } from "../constants";
import type { TelemetryChannel, TelemetryBadge } from "@/schemas/video-blueprint";

export interface TelemetryBarProps {
  channels: TelemetryChannel[];
  badge: TelemetryBadge;
  durationInFrames: number;
  title?: string;
}

function resolveBadgeColor(colorKey?: string): string {
  if (!colorKey) return COLORS.green;
  const lower = colorKey.toLowerCase().trim();
  if (lower === "green" || lower === "hijau") return COLORS.green;
  if (lower === "red" || lower === "merah") return COLORS.red;
  if (lower === "orange" || lower === "oranye" || lower === "amber") return COLORS.orange;
  if (lower === "yellow" || lower === "kuning") return COLORS.yellow;
  if (lower === "black" || lower === "hitam") return COLORS.black;
  if (lower.startsWith("#") || lower.startsWith("rgb")) return colorKey;
  return COLORS.green;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  channels,
  badge,
  durationInFrames,
  title,
}) => {
  const frame = useCurrentFrame();
  const duration = Math.max(1, durationInFrames);
  const badgeBg = resolveBadgeColor(badge?.color);
  const badgeTextColor = badge?.color === "yellow" ? COLORS.black : COLORS.white;

  // Fallback safe channels if empty
  const safeChannels = channels && channels.length > 0 ? channels : [
    { label: "STATUS", unit: "%", start: 0, end: 100 }
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 48,
        right: 48,
        zIndex: 30,
        pointerEvents: "none",
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Dynamic Title if present */}
      {title && (
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.025em",
            color: COLORS.black,
            marginBottom: 20,
            textShadow: "0 1px 2px rgba(255,255,255,0.8)",
          }}
        >
          {title}
        </div>
      )}

      {/* Dynamic Telemetry Box */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          backgroundColor: "rgba(255, 255, 255, 0.94)",
          backdropFilter: "blur(10px)",
          border: `2.5px solid ${COLORS.outline}`,
          borderRadius: 20,
          boxShadow: `0 4px 0 ${COLORS.outline}`,
          gap: 16,
        }}
      >
        {/* Dynamic Metric Channels */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            gap: 24,
            overflow: "hidden",
          }}
        >
          {safeChannels.map((ch, idx) => {
            const val = interpolate(frame, [0, duration], [ch.start, ch.end], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const formattedVal = val.toFixed(1);

            return (
              <div
                key={ch.key || `${ch.label}-${idx}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minWidth: 0,
                  borderRight:
                    idx < safeChannels.length - 1
                      ? "1.5px solid #E2E8F0"
                      : "none",
                  paddingRight: idx < safeChannels.length - 1 ? 20 : 0,
                }}
              >
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: COLORS.textMuted,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ch.label}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span
                    style={{
                      fontSize: safeChannels.length > 2 ? 38 : 46,
                      fontWeight: 900,
                      color: COLORS.black,
                      letterSpacing: "-0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {formattedVal}
                  </span>
                  <span
                    style={{
                      fontSize: safeChannels.length > 2 ? 20 : 26,
                      fontWeight: 800,
                      color: COLORS.textDark,
                    }}
                  >
                    {ch.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Status Badge */}
        {badge?.text && (
          <div
            style={{
              backgroundColor: badgeBg,
              color: badgeTextColor,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: "0.03em",
              padding: "8px 18px",
              borderRadius: 9999,
              border: `2px solid ${COLORS.outline}`,
              boxShadow: `0 3px 0 ${COLORS.outline}`,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {badge.text}
          </div>
        )}
      </div>
    </div>
  );
};
