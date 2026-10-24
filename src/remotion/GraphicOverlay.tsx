import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { GraphicOverlay } from "../lib/types";
import {
  Flame,
  Activity,
  AlertTriangle,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Flame,
  Activity,
  AlertTriangle,
  Zap,
  TrendingUp,
  Cpu,
  Layers,
};

interface GraphicOverlayProps {
  overlay?: GraphicOverlay;
  themeColor: string;
}

export const GraphicOverlayComponent: React.FC<GraphicOverlayProps> = ({
  overlay,
  themeColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!overlay || overlay.type === "NONE") {
    return null;
  }

  // Smooth entrance spring
  const scale = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 120 },
  });

  const opacity = spring({
    frame,
    fps,
    config: { damping: 20 },
  });

  const IconComponent =
    (overlay.iconName && ICON_MAP[overlay.iconName]) || Activity;

  switch (overlay.type) {
    case "STAT_COUNTER": {
      return (
        <div
          style={{
            position: "absolute",
            top: 280,
            left: "50%",
            transform: `translateX(-50%) scale(${scale})`,
            opacity,
            backgroundColor: "rgba(7, 19, 36, 0.92)",
            border: `2px solid ${themeColor}`,
            boxShadow: `0 0 30px ${themeColor}60`,
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            minWidth: 320,
            zIndex: 30,
          }}
        >
          <div
            style={{
              padding: 10,
              backgroundColor: `${themeColor}20`,
              border: `1px solid ${themeColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconComponent size={32} color={themeColor} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 14,
                color: "#94A3B8",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {overlay.label || "TELEMETRY DATA"}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 38,
                fontWeight: "bold",
                color: "#F0F9FF",
                letterSpacing: 1,
              }}
            >
              {overlay.value || "00.00"}
            </div>
          </div>
        </div>
      );
    }

    case "WARNING_BANNER": {
      return (
        <div
          style={{
            position: "absolute",
            top: 260,
            left: "50%",
            transform: `translateX(-50%) scale(${scale})`,
            opacity,
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            backdropFilter: "blur(8px)",
            border: "2px solid #EF4444",
            boxShadow: "0 0 40px rgba(239, 68, 68, 0.4)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            maxWidth: 420,
            zIndex: 30,
          }}
        >
          <AlertTriangle size={28} color="#EF4444" />
          <div style={{ fontFamily: "monospace", color: "#F0F9FF" }}>
            <div style={{ fontSize: 13, color: "#EF4444", fontWeight: "bold" }}>
              CRITICAL ANOMALY
            </div>
            <div style={{ fontSize: 20, fontWeight: "bold" }}>
              {overlay.value || overlay.label}
            </div>
          </div>
        </div>
      );
    }

    case "COMPARISON_BADGE": {
      return (
        <div
          style={{
            position: "absolute",
            top: 280,
            left: "50%",
            transform: `translateX(-50%) scale(${scale})`,
            opacity,
            backgroundColor: "rgba(11, 29, 54, 0.9)",
            border: `1px solid ${themeColor}`,
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            zIndex: 30,
          }}
        >
          <TrendingUp size={24} color={themeColor} />
          <span
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: "bold",
              color: "#F0F9FF",
            }}
          >
            {overlay.label}: {overlay.value}
          </span>
        </div>
      );
    }

    case "BULLET_HIGHLIGHT":
    default: {
      return (
        <div
          style={{
            position: "absolute",
            top: 280,
            left: "50%",
            transform: `translateX(-50%) scale(${scale})`,
            opacity,
            backgroundColor: "rgba(7, 19, 36, 0.85)",
            borderLeft: `4px solid ${themeColor}`,
            padding: "12px 20px",
            maxWidth: 440,
            zIndex: 30,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 18,
              fontWeight: "bold",
              color: "#F0F9FF",
            }}
          >
            {overlay.label || overlay.value}
          </div>
        </div>
      );
    }
  }
};
