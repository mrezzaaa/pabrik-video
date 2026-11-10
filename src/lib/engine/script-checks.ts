import type { CtaType, FactItem, ScriptSentence, TopicStyle } from "../types";

/**
 * Validator naskah yang berjalan di kode (bukan di prompt). Hasilnya daftar
 * masalah berbahasa Indonesia yang langsung bisa dikirim balik ke LLM untuk revisi.
 */

/** Kecepatan bicara TTS Indonesia yang dipakai proyek ini (kata per detik). */
export const WORDS_PER_SECOND = 2.7;
export const HOOK_MAX_WORDS = 8;
export const SCRIPT_MIN_WORDS = 90;
export const SCRIPT_MAX_WORDS = 125;
export const SENTENCE_MAX_WORDS = 24;
export const CTA_MAX_WORDS = 18;

export function words(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function speechSeconds(text: string): number {
  return words(text).length / WORDS_PER_SECOND;
}

const BAD_OPENERS =
  /^\s*(hai|halo|hi|hey|tahukah|tau nggak|pada kesempatan|di video ini|kali ini|selamat datang|guys)\b/i;

function digitsIn(text: string): string[] {
  return (text.match(/\d[\d.,]*/g) ?? [])
    .map((token) => token.replace(/[.,]+$/, "").replace(/[.,]/g, ""))
    .filter(Boolean);
}

function factNumberPool(facts: FactItem[]): Set<string> {
  const pool = new Set<string>();
  for (const fact of facts) {
    for (const number of digitsIn(`${fact.claim} ${fact.evidence}`)) pool.add(number);
  }
  return pool;
}

export interface HookCandidate {
  spoken: string;
  onScreen: string;
  type: string;
  factId?: string;
  visual?: string;
}

export function checkHook(hook: HookCandidate, facts: FactItem[]): string[] {
  const issues: string[] = [];
  const spokenWords = words(hook.spoken);
  if (spokenWords.length > HOOK_MAX_WORDS) {
    issues.push(
      `hook ${spokenWords.length} kata, maksimal ${HOOK_MAX_WORDS} (harus selesai dalam 3 detik)`,
    );
  }
  if (spokenWords.length < 3) issues.push("hook terlalu pendek");
  if (BAD_OPENERS.test(hook.spoken)) issues.push("hook dibuka dengan kalimat pengantar/klise");
  if (/[?!]{2,}/.test(hook.spoken)) issues.push("hook memakai tanda baca berlebihan");

  const screenWords = words(hook.onScreen);
  if (screenWords.length < 2 || screenWords.length > 6) {
    issues.push("teks layar harus 2-6 kata");
  } else {
    const norm = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
    if (norm(hook.spoken).includes(norm(hook.onScreen))) {
      issues.push("teks layar menyalin ucapan");
    }
  }

  const numbers = digitsIn(hook.spoken);
  if (numbers.length > 0) {
    const pool = factNumberPool(facts);
    if (!numbers.every((number) => pool.has(number))) {
      issues.push("angka di hook tidak ada di fakta terverifikasi");
    }
  }
  return issues;
}

const CTA_GROUPS: Record<string, RegExp> = {
  save: /\b(simpan|bookmark|arsipkan)\b/i,
  share: /\b(kirim|bagikan|share|teruskan|tag)\b/i,
  follow: /\b(ikuti|follow|subscribe|langganan)\b/i,
  like: /\b(like|love)\b/i,
  comment: /\b(komen|komentar|ketik)\b/i,
};

export function ctaGroups(text: string): string[] {
  return Object.entries(CTA_GROUPS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);
}

export function checkCta(text: string): string[] {
  const issues: string[] = [];
  const count = words(text).length;
  if (count > CTA_MAX_WORDS) issues.push(`CTA ${count} kata, maksimal ${CTA_MAX_WORDS}`);
  if (/\b(tolong|jangan lupa|link di bio|menyesal|wajib banget)\b/i.test(text)) {
    issues.push("CTA memohon/menakut-nakuti atau memakai frasa klise");
  }
  const groups = ctaGroups(text);
  if (groups.length > 1) issues.push(`CTA menumpuk beberapa aksi (${groups.join(", ")})`);
  if (groups.length === 0 && !/\?\s*$/.test(text)) {
    issues.push("CTA tidak berisi satu aksi yang jelas");
  }
  if (groups.includes("like")) issues.push("CTA meminta like, ganti dengan aksi yang bernilai (simpan/kirim/ikuti)");
  return issues;
}

export function inferCtaType(text: string): CtaType {
  const groups = ctaGroups(text);
  if (groups.includes("save")) return "save";
  if (groups.includes("share")) return "share";
  if (groups.includes("follow")) return "follow";
  return "comment";
}

const CTA_FALLBACK: Record<TopicStyle, { type: CtaType; text: string }> = {
  engineering: {
    type: "follow",
    text: "Bagian berikutnya kita bongkar komponen lainnya, ikuti biar nggak kelewat.",
  },
  factcheck: { type: "share", text: "Kirim ke temanmu yang masih percaya hal ini." },
  lifestyle: { type: "save", text: "Simpan videonya, soalnya nanti kamu bakal butuh ini lagi." },
};

export function fallbackCta(style: TopicStyle) {
  return CTA_FALLBACK[style];
}

const AI_TELLS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bbayangkan (jika|kalau|saja)\b/i, label: "\"bayangkan jika\"" },
  { pattern: /\bdi era digital\b/i, label: "\"di era digital\"" },
  { pattern: /\btidak bisa dipungkiri\b/i, label: "\"tidak bisa dipungkiri\"" },
  { pattern: /\bpada akhirnya\b/i, label: "\"pada akhirnya\"" },
  { pattern: /\byuk simak\b/i, label: "\"yuk simak\"" },
  { pattern: /\btahukah kamu\b/i, label: "\"tahukah kamu\"" },
  { pattern: /\bsimak sampai habis\b/i, label: "\"simak sampai habis\"" },
];

const SYMBOLS = /[&/#@()\[\]…]|\.{2,}/;

function firstWord(text: string) {
  return (words(text)[0] ?? "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export interface ScriptIssue {
  /** 1-based; 0 = naskah secara umum. */
  sentence: number;
  problem: string;
}

export function checkScript(
  sentences: ScriptSentence[],
  facts: FactItem[],
): ScriptIssue[] {
  const issues: ScriptIssue[] = [];
  const ids = new Set(facts.map((fact) => fact.id));
  const byId = new Map(facts.map((fact) => [fact.id, fact]));
  const push = (sentence: number, problem: string) => issues.push({ sentence, problem });

  if (sentences.length < 6) push(0, "naskah terlalu pendek (kurang dari 6 kalimat)");

  const total = sentences.reduce((sum, s) => sum + words(s.text).length, 0);
  if (total < SCRIPT_MIN_WORDS) push(0, `total ${total} kata, minimal ${SCRIPT_MIN_WORDS}`);
  if (total > SCRIPT_MAX_WORDS) push(0, `total ${total} kata, maksimal ${SCRIPT_MAX_WORDS}`);

  if (sentences[0]?.role !== "hook") push(1, "kalimat pertama harus berperan hook");
  const last = sentences[sentences.length - 1];
  if (last?.role !== "cta") push(sentences.length, "kalimat terakhir harus CTA");
  if (sentences.filter((s) => s.role === "cta").length > 1) push(0, "CTA lebih dari satu");

  let shortRun = 0;
  sentences.forEach((sentence, index) => {
    const n = index + 1;
    const count = words(sentence.text).length;

    if (count > SENTENCE_MAX_WORDS) push(n, `${count} kata, pecah jadi kalimat lebih pendek (maks ${SENTENCE_MAX_WORDS})`);
    shortRun = count <= 5 ? shortRun + 1 : 0;
    if (shortRun > 2) push(n, "lebih dari dua kalimat pendek berturut-turut, sambung agar mengalir");

    if (SYMBOLS.test(sentence.text)) push(n, "memuat simbol/kurung/elipsis yang sulit dibaca TTS");
    for (const tell of AI_TELLS) {
      if (tell.pattern.test(sentence.text)) push(n, `klise tulisan AI: ${tell.label}`);
    }

    const factIds = sentence.factIds ?? [];
    const unknown = factIds.filter((id) => !ids.has(id));
    if (unknown.length) push(n, `factIds tidak dikenal: ${unknown.join(", ")}`);

    const numbers = digitsIn(sentence.text);
    if (numbers.length > 0 && sentence.role !== "cta") {
      const pool = factNumberPool(factIds.map((id) => byId.get(id)).filter((f): f is FactItem => !!f));
      if (factIds.length === 0) {
        push(n, "memuat angka tetapi tidak punya factIds");
      } else if (!numbers.every((number) => pool.has(number))) {
        push(n, "angka tidak ada di fakta yang dirujuk (salin angka persis dari fakta)");
      }
    }
    if (numbers.length > 0 && sentence.role === "cta") push(n, "CTA tidak boleh memuat angka");
  });

  // Tiga kalimat berurutan dengan pembuka yang sama.
  for (let i = 2; i < sentences.length; i += 1) {
    const a = firstWord(sentences[i - 2].text);
    if (a && a === firstWord(sentences[i - 1].text) && a === firstWord(sentences[i].text)) {
      push(i + 1, `tiga kalimat berturut-turut dibuka dengan "${a}"`);
    }
  }

  const all = sentences.map((s) => s.text).join(" ");
  if ((all.match(/\bternyata\b/gi) ?? []).length > 2) push(0, "\"ternyata\" dipakai lebih dari dua kali");
  if ((all.match(/\bbukan (cuma|hanya|sekadar)\b[^.!?]*\b(tapi|melainkan)\b/gi) ?? []).length > 1) {
    push(0, "pola \"bukan cuma X, tapi Y\" dipakai lebih dari sekali");
  }

  const cta = sentences.find((s) => s.role === "cta");
  if (cta) for (const problem of checkCta(cta.text)) push(sentences.indexOf(cta) + 1, problem);

  return issues;
}

/** Kelompokkan kalimat menjadi beat (satu napas TTS): hook sendiri, CTA sendiri, sisanya 2-3 kalimat. */
export function assignBeats(sentences: ScriptSentence[]): ScriptSentence[] {
  let beat = 0;
  let count = 0;
  let chars = 0;
  return sentences.map((sentence, index) => {
    const prev = sentences[index - 1];
    const solo = sentence.role === "hook" || sentence.role === "cta";
    const prevSolo = prev?.role === "hook" || prev?.role === "cta";
    const startNew =
      index > 0 &&
      (solo ||
        prevSolo ||
        count >= 3 ||
        chars + sentence.text.length > 260 ||
        (sentence.role === "payoff" && prev?.role !== "payoff"));
    if (startNew) {
      beat += 1;
      count = 0;
      chars = 0;
    }
    count += 1;
    chars += sentence.text.length;
    return { ...sentence, beat };
  });
}
