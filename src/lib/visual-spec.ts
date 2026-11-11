import { axisLabel, stripEmoji } from "./text";
import type {
  SceneCompare,
  SceneLayer,
  SceneStamp,
  SceneStep,
  StampWord,
} from "./types";

/**
 * Guard untuk visual stage "editorial" (stamp / compare / crosssection /
 * timeline). Semua teks di center stage tetap label 1-2 kata, dan setiap
 * label harus bisa dilacak ke narasi kalimat itu atau ke fakta riset, supaya
 * LLM tidak mengarang nama lapisan / pembanding / langkah.
 */

const STAMP_CUES: Record<StampWord, RegExp> = {
  MITOS: /mitos|salah kaprah|keliru|hoaks|bohong|tidak benar|ternyata bukan/,
  FAKTA: /fakta|nyata|terbukti|ternyata|sebenarnya|faktanya/,
  BAHAYA: /bahaya|berbahaya|racun|beracun|risiko|fatal|mematikan|merusak/,
  AMAN: /\baman\b|tidak berbahaya|terbukti aman/,
};

const STAMP_WORDS = Object.keys(STAMP_CUES) as StampWord[];

/** Judul struktural (bukan klaim fakta) boleh tampil tanpa ada di narasi. */
const STRUCTURAL_TITLES = new Set([
  "MITOS",
  "FAKTA",
  "SALAH",
  "BENAR",
  "BAHAYA",
  "AMAN",
  "SEBELUM",
  "SESUDAH",
  "ASLI",
  "PALSU",
  "MURAH",
  "MAHAL",
]);

function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return axisLabel(
    stripEmoji(value)
      .replace(/[()[\]]/g, " ")
      .replace(/[^\p{L}\p{N}\s%]/gu, " "),
  );
}

/** Setiap kata di label dicek terhadap narasi/riset bila knowledge tersedia; angka harus ada di narasi. */
function known(label: string, knowledge: string, digits: Set<string>): boolean {
  if (!label) return false;
  const tokens = label.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 3) return false;

  // Angka pada label wajib grounded di naskah/narasi
  for (const token of tokens) {
    if (/^\d+$/.test(token) && !digits.has(token)) return false;
  }

  // Jika knowledge tidak tersedia, terima label tekstual singkat
  if (!knowledge || knowledge.trim().length === 0) return true;

  // Setidaknya salah satu kata kunci utama harus terlacak di knowledge, atau panjang kata < 4
  const words = tokens.filter((t) => !/^\d+$/.test(t) && t.length >= 4);
  if (words.length === 0) return true;
  return words.some((word) => knowledge.includes(word));
}

function uniqueLabels(
  raw: Array<{ label?: string }> | undefined,
  limit: number,
  knowledge: string,
  digits: Set<string>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw ?? []) {
    const label = clean(item?.label);
    if (!label || seen.has(label) || !known(label, knowledge, digits)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}

/** Cap verdict: kata cap harus sejalan dengan isi narasi. */
export function deriveStamp(
  raw: { word?: string } | undefined,
  narration: string,
): SceneStamp | null {
  const word = String(raw?.word ?? "").trim().toUpperCase() as StampWord;
  if (!STAMP_WORDS.includes(word)) return null;
  return STAMP_CUES[word].test(narration.toLowerCase()) ? { word } : null;
}

export function deriveCompare(
  raw:
    | {
        left?: { title?: string; items?: string[] };
        right?: { title?: string; items?: string[] };
      }
    | undefined,
  knowledge: string,
  digits: Set<string>,
): SceneCompare | null {
  const side = (s?: { title?: string; items?: string[] }) => {
    const title = clean(s?.title);
    const items = uniqueLabels(
      (s?.items ?? []).map((label) => ({ label })),
      3,
      knowledge,
      digits,
    );
    const titleOk =
      STRUCTURAL_TITLES.has(title) || known(title, knowledge, digits);
    return title && titleOk && items.length > 0
      ? { title, items }
      : null;
  };
  const left = side(raw?.left);
  const right = side(raw?.right);
  return left && right ? { left, right } : null;
}

/** Potongan berlapis: 3-5 lapisan dari luar ke dalam. */
export function deriveLayers(
  raw: Array<{ label?: string }> | undefined,
  knowledge: string,
  digits: Set<string>,
): SceneLayer[] | null {
  const labels = uniqueLabels(raw, 5, knowledge, digits);
  return labels.length >= 3 ? labels.map((label) => ({ label })) : null;
}

/** Urutan proses: 2-4 langkah. */
export function deriveSteps(
  raw: Array<{ label?: string }> | undefined,
  knowledge: string,
  digits: Set<string>,
): SceneStep[] | null {
  const labels = uniqueLabels(raw, 4, knowledge, digits);
  return labels.length >= 2 ? labels.map((label) => ({ label })) : null;
}
