import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { PhaseTimelineBlock, WordTiming } from "@/schemas/video-blueprint";

interface SubtitleOverlayProps {
  phases: PhaseTimelineBlock[];
}

export interface SubtitleChunk {
  words: WordTiming[];
  displayStartFrame: number;
  displayEndFrame: number;
}

const INDONESIAN_CONJUNCTIONS = new Set([
  "dan",
  "tapi",
  "tetapi",
  "karena",
  "sehingga",
  "nah",
  "namun",
  "agar",
  "untuk",
  "saat",
  "ketika",
  "maka",
  "bahkan",
  "jadi",
  "atau",
  "kalau",
  "jika",
  "supaya",
  "padahal",
]);

/**
 * Natural phrase-based chunker for Indonesian explainer subtitles.
 * - Targets 4 to 7 words per chunk.
 * - Respects sentence terminals (. ? !), clause commas (,), and spoken conjunctions.
 * - Never leaves stranded 1-word or 2-word chunks.
 * - Guarantees minimum 0.8s (48 frames at 60fps) display duration per chunk.
 */
export function chunkIntoNaturalPhrases(
  words: WordTiming[],
  fps = 60,
  minDisplaySec = 0.8,
  phaseEndFrame = 0
): SubtitleChunk[] {
  if (!words.length) return [];

  const rawGroups: WordTiming[][] = [];
  let currentGroup: WordTiming[] = [];

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentGroup.push(w);

    const isTerminalPunct = /[.!?]$/.test(w.word);
    const isClausePunct = /[,;:\-—]$/.test(w.word);
    const wordsRemaining = words.length - (i + 1);

    const nextWord = words[i + 1];
    const nextIsConjunction =
      nextWord &&
      INDONESIAN_CONJUNCTIONS.has(
        nextWord.word.toLowerCase().replace(/[^a-z]/g, "")
      );

    const reachedIdealLength = currentGroup.length >= 4;
    const reachedMaxLength = currentGroup.length >= 7;

    let shouldBreak = false;

    if (isTerminalPunct) {
      // Always break on full stop / question mark / exclamation mark
      shouldBreak = true;
    } else if (reachedMaxLength) {
      // Must break if reached 7 words, unless next has only 1-2 words remaining
      if (wordsRemaining > 2 || wordsRemaining === 0) {
        shouldBreak = true;
      }
    } else if (reachedIdealLength) {
      if (isClausePunct && wordsRemaining >= 3) {
        // Break on comma/semicolon if at least 3 words remain
        shouldBreak = true;
      } else if (nextIsConjunction && wordsRemaining >= 4) {
        // Break before a natural conjunction if enough words remain
        shouldBreak = true;
      }
    }

    if (shouldBreak || i === words.length - 1) {
      // If remaining words are only 1 or 2, absorb them into current group instead of leaving them stranded
      if (wordsRemaining > 0 && wordsRemaining <= 2 && !isTerminalPunct) {
        continue;
      }
      rawGroups.push(currentGroup);
      currentGroup = [];
    }
  }

  if (currentGroup.length > 0) {
    if (rawGroups.length > 0 && currentGroup.length < 3) {
      rawGroups[rawGroups.length - 1].push(...currentGroup);
    } else {
      rawGroups.push(currentGroup);
    }
  }

  // Calculate display timing for each chunk (min 0.8s display window)
  const minFrames = Math.round(minDisplaySec * fps);
  const chunks: SubtitleChunk[] = [];

  for (let idx = 0; idx < rawGroups.length; idx++) {
    const group = rawGroups[idx];
    const rawStart = group[0].startFrame;
    const rawEnd = group[group.length - 1].endFrame;

    const nextGroup = rawGroups[idx + 1];
    const boundaryLimit = nextGroup ? nextGroup[0].startFrame : Math.max(rawEnd + 15, phaseEndFrame);

    const displayStartFrame = rawStart;
    // Display chunk until at least minFrames or until next chunk starts
    const displayEndFrame = Math.max(
      rawEnd,
      Math.min(boundaryLimit, displayStartFrame + minFrames)
    );

    chunks.push({
      words: group,
      displayStartFrame,
      displayEndFrame,
    });
  }

  return chunks;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({ phases }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activePhase =
    phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ??
    phases[phases.length - 1];

  if (!activePhase || !activePhase.wordTimings.length) {
    return null;
  }

  const chunks = chunkIntoNaturalPhrases(
    activePhase.wordTimings,
    fps,
    0.8,
    activePhase.endFrame
  );

  const currentChunk =
    chunks.find(
      (c) => frame >= c.displayStartFrame && frame <= c.displayEndFrame
    ) ??
    chunks.find((c) => frame < c.displayStartFrame) ??
    chunks[chunks.length - 1];

  if (!currentChunk || currentChunk.words.length === 0) {
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
      {/* Dark Rounded Pill Background */}
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
        {currentChunk.words.map((wt, idx) => {
          // Highlight active spoken word strictly by its own timestamp
          const isSpoken = frame >= wt.startFrame && frame <= wt.endFrame;
          return (
            <span
              key={`${wt.word}_${idx}_${wt.startFrame}`}
              style={{
                fontSize: 42,
                fontWeight: 800,
                lineHeight: 1.25,
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
