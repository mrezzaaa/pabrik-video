import type { Plan, Research } from "./types.ts";

export const ROLES = [
  "HOOK", "MITOS", "TERBONGKAR", "ANATOMI1", "ANATOMI2",
  "ANATOMI3", "TITIK_GAGAL", "CARA_CEK", "HARGA_PILIH", "PENUTUP",
] as const;

// Sinkronkan dengan file audio yang benar-benar kamu punya.
export const SFX = [
  "click", "metal_clank", "beep", "whoosh_soft", "cash_register",
  "spark_zap", "water_drip", "hiss", "pop", "thud",
];

const LABELS = ["RESMI", "MEDIA", "KOMUNITAS", "DIMODELKAN"];
const CONF = ["tinggi", "sedang", "rendah"];

export const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const idxOk = (a: any, n: number) =>
  Array.isArray(a) && a.every((i) => Number.isInteger(i) && i >= 0 && i < n);

/* ------------------------------ RESEARCH ------------------------------ */

export const validateResearch = (nResults: number) => (x: any): string[] => {
  const e: string[] = [];
  if (!x || typeof x !== "object") return ["root bukan objek"];
  if (!x.hook?.question || !x.hook?.short_answer) e.push("hook.question dan hook.short_answer wajib");

  const facts: any[] = Array.isArray(x.facts) ? x.facts : [];
  const gaps: any[] = Array.isArray(x.gaps) ? x.gaps : [];
  if (facts.length === 0) e.push("facts kosong");
  if (facts.length > 8) e.push("facts maksimal 8");
  if (facts.length > 0 && facts.length < 5 && gaps.length === 0)
    e.push("facts < 5 tetapi gaps kosong; jelaskan di gaps apa yang tidak ditemukan");

  facts.forEach((f, i) => {
    const p = `facts[${i}]`;
    if (!f.claim) e.push(`${p}.claim kosong`);
    if (!LABELS.includes(f.label)) e.push(`${p}.label harus salah satu dari ${LABELS.join("|")}`);
    if (!CONF.includes(f.confidence)) e.push(`${p}.confidence harus salah satu dari ${CONF.join("|")}`);
    if (!idxOk(f.source_index, nResults)) e.push(`${p}.source_index harus array integer 0-${nResults - 1}`);
    else if (f.label !== "DIMODELKAN" && f.source_index.length === 0)
      e.push(`${p} berlabel ${f.label} tapi source_index kosong`);
    if (f.label === "DIMODELKAN" && String(f.evidence ?? "").length < 30)
      e.push(`${p} DIMODELKAN wajib memuat rumus dan asumsi di evidence`);
  });

  const anatomy: any[] = Array.isArray(x.anatomy) ? x.anatomy : [];
  if ((anatomy.length < 3 || anatomy.length > 8) && gaps.length === 0)
    e.push("anatomy harus 3-8 komponen (atau jelaskan kekurangannya di gaps)");
  anatomy.forEach((a, i) => {
    if (!a.part || !a.material || !a.function) e.push(`anatomy[${i}] butuh part, material, function`);
    if (!idxOk(a.source_index, nResults)) e.push(`anatomy[${i}].source_index tidak valid`);
  });

  if (!Array.isArray(x.flow) || x.flow.length < 3 || x.flow.length > 5) e.push("flow harus 3-5 langkah");

  const myths: any[] = Array.isArray(x.myths) ? x.myths : [];
  if (myths.length < 1 || myths.length > 4) e.push("myths harus 1-4");
  myths.forEach((m, i) => {
    if (!m.myth || !m.origin || !m.fact) e.push(`myths[${i}] butuh myth, origin, fact`);
    if (!idxOk(m.source_index, nResults)) e.push(`myths[${i}].source_index tidak valid`);
  });

  const an: any[] = Array.isArray(x.anchor_numbers) ? x.anchor_numbers : [];
  if (an.length < 2 || an.length > 3) e.push("anchor_numbers harus 2-3");
  return e;
};

/* ------------------------------- SCRIPT ------------------------------- */

const VISUAL_RE =
  /^HERO:\s*(.+?)\s*\|\s*MODE:\s*(assembled|cutaway|exploded)\s*\|\s*EXPLODE:\s*(\d{1,3})%\s*\|\s*TAMPIL:\s*(.+?)\s*\|\s*AKSEN:\s*(.+?)\s*\((red|hi|pcb|glass|green)\)\s*\|\s*DETAIL:\s*(.+?)\s*\|\s*KAMERA:\s*(.+)$/;

export interface ParsedVisual {
  hero: string;
  mode: "assembled" | "cutaway" | "exploded";
  explode: number; // 0..1, kirim ke SvgScene sebagai bagian dari progress
  show: string[];
  accent: string;
  accentColor: "red" | "hi" | "pcb" | "glass" | "green";
  details: string[];
  camera: string;
}

export function parseVisual(v: string): ParsedVisual | null {
  const m = VISUAL_RE.exec(v.trim());
  if (!m) return null;
  return {
    hero: m[1],
    mode: m[2] as ParsedVisual["mode"],
    explode: Math.min(100, Number(m[3])) / 100,
    show: m[4].split(",").map((s) => s.trim()),
    accent: m[5],
    accentColor: m[6] as ParsedVisual["accentColor"],
    details: m[7].split(",").map((s) => s.trim()),
    camera: m[8],
  };
}

function refOk(ref: string, r: Research): boolean {
  const m = /^(facts|anatomy|myths|flow|anchor_numbers)\[(\d+)\]$/.exec(ref);
  if (!m) return false;
  const arr = (r as any)[m[1]];
  return Array.isArray(arr) && Number(m[2]) < arr.length;
}

export const validateScript = (research: Research) => (x: any): string[] => {
  const e: string[] = [];
  const beats: any[] = x?.beats;
  if (!Array.isArray(beats)) return ["beats harus array"];
  if (beats.length !== 10) e.push(`harus tepat 10 beat, sekarang ${beats.length}`);

  let total = 0;
  let prevSfx = "";
  let hero0 = "";
  const explodes: number[] = [];
  const anatomyNames = research.anatomy.map((a) => a.part.toLowerCase());

  beats.forEach((b, i) => {
    const p = `beat ${i + 1}`;
    if (b.beat_number !== i + 1) e.push(`${p}: beat_number harus ${i + 1}`);
    if (b.role !== ROLES[i]) e.push(`${p}: role harus ${ROLES[i]}`);

    const n = wc(String(b.text ?? ""));
    total += n;
    if (n < 6 || n > 16) e.push(`${p}: ${n} kata, harus 6-16 (target 8-14)`);

    if (!SFX.includes(b.sfx_keyword)) e.push(`${p}: sfx_keyword harus salah satu dari ${SFX.join("|")}`);
    if (b.sfx_keyword === prevSfx) e.push(`${p}: sfx_keyword sama dengan beat sebelumnya`);
    prevSfx = b.sfx_keyword;

    const t = String(b.tulisan_layar ?? "");
    if (!t || t !== t.toUpperCase()) e.push(`${p}: tulisan_layar harus HURUF KAPITAL`);
    if (wc(t) > 3) e.push(`${p}: tulisan_layar maksimal 3 kata`);

    const v = parseVisual(String(b.visual ?? ""));
    if (!v) {
      e.push(`${p}: format visual salah (HERO | MODE | EXPLODE | TAMPIL | AKSEN (warna) | DETAIL | KAMERA)`);
    } else {
      if (i === 0) hero0 = v.hero.toLowerCase();
      else if (v.hero.toLowerCase() !== hero0) e.push(`${p}: HERO berbeda dari beat 1`);
      explodes.push(v.explode);
      const a = v.accent.toLowerCase();
      if (!anatomyNames.some((n2) => n2.includes(a) || a.includes(n2)))
        e.push(`${p}: AKSEN "${v.accent}" tidak cocok dengan nama part di anatomy riset`);
    }

    const refs: string[] = Array.isArray(b.source_refs) ? b.source_refs : [];
    refs.forEach((r) => {
      if (!refOk(r, research)) e.push(`${p}: source_refs "${r}" tidak ada di data riset`);
    });
    if (i > 0 && i < 9 && refs.length === 0) e.push(`${p}: source_refs wajib minimal satu`);
  });

  if (explodes.length >= 6 && !(explodes[3] <= explodes[4] && explodes[4] <= explodes[5]))
    e.push("EXPLODE beat 4-6 harus naik bertahap");
  if (total < 95 || total > 130) e.push(`total ${total} kata, harus 95-130 (target 100-125)`);
  return e;
};

/** Isi field turunan di kode. Jangan pernah minta LLM menghitung ini. */
export function finalizePlan(plan: Plan): Plan {
  return {
    ...plan,
    total_words: plan.beats.reduce((s, b) => s + wc(b.text), 0),
    narration_text: plan.beats.map((b) => b.text.trim()).join(" "),
  };
}

/** Input untuk {metrics_json} di prompt juri. */
export function computeMetrics(plan: Plan) {
  return {
    beat_count: plan.beats.length,
    words_per_beat: plan.beats.map((b) => wc(b.text)),
    total_words: plan.beats.reduce((s, b) => s + wc(b.text), 0),
    sfx_sequence: plan.beats.map((b) => b.sfx_keyword),
    screen_label_words: plan.beats.map((b) => wc(b.tulisan_layar)),
  };
}

/* --------------------------------- SVG --------------------------------- */

export function cleanSvgCode(raw: string): string {
  return raw.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/i, "").trim();
}

export function validateSvg(code: string): string[] {
  const e: string[] = [];
  if (!/export default function SvgScene/.test(code)) e.push("harus memuat 'export default function SvgScene'");
  if (!/viewBox="0 0 1080 1920"/.test(code)) e.push('svg root harus viewBox="0 0 1080 1920"');
  if (/<image|<img/i.test(code)) e.push("dilarang <image>/<img>");
  if (/<filter|feGaussianBlur|filter=/.test(code)) e.push("dilarang filter/blur");
  if (/localStorage|sessionStorage|fetch\(/.test(code)) e.push("dilarang akses storage/network");
  const open = (code.match(/<svg[\s>]/g) ?? []).length;
  const close = (code.match(/<\/svg>/g) ?? []).length;
  if (open !== 1 || close !== 1) e.push("harus tepat satu <svg>...</svg>");
  if (/…|\.\.\.\s*<\//.test(code)) e.push("kode terpotong atau berisi placeholder '...'");
  return e;
}
