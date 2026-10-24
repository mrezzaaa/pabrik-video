import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { TransitionType } from "../lib/types";

interface TransitionOverlayProps {
  type: TransitionType;
  triggerFrame: number;
  durationFrames?: number;
}

export const TransitionOverlay: React.FC<TransitionOverlayProps> = ({
  type,
  triggerFrame,
  durationFrames = 4,
}) => {
  const frame = useCurrentFrame();

  const relFrame = frame - triggerFrame;
  if (relFrame < 0 || relFrame > durationFrames) {
    return null;
  }

  switch (type) {
    case "FLASH_CUT": {
      const opacity = interpolate(
        relFrame,
        [0, 1, durationFrames],
        [0, 0.95, 0]
      );
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "#FFFFFF",
            opacity,
            zIndex: 40,
            pointerEvents: "none",
          }}
        />
      );
    }

    case "WHIP_PAN": {
      const translateX = interpolate(
        relFrame,
        [0, durationFrames],
        [-100, 100]
      );
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.6), transparent)",
            transform: `translateX(${translateX}%)`,
            zIndex: 40,
            pointerEvents: "none",
          }}
        />
      );
    }

    case "GLITCH_CUT": {
      const offset = (relFrame % 2 === 0 ? 1 : -1) * 15;
      return (
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: `inset ${offset}px 0 0 rgba(239, 68, 68, 0.5), inset ${-offset}px 0 0 rgba(56, 189, 248, 0.5)`,
            mixBlendMode: "screen",
            zIndex: 40,
            pointerEvents: "none",
          }}
        />
      );
    }

    case "HARD_CUT":
    default:
      return null;
  }
};
