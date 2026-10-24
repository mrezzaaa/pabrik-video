import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
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

  return (
    <div
      style={{
        position: "absolute",
        bottom: 280,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 50,
        pointerEvents: "none",
        padding: "0 40px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "14px",
          backgroundColor: "rgba(7, 19, 36, 0.75)",
          backdropFilter: "blur(6px)",
          padding: "12px 24px",
          border: "1px solid rgba(56, 189, 248, 0.3)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
        }}
      >
        {currentChunk.map((w, i) => {
          const isSpoken =
            currentMs >= w.startMs && currentMs <= w.endMs;

          return (
            <span
              key={`${w.word}-${i}`}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 44,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: isSpoken ? themeColor : "#F0F9FF",
                transform: isSpoken ? "scale(1.18)" : "scale(1)",
                transition: "transform 0.08s ease-out, color 0.08s ease-out",
                WebkitTextStroke: "2.5px #000",
                textShadow: isSpoken
                  ? `0 0 20px ${themeColor}, 0 4px 10px rgba(0,0,0,0.9)`
                  : "0 4px 10px rgba(0,0,0,0.9)",
                display: "inline-block",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
