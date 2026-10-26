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

const EMPHASIS_EMOJI = ["😱", "🔥", "🤯", "👀", "💥", "⚠️", "🧠", "💀"];

function emojiFor(word: string) {
  const hash = Array.from(word).reduce(
    (sum, character) => sum + character.codePointAt(0)!,
    0,
  );
  return EMPHASIS_EMOJI[hash % EMPHASIS_EMOJI.length];
}

/**
 * Karaoke captions in the FB Reels safe zone (bottom: 220px).
 * Word pop uses a stiff spring; the emphasis emoji flies up with rotation
 * instead of sitting statically on the pill.
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
  const fontSize = charCount > 17 ? 68 : charCount > 13 ? 78 : 92;
  const currentWord = page.words[currentWordIndex]?.word ?? "";
  const emphasis =
    currentWordIndex >= 0 && Boolean(page.words[currentWordIndex]?.emphasis);

  const emojiSpring = spring({
    frame: frame - (page.words[currentWordIndex]?.start ?? pageStart) * fps,
    fps,
    config: { damping: 9, mass: 0.4, stiffness: 260 },
  });
  const emojiY = interpolate(emojiSpring, [0, 1], [54, 0]);
  const emojiRotate = interpolate(emojiSpring, [0, 1], [-32, 12]);

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
          position: "relative",
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * 54}px) scale(${interpolate(enter, [0, 1], [0.88, 1])})`,
        }}
      >
        {emphasis || currentWordIndex >= 0 ? (
          <div
            style={{
              position: "absolute",
              right: -30,
              top: -108,
              fontSize: 84,
              transform: `translateY(${emojiY}px) rotate(${emojiRotate}deg) scale(${interpolate(emojiSpring, [0, 1], [0.4, 1])})`,
              filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.8))",
              opacity: interpolate(emojiSpring, [0, 1], [0, 1]),
              zIndex: 2,
            }}
          >
            {emojiFor(currentWord || page.text)}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            padding: "20px 32px 24px",
            backgroundColor: "rgba(0,0,0,0.74)",
            border: "3px solid rgba(255,255,255,0.14)",
            borderLeft: `8px solid ${accentColor}`,
            borderRadius: 22,
            boxShadow: `0 20px 54px rgba(0,0,0,0.68), 0 0 36px ${accentColor}22`,
            backdropFilter: "blur(4px)",
            maxWidth: 980,
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
