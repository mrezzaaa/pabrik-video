import { z } from "zod";

/**
 * ObjectModel: satu benda/sistem utama topik, dideskripsikan sebagai bagian
 * 3D sederhana. Dipakai bersama oleh planner (memilih shot) dan renderer
 * Remotion (engine isometrik SVG). Koordinat ternormalisasi -100..100,
 * sumbu z = atas.
 */

const num = z.coerce.number().catch(0);
const vec = z.object({ x: num, y: num, z: num });

export const PART_SHAPES = ["box", "hollowBox", "cylinder", "cone", "sphere", "lathe", "tube", "ring"] as const;
export type PartShape = (typeof PART_SHAPES)[number];

export const objectPartSchema = z
  .object({
    id: z.string().min(1).max(40),
    /** Label layar 1-3 kata, huruf besar, bahasa Indonesia. */
    label: z.string().max(40).optional(),
    name: z.string().max(40).optional(),
    title: z.string().max(40).optional(),
    shape: z.enum(PART_SHAPES).catch("box"),
    /** Pusat dasar bagian (box: pusat alas; cylinder/cone/lathe: pusat alas). */
    position: vec.default({ x: 0, y: 0, z: 0 }),
    /** box: lebar(x) dalam(y) tinggi(z). cylinder/cone/sphere: x = radius, z = tinggi. */
    size: vec.default({ x: 20, y: 20, z: 20 }),
    /** lathe: profil {r,z} dari bawah ke atas. */
    profile: z.array(z.object({ r: num, z: num })).max(24).optional(),
    /** tube: titik-titik jalur 3D. */
    path: z.array(vec).max(24).optional(),
    color: z.string().max(16).optional(),
    /** Dipotong agar bagian dalam terlihat. */
    cutaway: z.boolean().optional().default(false),
    /** Bagian dalam (hanya kelihatan saat cutaway/explode). */
    inner: z.boolean().optional().default(false),
    /** Arah gerak saat explode (unit kira-kira). */
    explode: vec.optional(),
    /** Animasi bagian. */
    motion: z.enum(["none", "spin", "pulse", "bob"]).optional().default("none"),
  })
  .transform((p) => ({
    ...p,
    label: (p.label || p.name || p.title || p.id).slice(0, 32),
  }));
export type ObjectPart = z.infer<typeof objectPartSchema>;

export const objectFlowSchema = z
  .object({
    id: z.string().max(40).optional().default("main-flow"),
    label: z.string().max(40).optional(),
    name: z.string().max(40).optional(),
    /** Urutan id bagian yang dilewati aliran. */
    through: z.array(z.string()).min(2).max(10),
    medium: z
      .enum(["spark", "water", "air", "heat", "light", "particle", "money", "people"])
      .catch("particle"),
    color: z.string().max(16).optional(),
  })
  .transform((f) => ({
    ...f,
    label: (f.label || f.name || f.id || "ALUR").slice(0, 32),
  }));
export type ObjectFlow = z.infer<typeof objectFlowSchema>;

export const objectModelSchema = z
  .object({
    subject: z.string().max(80).optional(),
    title: z.string().max(80).optional(),
    name: z.string().max(80).optional(),
    parts: z.array(objectPartSchema).min(2).max(14),
    flows: z.array(objectFlowSchema).max(4).optional().default([]),
    /** 2-5 tahap proses, label 1-3 kata. */
    steps: z.array(z.string().max(40)).max(6).optional().default([]),
  })
  .transform((m) => ({
    ...m,
    subject: (m.subject || m.title || m.name || "SISTEM").slice(0, 80),
  }));
export type ObjectModel = z.infer<typeof objectModelSchema>;

export const EXPLAINER_TYPES = ["ISO_ASSEMBLY", "MECHANISM_FLOW", "BLUEPRINT"] as const;
export type ExplainerType = (typeof EXPLAINER_TYPES)[number];

/** Instruksi kamera/tampilan untuk satu scene explainer. */
export interface ExplainerShot {
  /** Bagian yang disorot (lainnya diredupkan). Kosong = seluruh benda. */
  focus: string[];
  /** 0..1 seberapa jauh dinding luar dipotong. */
  cutaway: number;
  /** 0..1 seberapa jauh bagian dipisah (exploded view). */
  explode: number;
  /** Zoom kamera (1 = seluruh benda pas layar). */
  zoom: number;
  /** Aliran yang dianimasikan (MECHANISM_FLOW). */
  flowId?: string;
  /** Indeks tahap proses yang aktif. */
  step?: number;
  /** Label yang ditampilkan. */
  labels: "focus" | "all" | "none";
  /** Sudut awal putar kamera (derajat). */
  yaw: number;
}

const PALETTE = ["#4FC3F7", "#FFB74D", "#81C784", "#E57373", "#BA68C8", "#FFD54F", "#4DB6AC", "#90A4AE"];

/**
 * Rapikan model dari LLM: id unik, ukuran masuk akal, flow hanya merujuk
 * bagian yang ada, warna default. Mengembalikan null kalau tidak layak.
 */
export function sanitizeModel(raw: ObjectModel): ObjectModel | null {
  const seen = new Set<string>();
  const clampN = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 0));
  const parts = raw.parts
    .map((part, index) => {
      let id = part.id.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || `part-${index}`;
      while (seen.has(id)) id = `${id}-${index}`;
      seen.add(id);
      const size = {
        x: clampN(Math.abs(part.size.x) || 20, 2, 120),
        y: clampN(Math.abs(part.size.y) || Math.abs(part.size.x) || 20, 2, 120),
        z: clampN(Math.abs(part.size.z) || 20, 1, 200),
      };
      return {
        ...part,
        id,
        label: part.label.toUpperCase().replace(/\s+/g, " ").trim().slice(0, 28),
        position: {
          x: clampN(part.position.x, -110, 110),
          y: clampN(part.position.y, -110, 110),
          z: clampN(part.position.z, -60, 200),
        },
        size,
        color: /^#[0-9a-f]{3,8}$/i.test(part.color ?? "") ? part.color : PALETTE[index % PALETTE.length],
        profile: part.profile?.filter((p) => Number.isFinite(p.r) && Number.isFinite(p.z)),
        path: part.path?.filter((p) => Number.isFinite(p.x + p.y + p.z)),
      } satisfies ObjectPart;
    })
    .filter((part) => part.shape !== "tube" || (part.path?.length ?? 0) >= 2);

  if (parts.length < 2) return null;
  const ids = new Set(parts.map((p) => p.id));
  const remap = new Map(raw.parts.map((p, i) => [p.id, parts[i]?.id ?? p.id]));
  const flows = (raw.flows ?? [])
    .map((flow) => ({
      ...flow,
      label: flow.label.toUpperCase().slice(0, 28),
      through: flow.through.map((id) => remap.get(id) ?? id).filter((id) => ids.has(id)),
    }))
    .filter((flow) => flow.through.length >= 2);

  return {
    subject: raw.subject,
    parts,
    flows,
    steps: (raw.steps ?? []).map((s) => s.toUpperCase().slice(0, 28)).filter(Boolean).slice(0, 5),
  };
}

/** Model cadangan generik (tanpa LLM): rumah/wadah + inti + aliran. */
export function genericModel(subject: string, labels: string[]): ObjectModel {
  const names = labels.length >= 3 ? labels.slice(0, 5) : ["RANGKA", "INTI", "KELUARAN"];
  const parts: ObjectPart[] = [
    {
      id: "shell",
      label: names[0],
      shape: "hollowBox",
      position: { x: 0, y: 0, z: 0 },
      size: { x: 90, y: 90, z: 70 },
      cutaway: true,
      inner: false,
      motion: "none",
      color: "#90A4AE",
      explode: { x: 0, y: 0, z: 0 },
    },
    ...names.slice(1).map((label, i) => ({
      id: `p${i + 1}`,
      label,
      shape: (i % 2 === 0 ? "cylinder" : "box") as PartShape,
      position: { x: -25 + i * 22, y: -10 + (i % 2) * 20, z: 4 },
      size: { x: 12, y: 12, z: 26 + i * 6 },
      cutaway: false,
      inner: true,
      motion: (i === 0 ? "pulse" : "none") as ObjectPart["motion"],
      color: PALETTE[(i + 1) % PALETTE.length],
      explode: { x: 0, y: 0, z: 30 + i * 12 },
    })),
  ];
  return {
    subject,
    parts,
    flows: parts.length >= 3 ? [{ id: "flow", label: "ALIRAN", through: parts.slice(1).map((p) => p.id), medium: "particle" }] : [],
    steps: names.slice(1, 5),
  };
}

