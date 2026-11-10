import { z } from "zod";
import { chatJSON } from "../omniroute";
import type { TopicStyle } from "../types";
import { listSkills } from "./registry";

/**
 * Router skill: memilih skill TAMBAHAN yang relevan dengan topik.
 * Skill dasar per peran sudah tetap (lihat playbook.ts); router hanya menambah
 * maksimal 2 skill dari daftar yang memang relevan untuk produksi video.
 */

interface Routable {
  id: string;
  /** Kata kunci topik (bahasa Indonesia/Inggris) yang memicu skill ini saat LLM router gagal. */
  hint: RegExp;
  /** Hanya relevan untuk gaya tertentu; kosong = semua gaya. */
  styles?: TopicStyle[];
}

export const ROUTABLE_SKILLS: Routable[] = [
  {
    id: "marketing-skills/marketing-psychology",
    hint: /otak|psikolog|kebiasaan|belanja|uang|keputusan|bias|emosi|motivasi|stres|perilaku|malas|fokus|kecanduan|brain|habit/i,
  },
  {
    id: "marketing-skills/pricing",
    hint: /harga|diskon|tarif|langganan|promo|murah|mahal|gaji|cicilan|bayar|price|discount/i,
    styles: ["lifestyle", "factcheck"],
  },
  {
    id: "marketing-skills/content-strategy",
    hint: /seri|serial|bagian 2|part 2|rangkaian|edukasi/i,
  },
  {
    id: "motion-figure",
    hint: /aliran|proses|siklus|tahap|urutan|bergerak|berputar|mengalir|reaksi|flow|cycle/i,
    styles: ["engineering"],
  },
  {
    id: "isometric-explainer",
    hint: /mesin|komponen|rakitan|perangkat|struktur|bagian dalam|mekanisme|assembly/i,
    styles: ["engineering"],
  },
];

const MAX_EXTRA = 2;

export interface SkillRoute {
  extra: string[];
  reasons: Record<string, string>;
  source: "llm" | "heuristic";
}

const routeSchema = z.object({
  picks: z
    .array(
      z.object({
        id: z.string(),
        why: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
});

export function heuristicRoute(input: {
  topic: string;
  facts?: string[];
  style: TopicStyle;
}): SkillRoute {
  const text = `${input.topic} ${input.topic} ${(input.facts ?? []).slice(0, 4).join(" ")}`;
  const extra: string[] = [];
  const reasons: Record<string, string> = {};
  for (const item of ROUTABLE_SKILLS) {
    if (item.styles && !item.styles.includes(input.style)) continue;
    if (item.hint.test(text)) {
      extra.push(item.id);
      reasons[item.id] = "kata kunci topik";
    }
    if (extra.length >= MAX_EXTRA) break;
  }
  return { extra, reasons, source: "heuristic" };
}

export async function routeSkills(input: {
  topic: string;
  facts?: string[];
  style: TopicStyle;
  modelOverride?: string | null;
}): Promise<SkillRoute> {
  const catalog = await listSkills();
  const candidates = ROUTABLE_SKILLS.filter(
    (item) =>
      (!item.styles || item.styles.includes(input.style)) &&
      catalog.some((skill) => skill.id === item.id),
  );
  if (candidates.length === 0) return { extra: [], reasons: {}, source: "heuristic" };

  const listing = candidates
    .map((item) => {
      const skill = catalog.find((entry) => entry.id === item.id);
      return `- ${item.id}: ${(skill?.description ?? "").slice(0, 220)}`;
    })
    .join("\n");

  try {
    const result = await chatJSON({
      system: `Kamu memilih skill tambahan untuk produksi video pendek Indonesia.
Pilih 0 sampai ${MAX_EXTRA} skill dari daftar yang BENAR-BENAR membantu topik ini. Pilih 0 bila tidak ada yang jelas relevan.
Kembalikan HANYA JSON: { "picks": [ { "id": "<id persis dari daftar>", "why": "satu kalimat" } ] }`,
      user: `TOPIK: ${input.topic}
GAYA: ${input.style}
FAKTA AWAL: ${(input.facts ?? []).slice(0, 3).map((fact) => fact.slice(0, 160)).join(" | ") || "-"}

DAFTAR SKILL:
${listing}`,
      schema: routeSchema,
      tier: "fast",
      modelOverride: input.modelOverride,
      temperature: 0.1,
      maxTokens: 500,
      retries: 1,
    });

    const allowed = new Set(candidates.map((item) => item.id));
    const extra: string[] = [];
    const reasons: Record<string, string> = {};
    for (const pick of result.picks) {
      if (!allowed.has(pick.id) || extra.includes(pick.id)) continue;
      extra.push(pick.id);
      reasons[pick.id] = pick.why || "dipilih router";
      if (extra.length >= MAX_EXTRA) break;
    }
    return { extra, reasons, source: "llm" };
  } catch (error) {
    console.warn(
      "[skills] router LLM gagal, memakai heuristik:",
      error instanceof Error ? error.message : error,
    );
    return heuristicRoute(input);
  }
}
