import { PartSpec, Vec3 } from "./types";

/** Fungsi geometri murni (tanpa remotion/three) agar bisa dipakai worker Node juga. */

const n = (p: PartSpec, k: string, d: number) =>
  typeof p.params[k] === "number" ? (p.params[k] as number) : d;

/** Setengah-ukuran kasar (aksis-sejajar) sebuah part. */
export function partHalfExtents(p: PartSpec): Vec3 {
  switch (p.kind) {
    case "cylinder":
    case "cone": {
      const r = Math.max(n(p, "r", 0), n(p, "rTop", 0), n(p, "rBottom", 0));
      const h = n(p, "h", 1);
      if (p.params.axis === "x") return [h / 2, r, r];
      if (p.params.axis === "z") return [r, r, h / 2];
      return [r, h / 2, r];
    }
    case "tube": {
      const r = n(p, "rOuter", 1);
      return [r, n(p, "h", 2) / 2, r];
    }
    case "box":
      return [n(p, "w", 1) / 2, n(p, "h", 1) / 2, n(p, "d", 1) / 2];
    case "gear": {
      const r = n(p, "rOuter", 1.2);
      return [r, r, n(p, "depth", 0.25) / 2];
    }
  }
}

export interface Bounds {
  min: Vec3;
  max: Vec3;
}

export function sceneBounds(parts: PartSpec[], exploded: boolean): Bounds {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    const d = exploded ? p.explodeDistance : 0;
    const e = partHalfExtents(p);
    for (let i = 0; i < 3; i++) {
      const c = p.position[i] + p.explodeDir[i] * d;
      min[i] = Math.min(min[i], c - e[i]);
      max[i] = Math.max(max[i], c + e[i]);
    }
  }
  return { min, max };
}
