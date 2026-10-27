import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { groupCaptionPages } from "../../lib/alignment";
import type { WordTimestamp } from "../../lib/types";
import { ANTON_FAMILY } from "../fonts";

/**
 * The only transcript renderer in the whole video.
 * Karaoke captions in the FB Reels safe zone (bottom: 220px), max three words
 * per page, current word yellow at 1.2x with a 4px black stroke. No emojis.
 */
export const Caption: React.FC<{
  words: WordTimestamp[];
  accentColor?: string;
}> = ({ words, accentColor = "#39FF14" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const pages = useMemo(() => groupCaptionPages(words, 3), [words]);

  let activePageIndex = -1;
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const start = page.words[0].start;
    const end = page.words[page.words.length - 1].end;
    if (time >= start - 0.12 && time <= end + 0.24) {
      activePageIndex = index;
      break;
    }
  }
  if (activePageIndex === -1) return null;

  const page = pages[activePageIndex];
  const pageStart = page.words[0].start;
  const pageEnd = page.words[page.words.length - 1].end;
  const enter = spring({
    frame: frame - pageStart * fps,
    fps,
    config: { damping: 15, mass: 0.5, stiffness: 300 },
  });
  const exit = interpolate(time, [pageEnd + 0.05, pageEnd + 0.24], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  let currentWordIndex = -1;
  page.words.forEach((word, index) => {
    if (time >= word.start - 0.015) currentWordIndex = index;
  });

  const charCount = page.text.length;
  const fontSize =
    charCount > 24 ? 54 : charCount > 19 ? 62 : charCount > 15 ? 72 : 88;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 220,
        pointerEvents: "none",
        zIndex: 30,
      }}
    >
      <div
        style={{
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 54}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
          padding: "18px 34px 22px",
          backgroundColor: "rgba(0,0,0,0.78)",
          border: "3px solid rgba(255,255,255,0.14)",
          borderLeft: `8px solid ${accentColor}`,
          borderRadius: 22,
          boxShadow: `0 20px 54px rgba(0,0,0,0.68), 0 0 36px ${accentColor}22`,
          backdropFilter: "blur(4px)",
          maxWidth: 1000,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 38,
          }}
        >
          {page.words.map((word, index) => {
            const isCurrent = index === currentWordIndex;
            const isPast = index < currentWordIndex;
            const pop = isCurrent
              ? interpolate(
                  spring({
                    frame: frame - word.start * fps,
                    fps,
                    config: { damping: 15, mass: 0.35, stiffness: 300 },
                  }),
                  [0, 1],
                  [1, 1.2],
                )
              : 1;

            return (
              <span
                key={`${word.word}-${index}`}
                style={{
                  fontFamily: ANTON_FAMILY,
                  fontSize,
                  lineHeight: 1,
                  letterSpacing: -1,
                  whiteSpace: "nowrap",
                  color: isCurrent
                    ? "#FFFF00"
                    : isPast
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.78)",
                  WebkitTextStroke: "4px #000",
                  paintOrder: "stroke fill",
                  textShadow: isCurrent
                    ? "0 0 28px rgba(255,255,0,0.75), 5px 5px 0 rgba(0,0,0,0.9)"
                    : "4px 4px 0 rgba(0,0,0,0.8)",
                  transform: `scale(${pop}) translateY(${isCurrent ? -4 : 0}px)`,
                  transformOrigin: "center center",
                  display: "inline-block",
                }}
              >
                {word.word}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
