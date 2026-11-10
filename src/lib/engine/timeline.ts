import { toSpokenIndonesian } from "../speech-prep";
import type { ScriptSentence } from "../types";

/**
 * Timeline suara. Voice Studio tidak memberi forced alignment, jadi:
 *  - durasi tiap beat (kelompok kalimat) diukur dari audio asli,
 *  - batas kalimat di dalam beat dicari dari jeda (silence) nyata di audio,
 *    dan hanya jika tidak ada jeda yang cocok, dibagi proporsional.
 * Hasilnya scene visual jatuh tepat di batas kalimat yang benar-benar terdengar.
 */

export interface Silence {
  start: number;
  end: number;
}

export interface Span {
  start: number;
  end: number;
}

/** Parse keluaran `ffmpeg -af silencedetect` (stderr). */
export function parseSilences(stderr: string): Silence[] {
  const out: Silence[] = [];
  let pending: number | null = null;
  for (const line of stderr.split(/\r?\n/)) {
    const start = line.match(/silence_start:\s*(-?\d+(?:\.\d+)?)/);
    if (start) {
      pending = Math.max(0, Number(start[1]));
      continue;
    }
    const end = line.match(/silence_end:\s*(-?\d+(?:\.\d+)?)/);
    if (end && pending !== null) {
      out.push({ start: pending, end: Number(end[1]) });
      pending = null;
    }
  }
  return out;
}

/** Bobot waktu ucap sebuah teks: huruf dari bentuk ucapan + jeda tanda baca. */
export function spokenWeight(text: string): number {
  const spoken = toSpokenIndonesian(text);
  const letters = (spoken.match(/\p{L}/gu) ?? []).length;
  const commas = (spoken.match(/[,;:]/g) ?? []).length;
  const stops = (spoken.match(/[.!?]/g) ?? []).length;
  return Math.max(1, letters + commas * 3 + stops * 5);
}

/**
 * Pilih batas kalimat dari jeda audio.
 * @param expected waktu batas yang diharapkan (detik, relatif beat), menaik
 * @param tolerance toleransi sebagai pecahan dari total durasi beat
 */
export function snapBoundaries(
  expected: number[],
  silences: Silence[],
  total: number,
  tolerance = 0.2,
  minGap = 0.35,
): number[] {
  const mids = silences
    .map((s) => (s.start + s.end) / 2)
    .filter((m) => m > minGap && m < total - minGap);
  const chosen: number[] = [];
  let last = 0;
  const maxDistance = tolerance * total;

  for (const target of expected) {
    let best: number | null = null;
    for (const mid of mids) {
      if (mid <= last + minGap) continue;
      const distance = Math.abs(mid - target);
      if (distance <= maxDistance && (best === null || distance < Math.abs(best - target))) {
        best = mid;
      }
    }
    const value = Math.min(Math.max(best ?? target, last + minGap), total - minGap);
    chosen.push(value);
    last = value;
  }
  return chosen;
}

/** Bagi durasi sebuah beat menjadi span per kalimat. */
export function sentenceSpans(
  duration: number,
  texts: string[],
  silences: Silence[],
): { spans: Span[]; snapped: number } {
  if (texts.length <= 1) return { spans: [{ start: 0, end: duration }], snapped: 0 };

  const weights = texts.map(spokenWeight);
  const sum = weights.reduce((a, b) => a + b, 0);
  const expected: number[] = [];
  let acc = 0;
  for (let i = 0; i < weights.length - 1; i += 1) {
    acc += weights[i];
    expected.push((acc / sum) * duration);
  }

  const boundaries = snapBoundaries(expected, silences, duration);
  const snapped = boundaries.filter((b, i) => Math.abs(b - expected[i]) > 1e-6).length;
  const edges = [0, ...boundaries, duration];
  return {
    spans: texts.map((_, i) => ({ start: edges[i], end: edges[i + 1] })),
    snapped,
  };
}

export interface BeatAudio {
  sentences: ScriptSentence[];
  /** Durasi beat setelah silence di ujung dipangkas. */
  duration: number;
  silences: Silence[];
  /** Jeda setelah beat ini sebelum beat berikutnya (detik). */
  gapAfter: number;
}

/** Gabungkan beat menjadi timing absolut per kalimat. */
export function buildSentenceTimings(beats: BeatAudio[]): {
  timings: { id: string; start: number; end: number }[];
  total: number;
  /** Jumlah batas kalimat yang ditarik ke jeda nyata di audio (sisanya proporsional). */
  snapped: number;
  boundaries: number;
} {
  const timings: { id: string; start: number; end: number }[] = [];
  let offset = 0;
  let snapped = 0;
  let boundaries = 0;

  for (const beat of beats) {
    const result = sentenceSpans(
      beat.duration,
      beat.sentences.map((s) => s.text),
      beat.silences,
    );
    snapped += result.snapped;
    boundaries += Math.max(0, beat.sentences.length - 1);
    beat.sentences.forEach((sentence, index) => {
      timings.push({
        id: sentence.id,
        start: offset + result.spans[index].start,
        end: offset + result.spans[index].end,
      });
    });
    offset += beat.duration + beat.gapAfter;
  }
  const lastBeat = beats[beats.length - 1];
  return { timings, total: offset - (lastBeat?.gapAfter ?? 0), snapped, boundaries };
}

export function hookGapSeconds(index: number, beats: ScriptSentence[][]): number {
  const current = beats[index];
  const next = beats[index + 1];
  if (!next) return 0;
  if (current[0]?.role === "hook") return 0.28;
  if (next[0]?.role === "cta") return 0.3;
  return 0.1;
}
