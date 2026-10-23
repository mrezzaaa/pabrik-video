import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, VIDEO_WIDTH, VIDEO_HEIGHT } from "../constants";
import type { PopupLabelItem } from "@/schemas/video-blueprint";

export interface PopupLabelProps {
  labels: PopupLabelItem[];
}

export const PopupLabel: React.FC<PopupLabelProps> = ({ labels }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!labels || labels.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 25,
        pointerEvents: "none",
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {labels.map((item, index) => {
        const localFrame = frame - index * 12;
        if (localFrame < 0) return null;

        const popSpring = spring({
          frame: localFrame,
          fps,
          config: { damping: 14, stiffness: 150 },
        });

        // Convert normalized coordinates (0.1 - 0.9) to pixels if <= 1.0
        const posX = item.x <= 1.0 ? item.x * VIDEO_WIDTH : item.x;
        const posY = item.y <= 1.0 ? item.y * VIDEO_HEIGHT : item.y;

        // Clamp inside visible bounds
        const clampedX = Math.max(120, Math.min(VIDEO_WIDTH - 120, posX));
        const clampedY = Math.max(220, Math.min(VIDEO_HEIGHT - 320, posY));

        return (
          <div
            key={`${item.text}-${index}`}
            style={{
              position: "absolute",
              left: clampedX,
              top: clampedY,
              transform: `translate(-50%, -50%) scale(${popSpring})`,
              transformOrigin: "center center",
              opacity: popSpring,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {/* Pointer Dot */}
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: COLORS.yellow,
                border: `2px solid ${COLORS.black}`,
                boxShadow: "0 0 8px rgba(0,0,0,0.2)",
              }}
            />

            {/* Dark Pill Badge with dynamic label text */}
            <div
              style={{
                backgroundColor: COLORS.black,
                color: COLORS.white,
                padding: "10px 22px",
                borderRadius: 9999,
                fontSize: 24,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                border: "2px solid rgba(255, 255, 255, 0.4)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
              }}
            >
              {item.text}
            </div>
          </div>
        );
      })}
    </div>
  );
};
