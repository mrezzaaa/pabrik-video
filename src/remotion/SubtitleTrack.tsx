import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { WordTimestamp } from "../lib/types";

interface SubtitleTrackProps {
  wordTimestamps?: WordTimestamp[];
  themeColor: string;
}

export const SubtitleTrack: React.FC<SubtitleTrackProps> = ({
  wordTimestamps = [],
  themeColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!wordTimestamps || wordTimestamps.length === 0) {
    return null;
  }

  // Current playback time in ms
  const currentMs = (frame / fps) * 1000;

  // Find the active word
  const activeWordIndex = wordTimestamps.findIndex(
    (w) => currentMs >= w.startMs && currentMs <= w.endMs
  );

  // Fallback to closest word if between frames
  const displayIndex =
    activeWordIndex !== -1
      ? activeWordIndex
      : wordTimestamps.findIndex((w) => currentMs < w.startMs);

  const safeIndex = displayIndex === -1 ? wordTimestamps.length - 1 : displayIndex;

  // Group into chunks of 3 words centered around the active word
  const chunkStart = Math.max(0, Math.floor(safeIndex / 3) * 3);
  const currentChunk = wordTimestamps.slice(chunkStart, chunkStart + 3);

  // Remotion Spring for active word scale bounce
  const activeSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 220, mass: 0.6 },
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 180,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 60,
        pointerEvents: "none",
        padding: "0 40px",
      }}
    >
      {/* High-Contrast Technical HUD Pill */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "14px",
          backgroundColor: "rgba(7, 19, 36, 0.92)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          border: `1.5px solid ${themeColor}`,
          borderRadius: 8,
          padding: "16px 28px",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.85)",
          maxWidth: "92%",
        }}
      >
        {/* 4 Corner Cyan Accent Squares */}
        <div
          style={{
            position: "absolute",
            top: -2,
            left: -2,
            width: 5,
            height: 5,
            backgroundColor: themeColor,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 5,
            height: 5,
            backgroundColor: themeColor,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -2,
            left: -2,
            width: 5,
            height: 5,
            backgroundColor: themeColor,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 5,
            height: 5,
            backgroundColor: themeColor,
          }}
        />

        {currentChunk.map((w, i) => {
          const isSpoken = currentMs >= w.startMs && currentMs <= w.endMs;

          return (
            <div
              key={`${w.word}-${chunkStart + i}`}
              style={{
                position: "relative",
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                transform: isSpoken ? `scale(${1 + activeSpring * 0.12})` : "scale(1)",
                transition: "transform 0.08s ease-out",
              }}
            >
              <span
                style={{
                  fontFamily: "Inter, 'JetBrains Mono', -apple-system, sans-serif",
                  fontSize: 48,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: isSpoken ? themeColor : "#F0F9FF",
                  opacity: isSpoken ? 1 : 0.9,
                  textShadow: isSpoken
                    ? `0 0 16px rgba(56, 189, 248, 0.75), 0 2px 6px rgba(0,0,0,0.9)`
                    : "0 2px 4px rgba(0,0,0,0.9)",
                  whiteSpace: "nowrap",
                }}
              >
                {w.word}
              </span>

              {/* Active Bottom Underline Bar */}
              {isSpoken && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -4,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: themeColor,
                    boxShadow: `0 0 8px ${themeColor}`,
                    borderRadius: 2,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
