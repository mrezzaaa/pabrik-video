import { chatJSON } from "./omniroute";
import { topicClassifySchema } from "./schemas";
import type { TopicStyle, VisualType } from "./types";
import { STYLE_PROMPT_ADDENDUM, TOPIC_CLASSIFIER_PROMPT, VISUAL_SYSTEM_PROMPT } from "./viral";

/**
 * Gaya video per jenis topik: satu sumber kebenaran untuk
 *  - label (UI)
 *  - visual type yang boleh dipakai planner
 *  - tambahan prompt untuk visual director
 *
 * Project lama (researchData.style kosong) = "factcheck", yaitu perilaku
 * planner sebelum fitur ini ada.
 */
export const DEFAULT_TOPIC_STYLE: TopicStyle = "factcheck";

export const STYLE_LABELS: Record<TopicStyle, string> = {
  engineering: "Sains / Engineering",
  factcheck: "Fakta / Mitos",
  lifestyle: "Sehari-hari",
};

const ALL_VISUALS: VisualType[] = [
  "B_ROLL_IMAGE",
  "SVG_GAUGE",
  "SVG_BAR_CHART",
  "SVG_COUNTER",
  "SVG_WAVEFORM",
  "SVG_STAMP",
  "SVG_COMPARE",
  "SVG_CROSSSECTION",
  "SVG_TIMELINE",
];

export const STYLE_POLICY: Record<TopicStyle, { allowed: ReadonlySet<VisualType> }> = {
  engineering: {
    allowed: new Set<VisualType>([
      "B_ROLL_IMAGE",
      "SVG_CROSSSECTION",
      "SVG_TIMELINE",
      "SVG_GAUGE",
      "SVG_COUNTER",
      "SVG_BAR_CHART",
    ]),
  },
  factcheck: { allowed: new Set<VisualType>(ALL_VISUALS) },
  lifestyle: {
    allowed: new Set<VisualType>(["B_ROLL_IMAGE", "SVG_COUNTER", "SVG_TIMELINE"]),
  },
};

export function resolveTopicStyle(value: unknown): TopicStyle {
  return value === "engineering" || value === "factcheck" || value === "lifestyle"
    ? value
    : DEFAULT_TOPIC_STYLE;
}

export function isVisualAllowed(style: TopicStyle, type: VisualType): boolean {
  return STYLE_POLICY[style].allowed.has(type);
}

export function visualSystemPromptFor(style: TopicStyle): string {
  return `${VISUAL_SYSTEM_PROMPT}${STYLE_PROMPT_ADDENDUM[style]}`;
}

const ENGINEERING_HINT =
  /\b(cara kerja|mesin|turbin|turbofan|jet|pesawat|roket|baterai|reaktor|nuklir|sirkuit|chip|prosesor|semikonduktor|transistor|generator|pompa|kompresor|hidrolik|bendungan|jembatan|struktur|rekayasa|engineering|mekanisme|komponen|rangkaian|sensor|satelit|mobil listrik|motor listrik|kapal selam|roda|gir|sekrup|baut|katrol|tuas|pegas|rem|bearing|gravitasi|magnet|listrik|energi|hidrogen|fisika|kimia|tsunami|gempa|gunung berapi|dna|atom|sel|organ|jantung|otak|tata surya|lubang hitam)\b/gi;
const FACTCHECK_HINT =
  /\b(mitos|fakta|benarkah|hoaks|hoax|katanya|salah kaprah|bohong|bahaya|berbahaya|aman|ternyata|terbukti|statistik|persen)\b/gi;
const LIFESTYLE_HINT =
  /\b(kebiasaan|sehari-hari|rutinitas|tips|resep|makanan|minuman|sarapan|olahraga|tidur|belanja|liburan|rumah|kantor|hemat|menabung|gaya hidup|skincare|diet)\b/gi;

function hits(text: string, pattern: RegExp): number {
  return text.match(pattern)?.length ?? 0;
}

/** Cadangan kalau LLM gagal. Skor kata kunci terbanyak; seri/nol = factcheck. */
export function heuristicTopicStyle(topic: string, facts: string[] = []): TopicStyle {
  const text = `${topic} ${topic} ${facts.slice(0, 3).join(" ")}`.toLowerCase();
  const scores: Record<TopicStyle, number> = {
    engineering: hits(text, ENGINEERING_HINT),
    factcheck: hits(text, FACTCHECK_HINT),
    lifestyle: hits(text, LIFESTYLE_HINT),
  };
  const best = (Object.keys(scores) as TopicStyle[]).sort(
    (a, b) => scores[b] - scores[a],
  )[0];
  return scores[best] > 0 && scores[best] > scores.factcheck ? best : DEFAULT_TOPIC_STYLE;
}

/** Petakan jawaban LLM yang "hampir benar" ("science", "Engineering/Sains", dst.) ke gaya valid. */
export function normalizeTopicStyle(value: unknown): TopicStyle | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (/engineer|teknik|sains|science|technical|explainer/.test(v)) return "engineering";
  if (/fact|mitos|myth|fakta|data/.test(v)) return "factcheck";
  if (/life|sehari|daily|everyday/.test(v)) return "lifestyle";
  return null;
}

export async function classifyTopicStyle(input: {
  topic: string;
  facts: string[];
  modelOverride?: string | null;
}): Promise<{
  style: TopicStyle;
  searchTopic: string;
  visualTerms: string[];
  avoidTerms: string[];
  source: "llm" | "heuristic";
}> {
  try {
    const result = await chatJSON({
      system: TOPIC_CLASSIFIER_PROMPT,
      user: `TOPIK: ${input.topic}\n\nFAKTA RISET (ringkas):\n${input.facts
        .slice(0, 4)
        .map((fact, index) => `${index + 1}. ${fact.slice(0, 220)}`)
        .join("\n")}`,
      schema: topicClassifySchema,
      tier: "fast",
      modelOverride: input.modelOverride,
      temperature: 0.1,
      maxTokens: 900,
      retries: 2,
    });
    const searchTopic = cleanSearchTopic(result.searchTopic);
    const style = normalizeTopicStyle(result.style);
    if (!style) {
      console.warn(
        `[topic-style] style LLM tidak dikenali (${JSON.stringify(result.style)}), style dari heuristik, searchTopic dipertahankan.`,
      );
    }
    return {
      style: style ?? heuristicTopicStyle(input.topic, input.facts),
      searchTopic,
      visualTerms: cleanTerms(result.visualTerms, 12, 5),
      avoidTerms: cleanTerms(result.avoidTerms, 8, 2),
      source: style ? "llm" : "heuristic",
    };
  } catch (error) {
    console.warn(
      "[topic-style] LLM gagal, memakai heuristik kata kunci:",
      error instanceof Error ? error.message : error,
    );
    return {
      style: heuristicTopicStyle(input.topic, input.facts),
      searchTopic: "",
      visualTerms: [],
      avoidTerms: [],
      source: "heuristic",
    };
  }
}

const QUERY_NOISE = new Set([
  "gimana", "bagaimana", "kenapa", "mengapa", "apa", "apakah", "benarkah",
  "cara", "kerja", "bekerja", "yang", "dan", "di", "ke", "dari", "itu", "ini",
  "untuk", "dengan", "adalah", "bisa", "kah", "the", "how", "why", "what", "does",
]);
const DIAGRAM_HINT =
  /\b(diagram|cutaway|blueprint|schematic|cross.?section|exploded|potongan|skema)\b/i;

/** Kata inti topik (tanpa kata tanya), dipakai sebagai jangkar query gambar. */
export function topicCore(topic: string): string[] {
  return topic
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !QUERY_NOISE.has(word))
    .slice(0, 4);
}

function cleanSearchTopic(value: string): string {
  return value
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

function cleanTerms(values: unknown, max: number, maxWords: number): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const term = cleanSearchTopic(value).split(" ").slice(0, maxWords).join(" ").toLowerCase();
    if (term.length >= 3 && !seen.has(term)) seen.add(term);
    if (seen.size >= max) break;
  }
  return [...seen];
}

/** Petunjuk gambar dari stage research; kosong untuk project lama. */
export interface ImageHints {
  searchTopic: string;
  visualTerms: string[];
  avoidTerms: string[];
}
export const NO_HINTS: ImageHints = { searchTopic: "", visualTerms: [], avoidTerms: [] };

export function readImageHints(researchData: unknown): ImageHints {
  const r = (researchData ?? {}) as Record<string, unknown>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  return {
    searchTopic: typeof r.searchTopic === "string" ? r.searchTopic : "",
    visualTerms: strings(r.visualTerms),
    avoidTerms: strings(r.avoidTerms),
  };
}

/** Kata Indonesia yang tidak mungkin ada di query gambar berbahasa Inggris. */
const ID_MARKERS = new Set(
  ("yang dan di ke dari untuk dengan ini itu pada akan bisa tidak gak nggak ga lawan mendorong dorong bakar " +
    "pesawat mesin udara tekanan suhu panas dingin listrik tenaga energi energinya daya ruang ruangan sisa buang " +
    "massa hukum ketiga langkah hisap kompres kompresor tekan gerak putar poros kipas baling bilah turbin " +
    "seharusnya mengembang keluar masuk cara kerja bekerja kenapa bagaimana gimana apa adalah ada jadi lebih " +
    "sangat banyak semua orang manusia rumah makanan minuman sehat tidur olahraga hidup sehari").split(" "),
);

export function looksIndonesian(text: string): boolean {
  return text
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter(Boolean)
    .some((word) => ID_MARKERS.has(word) || (word.length > 6 && word.endsWith("nya")));
}

function vocabWords(searchTopic: string, terms: string[]): string[] {
  return [...new Set(`${searchTopic} ${terms.join(" ")}`.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4))];
}

/** Kata kunci relevansi untuk menilai kandidat gambar (dipakai images.ts). */
export function relevanceVocab(hints: ImageHints): string[] {
  return vocabWords(hints.searchTopic, hints.visualTerms);
}

/** Sudut pencarian yang digilir per scene supaya gambar tidak seragam. */
const SEARCH_ANGLES: Record<TopicStyle, string[]> = {
  engineering: [
    "cutaway diagram",
    "cross section",
    "components close up",
    "schematic blueprint",
    "internal structure",
  ],
  factcheck: ["", "real photo", "close up"],
  lifestyle: ["", "close up", "people", "real photo"],
};

export interface QueryContext extends Partial<ImageHints> {
  sceneIndex?: number;
}

function overlapsVocab(query: string, vocab: string[]): boolean {
  const words = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 4);
  return words.some((w) => vocab.some((v) => w.includes(v) || v.includes(w)));
}

/**
 * Query gambar harus nyambung ke topik DAN berbahasa Inggris.
 * Dengan searchTopic (project baru):
 *  - query LLM berbahasa Inggris dan nyambung ke kosakata topik -> dipakai apa adanya;
 *  - selain itu (Indonesia, kosong, atau melenceng) -> diganti visualTerms[sceneIndex],
 *    sehingga tiap scene mendapat frasa berbeda yang tetap menyebut objek inti.
 * Tanpa searchTopic (project lama): kata inti topik di depan, perilaku sebelumnya.
 */
export function anchorImageQuery(
  query: string,
  topic: string,
  style: TopicStyle,
  ctx: QueryContext = {},
): string {
  const english = (ctx.searchTopic ?? "").trim();
  const terms = ctx.visualTerms ?? [];
  const idx = ctx.sceneIndex ?? 0;
  const clean = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 100);

  if (english) {
    const vocab = vocabWords(english, terms);
    const queryWords = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const topicWords = new Set(english.toLowerCase().split(/\s+/));
    // Query yang hanya mengulang searchTopic terlalu generik untuk membedakan scene.
    const generic = terms.length > 0 && queryWords.every((w) => topicWords.has(w));
    const englishLike = queryWords.length >= 2 && !generic && !looksIndonesian(query);
    const related = overlapsVocab(query, vocab);
    if (englishLike && (related || (style === "lifestyle" && terms.length === 0))) {
      return clean(related ? query : `${english} ${query}`);
    }
    if (terms.length) return clean(terms[idx % terms.length]);
    const angles = SEARCH_ANGLES[style];
    const base = `${english} ${angles[idx % angles.length]}`;
    return clean(style === "engineering" && !DIAGRAM_HINT.test(base) ? `${base} cutaway diagram` : base);
  }

  const core = topicCore(topic);
  const lower = query.toLowerCase();
  const trusted =
    core.length === 0 || core.some((word) => lower.includes(word)) || DIAGRAM_HINT.test(query);
  let out = trusted ? query : `${core.join(" ")} ${query}`;
  if (style === "engineering" && !DIAGRAM_HINT.test(out)) out = `${out} cutaway diagram`;
  return clean(out);
}
