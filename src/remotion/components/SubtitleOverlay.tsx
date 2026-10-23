import React from "react";
import { useCurrentFrame } from "remotion";
import type { PhaseTimelineBlock, WordTiming } from "@/schemas/video-blueprint";

interface SubtitleOverlayProps {
  phases: PhaseTimelineBlock[];
}

/**
 * Groups segment wordTimings into short 3-word phrases so the viewer
 * sees 2-to-4 words at a time with the active spoken word highlighted in warm yellow (#FACC15).
 */
function groupIntoShortPhrases(
  words: WordTiming[],
  wordsPerPhrase = 3,
): WordTiming[][] {
  const chunks: WordTiming[][] = [];
  for (let i = 0; i < words.length; i += wordsPerPhrase) {
    chunks.push(words.slice(i, i + wordsPerPhrase));
  }
  return chunks;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ phases }) => {
  const frame = useCurrentFrame();

  const activePhase =
    phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ??
    phases[phases.length - 1];

  if (!activePhase || !activePhase.wordTimings.length) {
    return null;
  }

  const phrases = groupIntoShortPhrases(activePhase.wordTimings, 3);

  const currentPhrase =
    phrases.find((chunk) => {
      const start = chunk[0]?.startFrame ?? 0;
      const end = chunk[chunk.length - 1]?.endFrame ?? 0;
      return frame >= start && frame <= end;
    }) ??
    phrases.find((chunk) => frame < (chunk[0]?.startFrame ?? 0)) ??
    phrases[phrases.length - 1];

  if (!currentPhrase || currentPhrase.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: 135,
        left: 48,
        right: 48,
        zIndex: 30,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Dark Rounded Pill Background (bg-[#1E293B]/90 text-white px-5 py-2.5 rounded-xl) */}
      <div
        style={{
          backgroundColor: "rgba(30, 41, 59, 0.94)",
          color: "#FFFFFF",
          padding: "16px 32px",
          borderRadius: 22,
          border: "3px solid #0F172A",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.25)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          maxWidth: 920,
        }}
      >
        {currentPhrase.map((wt, idx) => {
          const isSpoken = frame >= wt.startFrame && frame <= wt.endFrame;
          return (
            <span
              key={`${wt.word}_${idx}`}
              style={{
                fontSize: 42,
                fontWeight: 800,
                lineHeight: 1.2,
                padding: isSpoken ? "4px 14px" : "4px 6px",
                borderRadius: 12,
                backgroundColor: isSpoken ? "#FACC15" : "transparent",
                color: isSpoken ? "#0F172A" : "#FFFFFF",
                transition: "all 0.08s ease",
              }}
            >
              {wt.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
