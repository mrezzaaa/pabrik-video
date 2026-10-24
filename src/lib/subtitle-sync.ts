import { WordTimestamp } from "./types";

export interface SubtitleChunk {
  chunkIndex: number;
  words: WordTimestamp[];
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * Computes word-level timestamps weighted by character length and punctuation pauses.
 * Matches exact audio duration in milliseconds extracted via ffprobe.
 */
export function computeWordTimestamps(
  narration: string,
  totalDurationMs: number
): WordTimestamp[] {
  // Normalize whitespace and split into words
  const rawWords = narration
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (rawWords.length === 0) {
    return [];
  }

  // Weight words based on character length and punctuation pauses
  const weights: number[] = rawWords.map((word) => {
    let weight = Math.max(1, word.length);
    if (word.endsWith(",") || word.endsWith(";")) {
      weight += 3.5; // Short breathing pause
    } else if (
      word.endsWith(".") ||
      word.endsWith("!") ||
      word.endsWith("?")
    ) {
      weight += 6.0; // Terminal pause
    }
    return weight;
  });

  const totalWeight = weights.reduce((acc, w) => acc + w, 0);
  const msPerWeight = totalDurationMs / totalWeight;

  const timestamps: WordTimestamp[] = [];
  let currentMs = 0;

  for (let i = 0; i < rawWords.length; i++) {
    const wordDuration = weights[i] * msPerWeight;
    const startMs = Math.round(currentMs);
    const endMs = Math.round(
      i === rawWords.length - 1 ? totalDurationMs : currentMs + wordDuration
    );

    // Clean word for display while keeping original punctuation
    timestamps.push({
      word: rawWords[i],
      startMs,
      endMs: Math.max(startMs + 50, endMs),
    });

    currentMs += wordDuration;
  }

  return timestamps;
}

/**
 * Groups word timestamps into 3-word chunks for Hormozi / Shorts style subtitles
 */
export function groupIntoChunks(
  words: WordTimestamp[],
  chunkSize = 3
): SubtitleChunk[] {
  const chunks: SubtitleChunk[] = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    const slice = words.slice(i, i + chunkSize);
    if (slice.length > 0) {
      chunks.push({
        chunkIndex: Math.floor(i / chunkSize),
        words: slice,
        text: slice.map((w) => w.word).join(" "),
        startMs: slice[0].startMs,
        endMs: slice[slice.length - 1].endMs,
      });
    }
  }

  return chunks;
}
