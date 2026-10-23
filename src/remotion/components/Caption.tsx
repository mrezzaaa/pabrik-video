import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { COLORS } from "../constants";

export interface CaptionWord {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface CaptionProps {
  text: string;
  highlights?: string[];
  words?: CaptionWord[];
  durationInFrames?: number;
}

export const Caption: React.FC<CaptionProps> = ({
  text,
  highlights = [],
  words = [],
  durationInFrames = 120,
}) => {
  const frame = useCurrentFrame();

  // Normalize highlight keywords for fast, case-insensitive match
  const cleanHighlights = useMemo(() => {
    return highlights.map((h) =>
      h.toLowerCase().replace(/[^a-z0-9]/g, "")
    ).filter(Boolean);
  }, [highlights]);

  // If words are not provided or empty, split text and distribute evenly across duration
  const activeWords: CaptionWord[] = useMemo(() => {
    if (words && words.length > 0) return words;

    const rawTokens = text.trim().split(/\s+/).filter(Boolean);
    if (rawTokens.length === 0) return [];

    const framesPerWord = durationInFrames / rawTokens.length;
    return rawTokens.map((token, idx) => ({
      text: token,
      startFrame: Math.floor(idx * framesPerWord),
      endFrame: Math.floor((idx + 1) * framesPerWord),
    }));
  }, [text, words, durationInFrames]);

  if (!text) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 120,
        left: 48,
        right: 48,
        zIndex: 35,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(17, 17, 17, 0.92)",
          backdropFilter: "blur(8px)",
          border: `2px solid ${COLORS.outline}`,
          borderRadius: 24,
          padding: "16px 28px",
          boxShadow: "0 8px 30px rgba(0, 0, 0, 0.25)",
          maxWidth: 960,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 10,
        }}
      >
        {activeWords.map((item, idx) => {
          const isActive = frame >= item.startFrame && frame <= item.endFrame;
          const cleanText = item.text.toLowerCase().replace(/[^a-z0-9]/g, "");
          const isHighlightedKeyword = cleanHighlights.some(
            (hl) => cleanText.includes(hl) || hl.includes(cleanText)
          );

          // Yellow highlight ONLY when current frame is in word.startFrame-endFrame AND text is in highlights
          const showYellowHighlight = isActive && isHighlightedKeyword;

          return (
            <span
              key={`${item.text}-${idx}`}
              style={{
                fontSize: 32,
                fontWeight: showYellowHighlight || isActive ? 900 : 700,
                color: showYellowHighlight
                  ? COLORS.black
                  : isActive
                    ? COLORS.yellow
                    : "rgba(255, 255, 255, 0.9)",
                backgroundColor: showYellowHighlight
                  ? COLORS.yellow
                  : "transparent",
                padding: showYellowHighlight ? "2px 10px" : "2px 0px",
                borderRadius: showYellowHighlight ? 8 : 0,
                transition: "all 0.08s ease",
                letterSpacing: "-0.01em",
                display: "inline-block",
              }}
            >
              {item.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
