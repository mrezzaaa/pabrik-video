import type { TopicStyle } from "../types";
import {
  condenseMarkdown,
  extractSections,
  getSkill,
  readSkillMarkdown,
} from "./registry";

/**
 * Playbook = potongan skill yang disuntikkan ke prompt satu agent.
 * Setiap peran (hook, narasi, CTA, grounding, visual, kritik) punya sumber dasar;
 * gaya topik (engineering / factcheck / lifestyle) mengubah sumber visual;
 * router (router.ts) boleh menambah skill ekstra sesuai topik.
 */

export type SkillRole =
  | "hook"
  | "narration"
  | "cta"
  | "grounding"
  | "visual"
  | "critic";

export interface SkillSource {
  skill: string;
  file?: string;
  sections?: (string | RegExp)[];
  maxChars: number;
}

const SPECS: SkillSource = {
  skill: "marketing-skills/ad-creative",
  file: "references/short-form-video-specs.md",
  sections: ["Safe zones", "Caption style"],
  maxChars: 1400,
};

export function baseSources(role: SkillRole, style: TopicStyle): SkillSource[] {
  switch (role) {
    case "hook":
      return [
        { skill: "pabrik/reels-hook-3s", maxChars: 3400 },
        {
          skill: "marketing-skills/ad-creative",
          file: "references/hook-system.md",
          sections: ["Three Components", "Hook Opening Moves", "Common Failure"],
          maxChars: 2600,
        },
        {
          skill: "marketing-skills/social",
          file: "references/short-form-video.md",
          sections: ["Video Hook Library"],
          maxChars: 1600,
        },
        {
          skill: "marketing-skills/marketing-psychology",
          sections: ["Zeigarnik", "Peak-End"],
          maxChars: 900,
        },
      ];
    case "narration":
      return [
        { skill: "pabrik/reels-narasi-tts", maxChars: 3600 },
        {
          skill: "marketing-skills/copywriting",
          file: "references/ai-tells.md",
          sections: [
            "contrast reveal",
            "negation list",
            "trailing pile-on",
            "Rhetorical question",
            "Fragment drumbeat",
            "Uniform rhythm",
          ],
          maxChars: 2400,
        },
        {
          skill: "marketing-skills/copywriting",
          file: "references/natural-transitions.md",
          sections: ["Best Practice"],
          maxChars: 900,
        },
      ];
    case "cta":
      return [
        { skill: "pabrik/reels-cta-natural", maxChars: 2800 },
      ];
    case "grounding":
      return [
        { skill: "pabrik/reels-grounding", maxChars: 2600 },
        {
          skill: "marketing-skills/ad-creative",
          file: "references/hook-system.md",
          sections: ["Grounding Rules"],
          maxChars: 900,
        },
      ];
    case "critic":
      return [
        {
          skill: "pabrik/reels-hook-3s",
          sections: ["Cek akhir"],
          maxChars: 700,
        },
        {
          skill: "pabrik/reels-grounding",
          sections: ["Cek sebelum selesai"],
          maxChars: 600,
        },
        {
          skill: "marketing-skills/copy-editing",
          sections: ["Sweep 3: So What", "Sweep 5: Specificity", "AI-Tell Check"],
          maxChars: 2400,
        },
      ];
    case "visual": {
      const explainerCore: SkillSource[] = [
        {
          skill: "blueprint-figure",
          file: "references/kinds.md",
          sections: ["nine figure kinds"],
          maxChars: 1100,
        },
        {
          skill: "isometric-explainer",
          sections: ["Method"],
          maxChars: 1000,
        },
        {
          skill: "motion-figure",
          sections: ["Method"],
          maxChars: 900,
        },
      ];
      if (style === "engineering") {
        return [{ skill: "pabrik/reels-visual-engineering", maxChars: 3200 }, ...explainerCore];
      }
      if (style === "lifestyle") {
        return [{ skill: "pabrik/reels-visual-lifestyle", maxChars: 2400 }, ...explainerCore, SPECS];
      }
      return [{ skill: "pabrik/reels-visual-factcheck", maxChars: 2600 }, ...explainerCore, SPECS];
    }
  }
}

const MAX_TOTAL_CHARS = 11_000;

/** Skill tambahan dari router hanya masuk ke peran yang masuk akal untuknya. */
const EXTRA_SKILL_ROLES: Record<string, SkillRole[]> = {
  "marketing-skills/marketing-psychology": ["hook", "narration"],
  "marketing-skills/pricing": ["narration"],
  "marketing-skills/content-strategy": ["cta"],
  "marketing-skills/social": ["hook", "visual"],
  "marketing-skills/video": ["hook", "visual"],
  "marketing-skills/image": ["visual"],
  "marketing-skills/public-relations": ["grounding", "narration"],
  "marketing-skills/customer-research": ["grounding"],
  "motion-figure": ["visual"],
  "blueprint-figure": ["visual"],
  "isometric-explainer": ["visual"],
  "course-style": ["visual"],
};

async function renderSource(source: SkillSource): Promise<string> {
  const skill = await getSkill(source.skill);
  if (!skill) return "";

  let md = await readSkillMarkdown(source.skill, source.file);
  if (!md) return "";
  if (source.sections?.length) {
    md = extractSections(md, source.sections);
    if (!md) return "";
  }
  const body = condenseMarkdown(md, source.maxChars);
  const label = source.file ? `${skill.name} / ${source.file}` : skill.name;
  return `### SKILL: ${label}\n${body}`;
}

export interface Playbook {
  role: SkillRole;
  /** Teks siap tempel ke prompt (kosong bila tidak ada skill yang terbaca). */
  text: string;
  /** Id skill yang benar-benar terbaca. */
  used: string[];
}

export async function buildPlaybook(
  role: SkillRole,
  style: TopicStyle,
  extraSkills: string[] = [],
): Promise<Playbook> {
  const sources = [...baseSources(role, style)];
  for (const id of extraSkills) {
    if (!(EXTRA_SKILL_ROLES[id] ?? []).includes(role)) continue;
    if (!sources.some((source) => source.skill === id)) {
      sources.push({ skill: id, maxChars: 1600 });
    }
  }

  const parts: string[] = [];
  const used: string[] = [];
  let total = 0;
  for (const source of sources) {
    const rendered = await renderSource(source);
    if (!rendered) continue;
    if (total + rendered.length > MAX_TOTAL_CHARS) break;
    parts.push(rendered);
    total += rendered.length;
    if (!used.includes(source.skill)) used.push(source.skill);
  }

  return {
    role,
    text: parts.length
      ? `PLAYBOOK SKILL (${role}). Ikuti aturan ini; bila bertentangan dengan fakta riset, fakta riset yang menang.\n\n${parts.join("\n\n")}`
      : "",
    used,
  };
}

/** Ringkasan skill yang dipakai per peran, untuk disimpan/ditampilkan. */
export async function skillTrace(
  style: TopicStyle,
  extraSkills: string[],
): Promise<Record<SkillRole, string[]>> {
  const roles: SkillRole[] = ["hook", "narration", "cta", "grounding", "visual", "critic"];
  const entries = await Promise.all(
    roles.map(async (role) => [role, (await buildPlaybook(role, style, extraSkills)).used] as const),
  );
  return Object.fromEntries(entries) as Record<SkillRole, string[]>;
}
