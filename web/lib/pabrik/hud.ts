import type { Metric, Plan } from "./types.ts";

/** Fungsi murni (tanpa React, tanpa Node) supaya bisa dipakai di renderer mana pun. */

export interface BeatTiming {
  beat: number;
  start: number; // detik
  end: number;
}

/* ------------------------------ HEADLINE ------------------------------ */

export interface Seg {
  text: string;
  hl: boolean;
}

/** "Kenapa duri bandeng presto bisa *lunak*?" -> segmen biasa + segmen merah */
export function parseHeadline(s: string): Seg[] {
  const out: Seg[] = [];
  const re = /\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), hl: false });
    out.push({ text: m[1], hl: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last), hl: false });
  return out;
}

/** Pecah per kata (mempertahankan flag merah) lalu bungkus per baris. */
export function wrapHeadline(s: string, maxChars = 26): Seg[][] {
  const words: Seg[] = parseHeadline(s).flatMap((g) =>
    g.text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, hl: g.hl })),
  );
  const lines: Seg[][] = [];
  let cur: Seg[] = [];
  for (const w of words) {
    const len = [...cur, w].map((x) => x.text).join(" ").length;
    if (cur.length && len > maxChars) {
      lines.push(cur);
      cur = [];
    }
    cur.push(w);
  }
  if (cur.length) lines.push(cur);
  return lines;
}

/* ------------------------------ TELEMETRI ------------------------------ */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeOut = (u: number) => 1 - Math.pow(1 - clamp01(u), 3);

export function beatIndexAt(timings: BeatTiming[], t: number): number {
  let idx = 0;
  for (let i = 0; i < timings.length; i++) if (t >= timings[i].start) idx = i;
  return idx;
}

export const beatProgress = (timings: BeatTiming[], i: number, t: number) =>
  clamp01((t - timings[i].start) / (timings[i].end - timings[i].start));

function stateValue(metric: Metric, plan: Plan, i: number): number {
  const stateId = plan.beats[i]?.hud?.state;
  const st = stateId
    ? metric.states.find((s) => s.id === stateId)
    : metric.states[i] ?? metric.states[0];
  if (!st) throw new Error(`beat ${i + 1}: hud.state tidak ada di metric.states`);
  return st.value;
}

export function stateReadout(metric: Metric, plan: Plan, i: number): string {
  const stateId = plan.beats[i]?.hud?.state;
  const st = stateId
    ? metric.states.find((s) => s.id === stateId)
    : metric.states[i] ?? metric.states[0];
  return st?.readout ?? "";
}

/** Lama transisi angka di awal tiap beat. */
const rampOf = (timings: BeatTiming[], i: number) =>
  Math.min(0.9, (timings[i].end - timings[i].start) * 0.45);

/**
 * Angka yang tampil di layar. Nilai "fakta" hanya yang ada di metric.states;
 * angka di antaranya hanya muncul sebagai transisi animasi.
 */
export function valueAt(plan: Plan, metric: Metric, timings: BeatTiming[], t: number): number {
  const i = beatIndexAt(timings, t);
  const target = stateValue(metric, plan, i);
  const prev = i > 0 ? stateValue(metric, plan, i - 1) : target;
  const u = (t - timings[i].start) / rampOf(timings, i);
  return prev + (target - prev) * easeOut(u);
}

/** Titik [waktu, nilai] untuk sparkline, dari awal video sampai t. */
export function seriesPoints(
  plan: Plan,
  metric: Metric,
  timings: BeatTiming[],
  t: number,
): [number, number][] {
  const i = beatIndexAt(timings, t);
  const pts: [number, number][] = [];
  for (let j = 0; j <= i; j++) {
    const target = stateValue(metric, plan, j);
    const prev = j > 0 ? stateValue(metric, plan, j - 1) : target;
    const s = timings[j].start;
    const r = rampOf(timings, j);
    pts.push([s, prev]);
    if (j < i) {
      pts.push([s + r, target], [timings[j].end, target]);
    } else if (t < s + r) {
      pts.push([t, valueAt(plan, metric, timings, t)]);
    } else {
      pts.push([s + r, target], [t, target]);
    }
  }
  return pts;
}

export function valueColor(v: number, m: Metric): string {
  if (m.danger_at !== undefined && v >= m.danger_at) return "#B3261E";
  if (m.warn_at !== undefined && v >= m.warn_at) return "#EF4B2A";
  return "#141416";
}

/** Format Indonesia: koma desimal. */
export const formatNumber = (v: number, decimals: number) => v.toFixed(decimals).replace(".", ",");

/* ------------------------------- SUBTITLE ------------------------------- */

export interface SubWord {
  text: string;
  start: number;
  end: number;
}
export interface SubChunk {
  words: SubWord[];
  start: number;
  end: number;
}

/**
 * Subtitle karaoke per frasa. Waktu per kata diperkirakan dari panjang kata dan jeda tanda baca
 * (TTS lokal tidak memberi timestamp kata). Untuk presisi penuh, ganti dengan forced alignment (whisper).
 */
export function buildSubtitles(text: string, start: number, end: number): SubChunk[] {
  const raw = text.trim().split(/\s+/).filter(Boolean);
  const weight = (w: string) =>
    Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, "").length) +
    (/[,;:]$/.test(w) ? 3 : 0) +
    (/[.!?…]$/.test(w) ? 5 : 0);
  const total = raw.reduce((s, w) => s + weight(w), 0);
  const dur = end - start;
  let acc = 0;
  const words: SubWord[] = raw.map((w) => {
    const ws = start + (dur * acc) / total;
    acc += weight(w);
    return { text: w, start: ws, end: start + (dur * acc) / total };
  });

  const chunks: SubChunk[] = [];
  let cur: SubWord[] = [];
  const flush = () => {
    if (cur.length) {
      chunks.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
      cur = [];
    }
  };
  for (const w of words) {
    const len = [...cur, w].map((x) => x.text).join(" ").length;
    if (cur.length && (len > 28 || cur.length >= 5)) flush();
    cur.push(w);
    if (/[.!?…]$/.test(w.text) || (/[,:;]$/.test(w.text) && cur.length >= 2)) flush();
  }
  flush();
  chunks.forEach((c, i) => {
    c.end = i < chunks.length - 1 ? chunks[i + 1].start : end; // frasa bertahan sampai frasa berikut mulai
  });
  return chunks;
}
