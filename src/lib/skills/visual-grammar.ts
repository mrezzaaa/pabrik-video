import type { TopicStyle, VisualType } from "../types";

/**
 * Tata bahasa visual per skill.
 *
 * Skill di `src/skills/**` sebagian besar berupa panduan menulis/menggambar,
 * bukan kode. Supaya skill benar-benar mengubah video, setiap skill yang
 * relevan dipetakan ke keputusan render yang konkret: jenis stage, panjang
 * potongan, warna/grading foto, dan overlay grid. Router memilih skill,
 * modul ini menerjemahkannya menjadi aturan yang dipakai visual planner dan
 * renderer.
 */

export type PhotoGrade = "documentary" | "cold" | "warm" | "hard";
export type MotionBias = "drift" | "push" | "handheld";

export interface VisualGrammar {
  /** Skill id yang menjadi sumber aturan. */
  id: string;
  /** Nama pendek untuk UI/log. */
  label: string;
  /** Satu kalimat aturan yang ikut masuk ke prompt visual director. */
  principle: string;
  /** Urutan jenis stage yang diutamakan untuk scene penjelasan. */
  preferred: VisualType[];
  /** Jumlah minimal scene penjelasan (grafik data) di seluruh video. */
  minExplainerScenes: number;
  /** Batas panjang satu potongan (detik). */
  maxSceneSeconds: number;
  /** Overlay grid tipis khas blueprint/technical drawing. */
  grid: boolean;
  grade: PhotoGrade;
  motionBias: MotionBias;
}

const DEFAULTS: Record<TopicStyle, VisualGrammar> = {
  engineering: {
    id: "pabrik/reels-visual-engineering",
    label: "TECHNICAL",
    principle:
      "Jelaskan mekanisme sebagai rakitan 3D isometrik cutaway, aliran partikel (MECHANISM_FLOW), dan blueprint berdimensi dengan callout menempel pada komponen.",
    preferred: [
      "ISO_ASSEMBLY",
      "MECHANISM_FLOW",
      "BLUEPRINT",
      "SVG_CROSSSECTION",
      "SVG_TIMELINE",
      "SVG_GAUGE",
      "SVG_COUNTER",
    ],
    minExplainerScenes: 12,
    maxSceneSeconds: 2.4,
    grid: true,
    grade: "cold",
    motionBias: "push",
  },
  factcheck: {
    id: "pabrik/reels-visual-factcheck",
    label: "EDITORIAL",
    principle:
      "Setiap klaim wajib punya visual penjelas: model isometrik/mekanisme, pembanding dua sisi, urutan sebab-akibat, atau metrik terukur.",
    preferred: [
      "ISO_ASSEMBLY",
      "SVG_COMPARE",
      "MECHANISM_FLOW",
      "BLUEPRINT",
      "SVG_TIMELINE",
      "SVG_COUNTER",
      "SVG_GAUGE",
    ],
    minExplainerScenes: 10,
    maxSceneSeconds: 2.5,
    grid: true,
    grade: "documentary",
    motionBias: "drift",
  },
  lifestyle: {
    id: "pabrik/reels-visual-lifestyle",
    label: "EXPLAINER",
    principle:
      "Gunakan visual penjelas (isometrik, alur mekanisme, timeline, potongan) sebagai tulang punggung cerita; foto nyata hanya sebagai pelengkap bukti.",
    preferred: [
      "ISO_ASSEMBLY",
      "MECHANISM_FLOW",
      "SVG_TIMELINE",
      "SVG_CROSSSECTION",
      "BLUEPRINT",
      "SVG_COMPARE",
      "SVG_COUNTER",
    ],
    minExplainerScenes: 10,
    maxSceneSeconds: 2.3,
    grid: true,
    grade: "warm",
    motionBias: "drift",
  },
};

/** Skill explainer dari paket blueprint-figure / motion-figure / isometric-explainer. */
const SKILL_GRAMMAR: Record<string, Partial<VisualGrammar> & { label: string }> = {
  "blueprint-figure": {
    label: "BLUEPRINT",
    principle:
      "Gambar seperti blueprint: satu objek besar, garis kerja teknis, potongan melintang, dimensi, dan callout bernomor di luar bentuk.",
    preferred: ["BLUEPRINT", "ISO_ASSEMBLY", "SVG_CROSSSECTION", "MECHANISM_FLOW", "SVG_COMPARE"],
    minExplainerScenes: 12,
    maxSceneSeconds: 2.5,
    grid: true,
    grade: "cold",
    motionBias: "push",
  },
  "motion-figure": {
    label: "MOTION",
    principle:
      "Tunjukkan proses bergerak: partikel/aliran mengalir melewati komponen (MECHANISM_FLOW) dengan tahapan aktif yang berurutan.",
    preferred: ["MECHANISM_FLOW", "ISO_ASSEMBLY", "SVG_TIMELINE", "BLUEPRINT", "SVG_COMPARE"],
    minExplainerScenes: 12,
    maxSceneSeconds: 2.3,
    grid: true,
    grade: "cold",
    motionBias: "drift",
  },
  "isometric-explainer": {
    label: "ISOMETRIC",
    principle:
      "Bangun satu mesin/objek isometrik 3D: bedah bagian luar (cutaway), pisahkan rakitan (exploded view), sorot tiap komponen, dan alirkan prosesnya.",
    preferred: ["ISO_ASSEMBLY", "MECHANISM_FLOW", "BLUEPRINT", "SVG_CROSSSECTION", "SVG_TIMELINE"],
    minExplainerScenes: 12,
    maxSceneSeconds: 2.4,
    grid: true,
    grade: "documentary",
    motionBias: "push",
  },
  "course-style": {
    label: "COURSE",
    principle:
      "Satu ide per layar, label huruf besar, angka besar, tanpa hiasan yang mengalihkan perhatian.",
    preferred: ["SVG_COUNTER", "SVG_BAR_CHART", "SVG_GAUGE"],
    minExplainerScenes: 2,
    maxSceneSeconds: 2.6,
    grid: false,
    grade: "documentary",
    motionBias: "drift",
  },
  "marketing-skills/video": {
    label: "FILM",
    principle:
      "Potongan pendek 1.5-2 detik, satu subjek per frame, gerak kamera pelan, teks di layar seminimal mungkin.",
    preferred: ["B_ROLL_IMAGE"],
    minExplainerScenes: 0,
    maxSceneSeconds: 1.9,
    grid: false,
    grade: "hard",
    motionBias: "handheld",
  },
  "marketing-skills/social": {
    label: "SOCIAL",
    principle:
      "Ritme cepat ala short-form: ganti visual sebelum penonton bosan, pertahankan satu fokus per potongan.",
    preferred: ["B_ROLL_IMAGE"],
    minExplainerScenes: 1,
    maxSceneSeconds: 2.0,
    grid: false,
    grade: "hard",
    motionBias: "handheld",
  },
  "marketing-skills/image": {
    label: "PHOTO",
    principle:
      "Foto adalah bintang: komposisi bersih, subjek jelas, warna hangat, teks layar tidak menutupi subjek.",
    preferred: ["B_ROLL_IMAGE"],
    minExplainerScenes: 0,
    maxSceneSeconds: 2.1,
    grid: false,
    grade: "warm",
    motionBias: "drift",
  },
  "marketing-skills/ad-creative": {
    label: "AD",
    principle:
      "Hook harus terbaca dalam satu detik; setelah itu setiap potongan membawa satu ide baru.",
    preferred: ["B_ROLL_IMAGE", "SVG_COUNTER"],
    minExplainerScenes: 1,
    maxSceneSeconds: 1.9,
    grid: false,
    grade: "hard",
    motionBias: "handheld",
  },
};

export function grammarForSkill(id: string): Partial<VisualGrammar> | null {
  return SKILL_GRAMMAR[id] ?? null;
}

/**
 * Gabungkan skill terpilih menjadi satu grammar. Skill pertama yang punya
 * pemetaan menjadi sumber utama (label + grade), sedangkan batas pacing dan
 * overlay diambil yang paling ketat supaya semua aturan terhormat.
 */
export function visualGrammarFor(
  extraSkills: string[],
  style: TopicStyle,
): VisualGrammar {
  const base = { ...DEFAULTS[style] };
  const mapped = extraSkills
    .map((id) => SKILL_GRAMMAR[id])
    .filter(Boolean) as Array<Partial<VisualGrammar> & { label: string }>;

  if (mapped.length === 0) return base;

  const primary = mapped[0];
  const preferred: VisualType[] = [];
  for (const grammar of [primary, ...mapped.slice(1), base]) {
    for (const type of grammar.preferred ?? []) {
      if (!preferred.includes(type)) preferred.push(type);
    }
  }

  return {
    id: extraSkills.find((id) => SKILL_GRAMMAR[id]) ?? base.id,
    label: primary.label,
    principle: mapped
      .map((grammar) => grammar.principle)
      .filter(Boolean)
      .join(" "),
    preferred,
    minExplainerScenes: Math.max(
      base.minExplainerScenes,
      ...mapped.map((grammar) => grammar.minExplainerScenes ?? 0),
    ),
    maxSceneSeconds: Math.min(
      base.maxSceneSeconds,
      ...mapped.map((grammar) => grammar.maxSceneSeconds ?? base.maxSceneSeconds),
    ),
    grid: mapped.some((grammar) => grammar.grid) || base.grid,
    grade: primary.grade ?? base.grade,
    motionBias: primary.motionBias ?? base.motionBias,
  };
}

/** Potongan teks untuk prompt LLM; bukan satu-satunya pengaruh skill. */
export function grammarBrief(grammar: VisualGrammar, skills: string[]): string {
  return [
    `ATURAN VISUAL DARI SKILL (${grammar.label}): ${grammar.principle}`,
    `- Stage penjelasan yang diutamakan (urut): ${grammar.preferred.join(" > ")}`,
    `- Minimal ${grammar.minExplainerScenes} scene penjelasan berisi angka/diagram di seluruh video.`,
    `- Maksimal ${grammar.maxSceneSeconds.toFixed(1)} detik per potongan visual.`,
    grammar.grid ? "- Gunakan gaya gambar teknis (garis tipis, label di luar bentuk)." : "",
    skills.length ? `- Skill terpilih: ${skills.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
