import { z } from "zod";
import { chatJSON } from "../omniroute";
import type { TopicStyle } from "../types";
import { listSkills } from "./registry";
import { grammarForSkill } from "./visual-grammar";

/**
 * Router skill: memilih skill TAMBAHAN yang relevan dengan topik.
 * Skill dasar per peran sudah tetap (lihat playbook.ts); router menambah
 * maksimal 3 skill. Skill explainer (motion-figure, blueprint-figure,
 * isometric-explainer, course-style) juga mengubah tata bahasa visual lewat
 * visual-grammar.ts, bukan hanya menambah teks prompt.
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
    id: "motion-figure",
    hint: /siklus|proses|tahap|urutan|aliran|arus|mengalir|bergerak|berputar|angin|laut|cuaca|iklim|hujan|musim|suhu|panas|uap|sirkulasi|reaksi|rantai|perjalanan|tumbuh|meleleh|membeku|el\s?nino|la\s?nina|flow|cycle/i,
  },
  {
    id: "blueprint-figure",
    hint: /struktur|bagian|lapisan|komponen|rangka|potongan|mesin|konstruksi|jembatan|gedung|anatomi|organ|tubuh|sel|atom|bumi|gunung|danau|waduk|pesawat|roket|turbin|baterai|panel|kabel|pipa|pompa|blueprint/i,
  },
  {
    id: "isometric-explainer",
    hint: /cara kerja|mekanisme|sistem|pabrik|perakitan|produksi|pembuatan|stasiun|dapur|terminal|bandara|instalasi|rakitan|assembly/i,
  },
  {
    id: "course-style",
    hint: /cara|panduan|tutorial|dasar|pemula|langkah|tips|belajar|sekolah|kuliah|pelajaran|istilah|pengertian/i,
  },
  {
    id: "marketing-skills/video",
    hint: /film|sinematik|konten|reels|tiktok|youtube|shorts|dokumenter|video/i,
  },
  {
    id: "marketing-skills/image",
    hint: /foto|gambar|visual|desain|warna|komposisi|poster|sampul/i,
  },
  {
    id: "marketing-skills/social",
    hint: /viral|trending|fyp|tagar|hashtag|komentar|penonton|followers|engagement/i,
  },
  {
    id: "marketing-skills/ad-creative",
    hint: /iklan|promo|jualan|produk|brand|merek|kampanye|disk?on|penawaran/i,
  },
  {
    id: "marketing-skills/marketing-psychology",
    hint: /otak|psikolog|kebiasaan|belanja|uang|keputusan|bias|emosi|motivasi|stres|perilaku|malas|fokus|kecanduan|takut|ingin|butuh|brain|habit/i,
  },
  {
    id: "marketing-skills/pricing",
    hint: /harga|tarif|langganan|murah|mahal|gaji|cicilan|bayar|biaya|pendapatan|price|discount/i,
    styles: ["lifestyle", "factcheck"],
  },
  {
    id: "marketing-skills/public-relations",
    hint: /berita|isu|kontroversi|kritik|wawancara|pernyataan|kebijakan|pemerintah|presiden|menteri/i,
    styles: ["factcheck"],
  },
  {
    id: "marketing-skills/customer-research",
    hint: /survei|responden|riset|data|statistik|persen|penelitian|studi|jajak/i,
    styles: ["factcheck"],
  },
  {
    id: "marketing-skills/content-strategy",
    hint: /seri|serial|bagian 2|part 2|rangkaian|edukasi|kanal/i,
  },
];

const MAX_EXTRA = 3;

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

  // Skill explainer dulu supaya grammar visual yang dipakai adalah yang paling
  // konkret, baru skill pendukung (copy/psikologi/pacing).
  for (const item of ROUTABLE_SKILLS) {
    if (item.styles && !item.styles.includes(input.style)) continue;
    if (!item.hint.test(text)) continue;
    extra.push(item.id);
    reasons[item.id] = "kata kunci topik";
    if (extra.length >= MAX_EXTRA) break;
  }

  // Topik apa pun tetap butuh satu skill yang mengatur cara bercerita secara visual.
  if (extra.length === 0) {
    const fallback =
      input.style === "engineering"
        ? "blueprint-figure"
        : input.style === "lifestyle"
          ? "marketing-skills/image"
          : "motion-figure";
    extra.push(fallback);
    reasons[fallback] = "fallback gaya video";
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
  if (candidates.length === 0) return heuristicRoute(input);

  const listing = candidates
    .map((item) => {
      const skill = catalog.find((entry) => entry.id === item.id);
      const visual = grammarForSkill(item.id);
      return `- ${item.id}: ${(skill?.description ?? "").slice(0, 200)}${
        visual ? ` [visual: ${visual.label}]` : ""
      }`;
    })
    .join("\n");

  try {
    const result = await chatJSON({
      system: `Kamu memilih skill tambahan untuk produksi video pendek Indonesia.
Pilih 1 sampai ${MAX_EXTRA} skill dari daftar yang BENAR-BENAR membantu topik ini.
WAJIB pilih minimal satu skill yang mengatur visual (bertanda [visual: ...]) bila topik menjelaskan proses, struktur, atau mekanisme.
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

    if (extra.length === 0) {
      console.warn("[skills] router LLM tidak memilih apa pun, memakai heuristik.");
      return heuristicRoute(input);
    }

    // Pastikan selalu ada skill visual, walau LLM hanya memilih skill copy.
    if (!extra.some((id) => grammarForSkill(id))) {
      const visual = heuristicRoute(input).extra.find((id) => grammarForSkill(id));
      if (visual && !extra.includes(visual)) extra.unshift(visual);
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
