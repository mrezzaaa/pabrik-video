import type {
  CaptionPage,
  ScriptSentence,
  WordTimestamp,
} from "./types";

function stripWord(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, "");
}

function wordWeight(word: string, emphasis: boolean) {
  const letters = stripWord(word).length;
  let weight = 1.4 + Math.max(1, letters) * 0.62;
  if (/[,;:]$/.test(word)) weight += 1.1;
  if (/[.!?]$/.test(word)) weight += 1.8;
  if (emphasis) weight *= 1.12;
  return weight;
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

/**
 * Estimate word-level timestamps proportionally to syllable-ish weight.
 * VoiceStudio does not expose forced alignment, so this keeps karaoke
 * captions locked to the real audio length. For edge-tts fallback the
 * result is equally usable.
 */
export function alignWords(
  sentences: ScriptSentence[],
  audioDuration: number,
): { words: WordTimestamp[]; captions: CaptionPage[] } {
  const duration = Math.max(0.8, audioDuration);
  const cleaned = sentences
    .map((sentence) => ({
      ...sentence,
      tokens: sentence.text.trim().split(/\s+/).filter(Boolean),
    }))
    .filter((sentence) => sentence.tokens.length > 0);

  if (cleaned.length === 0) {
    return { words: [], captions: [] };
  }

  const leadIn = 0.14;
  const gap = 0.08;
  const usable = Math.max(
    cleaned.length * 0.4,
    duration - leadIn - gap * Math.max(0, cleaned.length - 1),
  );

  const sentenceWeights = cleaned.map((sentence) => {
    const emphasis = new Set(sentence.emphasisWords.map(stripWord));
    return sentence.tokens.reduce(
      (sum, token) =>
        sum + wordWeight(token, emphasis.has(stripWord(token))),
      0,
    );
  });
  const totalSentenceWeight = sentenceWeights.reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const words: WordTimestamp[] = [];
  let cursor = leadIn;

  cleaned.forEach((sentence, sentenceIndex) => {
    const sentenceDuration =
      (usable * sentenceWeights[sentenceIndex]) / totalSentenceWeight;
    const emphasisSet = new Set(sentence.emphasisWords.map(stripWord));
    const weights = sentence.tokens.map((token) =>
      wordWeight(token, emphasisSet.has(stripWord(token))),
    );
    const sentenceWeightSum = weights.reduce((sum, weight) => sum + weight, 0);

    let sentenceCursor = cursor;
    sentence.tokens.forEach((token, wordIndex) => {
      const isLastWord = wordIndex === sentence.tokens.length - 1;
      const isLastSentence = sentenceIndex === cleaned.length - 1;
      const allocated =
        (sentenceDuration * weights[wordIndex]) / sentenceWeightSum;
      const start = sentenceCursor;
      const end = isLastWord && isLastSentence
        ? Math.min(duration, start + Math.max(allocated, 0.12))
        : start + Math.max(allocated, 0.1);

      words.push({
        word: token,
        start: round(start),
        end: round(Math.min(end, duration)),
        sentenceId: sentence.id,
        emphasis: emphasisSet.has(stripWord(token)),
      });
      sentenceCursor = end;
    });

    cursor = sentenceCursor + gap;
  });

  // Close tiny floating-point drift so the final caption never outlives audio.
  if (words.length > 0) {
    const last = words[words.length - 1];
    last.end = round(Math.max(last.start + 0.08, Math.min(last.end, duration)));
  }

  return { words, captions: groupCaptionPages(words, 3) };
}

export function groupCaptionPages(
  words: WordTimestamp[],
  maxWords = 3,
): CaptionPage[] {
  const pages: CaptionPage[] = [];
  let current: WordTimestamp[] = [];

  const flush = () => {
    if (current.length === 0) return;
    pages.push({
      text: current.map((word) => word.word).join(" "),
      words: current.map(({ word, start, end, emphasis, sentenceId }) => ({
        word,
        start,
        end,
        emphasis,
        sentenceId,
      })),
    });
    current = [];
  };

  for (const word of words) {
    const previous = current[current.length - 1];
    if (
      previous &&
      (current.length >= maxWords || previous.sentenceId !== word.sentenceId)
    ) {
      flush();
    }
    current.push(word);
  }
  flush();

  return pages;
}
