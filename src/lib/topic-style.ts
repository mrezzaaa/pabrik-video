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
  /\b(cara kerja|mesin|turbin|turbofan|jet|pesawat|roket|baterai|reaktor|nuklir|sirkuit|chip|prosesor|semikonduktor|transistor|generator|pompa|kompresor|hidrolik|bendungan|jembatan|struktur|rekayasa|engineering|mekanisme|komponen|rangkaian|sensor|satelit|mobil listrik|motor listrik|kapal selam|tsunami|gempa|gunung berapi|dna|atom|sel|organ|jantung|otak|tata surya|lubang hitam)\b/gi;
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

export async function classifyTopicStyle(input: {
  topic: string;
  facts: string[];
  modelOverride?: string | null;
}): Promise<{ style: TopicStyle; source: "llm" | "heuristic" }> {
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
      maxTokens: 200,
      retries: 1,
    });
    return { style: result.style, source: "llm" };
  } catch (error) {
    console.warn(
      "[topic-style] LLM gagal, memakai heuristik kata kunci:",
      error instanceof Error ? error.message : error,
    );
    return {
      style: heuristicTopicStyle(input.topic, input.facts),
      source: "heuristic",
    };
  }
}
