import { z } from "zod";
import { partHalfExtents, sceneBounds } from "../remotion/tech3d/geometry";
import type {
  AssemblyDef,
  AssemblyPart,
  PartKind,
  PartSpec,
  Vec3,
} from "../remotion/tech3d/types";

/**
 * Normalizer untuk assembly yang dirancang LLM.
 * LLM hanya mengisi DATA (kind + parameter + posisi + arah bongkar). Semua yang
 * rawan salah dihitung di sini: batas ukuran, skala objek, jarak exploded tanpa tumpang tindih.
 */

export const GEN_KINDS: PartKind[] = ["cylinder", "tube", "box", "gear", "cone"];
export const MIN_PARTS = 4;
export const MAX_PARTS = 12;

interface NumSpec {
  min: number;
  max: number;
  def?: number; // tanpa def = wajib diisi
}

const PARAM_SPECS: Record<PartKind, Record<string, NumSpec>> = {
  cylinder: { r: { min: 0.03, max: 2.3 }, h: { min: 0.03, max: 6 } },
  tube: {
    rOuter: { min: 0.1, max: 2.3 },
    rInner: { min: 0.03, max: 2.27 },
    h: { min: 0.05, max: 6 },
  },
  box: {
    w: { min: 0.03, max: 4 },
    h: { min: 0.03, max: 6 },
    d: { min: 0.03, max: 4 },
  },
  gear: {
    rOuter: { min: 0.2, max: 2.3 },
    rRoot: { min: 0.1, max: 2.2 },
    teeth: { min: 6, max: 40, def: 14 },
    depth: { min: 0.05, max: 1, def: 0.2 },
    hole: { min: 0.05, max: 1.5, def: 0.2 },
  },
  cone: {
    rTop: { min: 0.02, max: 2.3 },
    rBottom: { min: 0.02, max: 2.3 },
    h: { min: 0.05, max: 6 },
  },
};

const RawPartSchema = z.object({
  id: z.string(),
  nameId: z.string().default(""),
  role: z.string().default(""),
  kind: z.string(),
  params: z.record(z.string(), z.union([z.number(), z.string()])).default({}),
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0),
  explode: z.string().default("NONE"),
  spin: z.boolean().optional(),
  bob: z.boolean().optional(),
});

export const RawAssemblySchema = z.object({
  id: z.string().default(""),
  title: z.string().default(""),
  fits: z.string().default(""),
  parts: z.array(RawPartSchema),
});

export interface GeneratedAssemblyResult {
  assembly: AssemblyDef;
  warnings: string[];
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

const toNum = (x: unknown): number =>
  typeof x === "number"
    ? x
    : typeof x === "string" && x.trim() !== ""
      ? Number(x)
      : NaN;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const r2 = (v: number) => Math.round(v * 100) / 100;

const GAP = 0.5;
/** Objek lebih ramping dari ini (tinggi:jari-jari) tidak terbaca di frame 9:16, jadi tingginya dikompres. */
const MAX_ASPECT = 5;

interface Work {
  id: string;
  nameId: string;
  role: string;
  kind: PartKind;
  params: Record<string, number | string>;
  pos: Vec3;
  explode: "NONE" | "UP" | "DOWN" | "RIGHT" | "LEFT";
  spin: boolean;
  bob: boolean;
}

const asSpec = (w: Work): PartSpec => ({
  id: w.id,
  kind: w.kind,
  position: w.pos,
  params: w.params,
  explodeDir: [0, 0, 0],
  explodeDistance: 0,
});

export function normalizeGeneratedAssembly(
  input: unknown,
  takenIds: string[] = []
): GeneratedAssemblyResult {
  const raw = RawAssemblySchema.parse(input); // ZodError -> dipakai untuk retry
  const errors: string[] = [];
  const warnings: string[] = [];

  if (raw.parts.length < MIN_PARTS || raw.parts.length > MAX_PARTS) {
    throw new Error(
      `Jumlah part harus ${MIN_PARTS}-${MAX_PARTS}, bukan ${raw.parts.length}.`
    );
  }

  const seen = new Set<string>();
  const parts: Work[] = [];

  raw.parts.forEach((rp, i) => {
    const id = slug(rp.id) || `part_${i + 1}`;
    if (seen.has(id)) errors.push(`Part id "${id}" dobel; id harus unik.`);
    seen.add(id);

    const kind = rp.kind.trim().toLowerCase() as PartKind;
    if (!GEN_KINDS.includes(kind)) {
      errors.push(
        `Part "${id}": kind "${rp.kind}" tidak didukung. Pilih salah satu: ${GEN_KINDS.join(", ")}.`
      );
      return;
    }

    const params: Record<string, number | string> = {};
    let ok = true;
    for (const [key, spec] of Object.entries(PARAM_SPECS[kind])) {
      const v = toNum(rp.params[key]);
      if (Number.isFinite(v)) {
        params[key] = v; // dibatasi SETELAH skala (LLM boleh memakai satuan apa saja, mis. mm)
      } else if (spec.def === undefined) {
        errors.push(`Part "${id}" (${kind}): parameter "${key}" wajib berupa angka.`);
        ok = false;
      }
    }
    if (!ok) return;

    const axis = String(rp.params.axis ?? "").toLowerCase();
    if ((kind === "cylinder" || kind === "cone") && (axis === "x" || axis === "z")) {
      params.axis = axis;
    }

    const ex = rp.explode.trim().toUpperCase();
    const explode = (["UP", "DOWN", "RIGHT", "LEFT"].includes(ex) ? ex : "NONE") as Work["explode"];

    let spin = !!rp.spin;
    if (spin && !(kind === "gear" || params.axis === "z")) {
      warnings.push(`Part "${id}": spin diabaikan (hanya untuk gear atau cylinder axis "z").`);
      spin = false;
    }

    parts.push({
      id,
      nameId: rp.nameId.trim() || id.replace(/_/g, " "),
      role: rp.role.trim(),
      kind,
      params,
      pos: [rp.x, rp.y, rp.z],
      explode,
      spin,
      bob: !!rp.bob,
    });
  });

  if (errors.length) throw new Error(errors.join(" "));

  // ---- objek terlalu ramping (mis. pulpen 23:1): kompres tinggi demi keterbacaan ----
  {
    const bb = sceneBounds(parts.map(asSpec), false);
    const h0 = bb.max[1] - bb.min[1];
    const r0 = Math.max(
      Math.abs(bb.min[0]), Math.abs(bb.max[0]),
      Math.abs(bb.min[2]), Math.abs(bb.max[2]),
      1e-6
    );
    const aspect = h0 / r0;
    if (aspect > MAX_ASPECT) {
      const fy = MAX_ASPECT / aspect;
      for (const p of parts) {
        p.pos[1] *= fy;
        const vertical =
          p.kind === "tube" ||
          p.kind === "box" ||
          ((p.kind === "cylinder" || p.kind === "cone") && !p.params.axis);
        if (vertical && typeof p.params.h === "number") p.params.h *= fy;
      }
      warnings.push(
        `Objek terlalu ramping (${r2(aspect)}:1); tinggi dikompres x${r2(fy)} agar terbaca di frame 9:16.`
      );
    }
  }

  // ---- skala otomatis supaya muat frame 9:16 ----
  const b0 = sceneBounds(parts.map(asSpec), false);
  const H = b0.max[1] - b0.min[1];
  const maxR = Math.max(
    Math.abs(b0.min[0]), Math.abs(b0.max[0]),
    Math.abs(b0.min[2]), Math.abs(b0.max[2])
  );
  if (H < 0.3) throw new Error("Objek terlalu pipih/kecil; tinggi total harus sekitar 6.");
  if (H < 4.5 || H > 7.5 || maxR > 2.4) {
    const s = Math.min(6 / H, 2.4 / Math.max(maxR, 0.01));
    for (const p of parts) {
      for (const k of Object.keys(p.params)) {
        if (typeof p.params[k] === "number" && k !== "teeth") {
          p.params[k] = r2((p.params[k] as number) * s);
        }
      }
      p.pos = [r2(p.pos[0] * s), r2(p.pos[1] * s), r2(p.pos[2] * s)];
    }
    warnings.push(`Objek diskalakan x${r2(s)} (tinggi ${r2(H)} -> ${r2(H * s)}).`);
  }

  // ---- setelah diskalakan: isi default, batasi rentang, koreksi hubungan antar parameter ----
  for (const p of parts) {
    for (const [key, spec] of Object.entries(PARAM_SPECS[p.kind])) {
      let v = p.params[key] as number | undefined;
      if (v === undefined) v = spec.def!;
      const c = clamp(v, spec.min, spec.max);
      if (c !== v) warnings.push(`Part "${p.id}": ${key} ${r2(v)} dibatasi ke ${r2(c)}.`);
      p.params[key] = key === "teeth" ? Math.round(c) : r2(c);
    }
    if (p.kind === "tube" && (p.params.rInner as number) > (p.params.rOuter as number) - 0.03) {
      p.params.rInner = r2(Math.max(0.03, (p.params.rOuter as number) - 0.03));
      warnings.push(`Part "${p.id}": rInner harus lebih kecil dari rOuter, dikoreksi.`);
    }
    if (p.kind === "gear") {
      if ((p.params.rRoot as number) > (p.params.rOuter as number) - 0.05) {
        p.params.rRoot = r2((p.params.rOuter as number) * 0.8);
        warnings.push(`Part "${p.id}": rRoot dikoreksi (harus < rOuter).`);
      }
      if ((p.params.hole as number) > (p.params.rRoot as number) - 0.05) {
        p.params.hole = r2((p.params.rRoot as number) * 0.5);
        warnings.push(`Part "${p.id}": lubang gear dikoreksi (harus < rRoot).`);
      }
    }
    p.pos = [clamp(p.pos[0], -3, 3), clamp(p.pos[1], -8, 8), clamp(p.pos[2], -3, 3)];
  }

  // ---- layout exploded otomatis (tanpa tumpang tindih) ----
  const ext = new Map(parts.map((p) => [p.id, partHalfExtents(asSpec(p))]));
  const anchors = parts.filter((p) => p.explode === "NONE");
  const anchorTop = anchors.length
    ? Math.max(...anchors.map((p) => p.pos[1] + ext.get(p.id)![1]))
    : -Infinity;
  const anchorBottom = anchors.length
    ? Math.min(...anchors.map((p) => p.pos[1] - ext.get(p.id)![1]))
    : Infinity;
  const anchorSide = Math.max(
    0,
    ...(anchors.length ? anchors : parts).map((p) => Math.abs(p.pos[0]) + ext.get(p.id)![0])
  );

  const dist = new Map<string, number>();

  let prevTop = anchorTop;
  parts
    .filter((p) => p.explode === "UP")
    .sort((a, b) => a.pos[1] - b.pos[1])
    .forEach((p) => {
      const hy = ext.get(p.id)![1];
      const c = Math.max(p.pos[1], prevTop + GAP + hy);
      dist.set(p.id, r2(c - p.pos[1]));
      prevTop = c + hy;
    });

  let prevBottom = anchorBottom;
  parts
    .filter((p) => p.explode === "DOWN")
    .sort((a, b) => b.pos[1] - a.pos[1])
    .forEach((p) => {
      const hy = ext.get(p.id)![1];
      const c = Math.min(p.pos[1], prevBottom - GAP - hy);
      dist.set(p.id, r2(p.pos[1] - c));
      prevBottom = c - hy;
    });

  for (const sign of [1, -1] as const) {
    const placed: Array<{ x: number; y: number; hx: number; hy: number }> = [];
    parts
      .filter((p) => p.explode === (sign === 1 ? "RIGHT" : "LEFT"))
      .sort((a, b) => a.pos[1] - b.pos[1])
      .forEach((p) => {
        const [hx, hy] = ext.get(p.id)!;
        let outer = anchorSide + hx + GAP;
        for (const q of placed) {
          if (Math.abs(p.pos[1] - q.y) < hy + q.hy) {
            outer = Math.max(outer, q.x + q.hx + hx + GAP);
          }
        }
        placed.push({ x: outer, y: p.pos[1], hx, hy });
        dist.set(p.id, r2(Math.max(0, outer - sign * p.pos[0])));
      });
  }

  const dirOf: Record<Work["explode"], Vec3> = {
    NONE: [0, 0, 0], UP: [0, 1, 0], DOWN: [0, -1, 0], RIGHT: [1, 0, 0], LEFT: [-1, 0, 0],
  };

  const finalParts: AssemblyPart[] = parts.map((p) => ({
    id: p.id,
    nameId: p.nameId,
    role: p.role,
    kind: p.kind,
    position: p.pos,
    params: p.params,
    explodeDir: dirOf[p.explode],
    explodeDistance: dist.get(p.id) ?? 0,
    ...(p.spin ? { spinZ: 0.12 } : {}),
    ...(p.bob ? { bob: { amp: 0.2, speed: 0.12 } } : {}),
  }));

  let id = `gen_${slug(raw.id || raw.title) || "objek"}`;
  const taken = new Set(takenIds);
  for (let n = 2; taken.has(id); n++) id = `gen_${slug(raw.id || raw.title) || "objek"}_${n}`;

  return {
    assembly: {
      id,
      title: raw.title.trim() || id,
      fits: raw.fits.trim(),
      parts: finalParts,
    },
    warnings,
  };
}
