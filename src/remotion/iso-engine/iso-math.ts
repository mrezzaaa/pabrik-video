export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  sx: number;
  sy: number;
}

export interface IsoProjectionConfig {
  originX: number;
  originY: number;
  scale: number;
}

export const DEFAULT_ISO_CONFIG: IsoProjectionConfig = {
  originX: 540,
  originY: 1020,
  scale: 2.35,
};

export interface IsoFace3D {
  id: string;
  partId: string;
  vertices: Point3D[];
  baseColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  isCutawayCap?: boolean;
  normalOverride?: Point3D;
}

export interface CompiledSvgPolygon {
  id: string;
  partId: string;
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  isCutawayCap: boolean;
  depth: number;
}

const COS_30 = Math.cos(Math.PI / 6); // ~0.8660254
const SIN_30 = Math.sin(Math.PI / 6); // 0.5

export function projectIso3D(
  pt: Point3D,
  config: IsoProjectionConfig = DEFAULT_ISO_CONFIG
): Point2D {
  const { originX, originY, scale } = config;
  return {
    sx: originX + (pt.x - pt.y) * COS_30 * scale,
    sy: originY + (pt.x + pt.y) * SIN_30 * scale - pt.z * scale,
  };
}

export function rotatePoint3D(
  pt: Point3D,
  axis: "X" | "Y" | "Z",
  angleDeg: number,
  pivot: Point3D = { x: 0, y: 0, z: 0 }
): Point3D {
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const dx = pt.x - pivot.x;
  const dy = pt.y - pivot.y;
  const dz = pt.z - pivot.z;

  if (axis === "X") {
    return {
      x: pivot.x + dx,
      y: pivot.y + dy * c - dz * s,
      z: pivot.z + dy * s + dz * c,
    };
  }
  if (axis === "Y") {
    return {
      x: pivot.x + dx * c + dz * s,
      y: pivot.y + dy,
      z: pivot.z - dx * s + dz * c,
    };
  }
  return {
    x: pivot.x + dx * c - dy * s,
    y: pivot.y + dx * s + dy * c,
    z: pivot.z + dz,
  };
}

export function translatePoint3D(pt: Point3D, offset: Point3D): Point3D {
  return {
    x: pt.x + offset.x,
    y: pt.y + offset.y,
    z: pt.z + offset.z,
  };
}

export function computeCentroid3D(points: Point3D[]): Point3D {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sz += p.z;
  }
  const n = points.length;
  return { x: sx / n, y: sy / n, z: sz / n };
}

export function computeIsoDepth(pt: Point3D): number {
  return pt.x + pt.y + pt.z * 0.85;
}

export function computeFaceNormal(vertices: Point3D[]): Point3D {
  if (vertices.length < 3) return { x: 0, y: 0, z: 1 };
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < vertices.length; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % vertices.length];
    nx += (curr.y - next.y) * (curr.z + next.z);
    ny += (curr.z - next.z) * (curr.x + next.x);
    nz += (curr.x - next.x) * (curr.y + next.y);
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

export function adjustHexLightness(hex: string, deltaPercent: number): string {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;

  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  const shift = Math.round((deltaPercent / 100) * 255);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));

  const nr = clamp(r + shift);
  const ng = clamp(g + shift);
  const nb = clamp(b + shift);

  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1).toUpperCase()}`;
}

export function shadeFaceColor(
  baseColor: string,
  normal: Point3D,
  isCutawayCap = false
): string {
  if (isCutawayCap) {
    return adjustHexLightness(baseColor, 16);
  }
  if (normal.z > 0.55) {
    return adjustHexLightness(baseColor, 12);
  }
  if (normal.z < -0.55) {
    return adjustHexLightness(baseColor, -18);
  }
  const lightDir = { x: -0.45, y: 0.55, z: 0.7 };
  const dot =
    normal.x * lightDir.x + normal.y * lightDir.y + normal.z * lightDir.z;

  if (dot > 0.2) {
    return adjustHexLightness(baseColor, 6);
  }
  if (dot < -0.15) {
    return adjustHexLightness(baseColor, -12);
  }
  return baseColor;
}

export function isPointInFrontCutaway(
  pt: Point3D,
  clipOrigin: Point3D = { x: 0, y: 0, z: 0 }
): boolean {
  return pt.x > clipOrigin.x + 1 && pt.y > clipOrigin.y + 1;
}

export function compileIsoFacesToSvgPolygons(
  faces: IsoFace3D[],
  config: IsoProjectionConfig = DEFAULT_ISO_CONFIG
): CompiledSvgPolygon[] {
  const compiled: CompiledSvgPolygon[] = [];

  for (const face of faces) {
    if (face.vertices.length < 3) continue;

    const centroid = computeCentroid3D(face.vertices);
    const depth = computeIsoDepth(centroid);
    const normal = face.normalOverride ?? computeFaceNormal(face.vertices);
    const shadedFill = shadeFaceColor(
      face.baseColor,
      normal,
      Boolean(face.isCutawayCap)
    );

    const projected = face.vertices.map((v) => projectIso3D(v, config));
    const d =
      projected
        .map(
          (p, idx) =>
            `${idx === 0 ? "M" : "L"} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`
        )
        .join(" ") + " Z";

    compiled.push({
      id: face.id,
      partId: face.partId,
      d,
      fill: shadedFill,
      stroke: face.strokeColor ?? "#1E293B",
      strokeWidth: face.strokeWidth ?? 2.5,
      opacity: face.opacity ?? 1,
      isCutawayCap: Boolean(face.isCutawayCap),
      depth,
    });
  }

  compiled.sort((a, b) => a.depth - b.depth);
  return compiled;
}
