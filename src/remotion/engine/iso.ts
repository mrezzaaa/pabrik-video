import type { ObjectFlow, ObjectModel, ObjectPart } from "../../lib/explainer/model";

/**
 * Engine isometrik SVG murni (tanpa DOM, tanpa WebGL), deterministik per frame:
 * bagian 3D -> poligon -> proyeksi isometrik -> urut belakang ke depan
 * (painter's algorithm) -> shading per normal. Diadaptasi dari ide kit
 * skill isometric-explainer (iso-kit / lathe / tube).
 */

export interface P3 {
  x: number;
  y: number;
  z: number;
}
export interface P2 {
  x: number;
  y: number;
}

export type FaceKind = "face" | "cut" | "tube";

export interface Face {
  partId: string;
  kind: FaceKind;
  pts: P3[];
  color: string;
  /** 0..1 kecerahan hasil shading. */
  light: number;
  depth: number;
  /** tube: lebar garis (unit dunia). */
  width?: number;
}

export interface RenderOptions {
  t: number;
  yaw: number;
  cutaway: number;
  explode: number;
}

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;
const LIGHT = normalize({ x: -0.35, y: 0.25, z: 1 });
const VIEW = normalize({ x: 1, y: 1, z: 1 });

function normalize(v: P3): P3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
const sub = (a: P3, b: P3): P3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a: P3, b: P3): P3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const dot = (a: P3, b: P3) => a.x * b.x + a.y * b.y + a.z * b.z;

export function rotateZ(p: P3, deg: number, c: P3 = { x: 0, y: 0, z: 0 }): P3 {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos, z: p.z };
}

/** Proyeksi isometrik dasar (sebelum skala/geser layar). */
export function iso(p: P3): P2 {
  return { x: (p.x - p.y) * COS30, y: (p.x + p.y) * SIN30 - p.z };
}

function faceFrom(partId: string, kind: FaceKind, pts: P3[], color: string, cull = true): Face | null {
  if (pts.length < 3) return null;
  const n = normalize(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
  if (cull && dot(n, VIEW) <= 0.001) return null;
  const light = 0.5 + 0.5 * Math.max(0, dot(n, LIGHT));
  const depth = pts.reduce((s, p) => s + p.x + p.y + p.z, 0) / pts.length;
  return { partId, kind, pts, color, light, depth };
}

/* --------------------------------- shapes --------------------------------- */

function boxFaces(id: string, c: P3, s: P3, color: string, spin: number): Face[] {
  const hx = s.x / 2;
  const hy = s.y / 2;
  const v = (x: number, y: number, z: number) => rotateZ({ x: c.x + x, y: c.y + y, z: c.z + z }, spin, c);
  const p = [
    v(-hx, -hy, 0), v(hx, -hy, 0), v(hx, hy, 0), v(-hx, hy, 0),
    v(-hx, -hy, s.z), v(hx, -hy, s.z), v(hx, hy, s.z), v(-hx, hy, s.z),
  ];
  const quads: number[][] = [
    [4, 5, 6, 7], // atas
    [3, 2, 1, 0], // bawah
    [1, 2, 6, 5], // +x
    [2, 3, 7, 6], // +y
    [0, 1, 5, 4], // -y
    [3, 0, 4, 7], // -x
  ];
  return quads.map((q) => faceFrom(id, "face", q.map((i) => p[i]), color)).filter((f): f is Face => f !== null);
}

/** Kotak berongga: lantai + 4 dinding; dinding yang menghadap kamera dipotong sesuai cutaway. */
function hollowBoxFaces(id: string, c: P3, s: P3, color: string, cut: number): Face[] {
  const t = Math.max(1.5, Math.min(s.x, s.y) * 0.06);
  const front = s.z * (1 - 0.82 * cut);
  const out: Face[] = [];
  const wall = (cx: number, cy: number, w: number, d: number, h: number) =>
    out.push(...boxFaces(id, { x: c.x + cx, y: c.y + cy, z: c.z }, { x: w, y: d, z: h }, color, 0));
  out.push(...boxFaces(id, c, { x: s.x, y: s.y, z: t }, color, 0)); // lantai
  wall(-s.x / 2 + t / 2, 0, t, s.y, s.z); // -x (belakang)
  wall(0, -s.y / 2 + t / 2, s.x, t, s.z); // -y (belakang)
  if (front > t) {
    wall(s.x / 2 - t / 2, 0, t, s.y, front); // +x (depan)
    wall(0, s.y / 2 - t / 2, s.x, t, front); // +y (depan)
  }
  return out;
}

function profileFor(part: ObjectPart): { r: number; z: number }[] {
  const r = part.size.x / 2 || 10;
  const h = part.size.z || 20;
  switch (part.shape) {
    case "cone":
      return [{ r, z: 0 }, { r: 0.001, z: h }];
    case "sphere": {
      const pts: { r: number; z: number }[] = [];
      for (let i = 0; i <= 8; i += 1) {
        const a = -Math.PI / 2 + (i / 8) * Math.PI;
        pts.push({ r: Math.max(0.001, Math.cos(a) * r), z: (Math.sin(a) + 1) * (h / 2) });
      }
      return pts;
    }
    case "ring":
      return [{ r, z: 0 }, { r, z: Math.max(2, h * 0.25) }];
    case "lathe":
      if (part.profile && part.profile.length >= 2) {
        return part.profile.map((p) => ({ r: Math.max(0.001, Math.abs(p.r)), z: p.z }));
      }
      return [{ r, z: 0 }, { r, z: h }];
    default:
      return [{ r, z: 0 }, { r, z: h }];
  }
}

/**
 * Lathe: profil diputar mengelilingi sumbu z. Saat cutaway, irisan yang
 * menghadap kamera dihapus dan dua bidang potong diberi arsir.
 */
function latheFaces(id: string, c: P3, profile: { r: number; z: number }[], color: string, cut: number, yaw: number): Face[] {
  const seg = 28;
  const view = 45 - yaw; // azimut arah kamera di ruang objek
  const gap = 100 * cut; // derajat irisan yang dibuang
  const a0 = view + gap / 2;
  const a1 = view + 360 - gap / 2;
  const angleAt = (i: number) => a0 + ((a1 - a0) * i) / seg;
  const ring = (k: number, deg: number): P3 => {
    const r = (deg * Math.PI) / 180;
    return { x: c.x + Math.cos(r) * profile[k].r, y: c.y + Math.sin(r) * profile[k].r, z: c.z + profile[k].z };
  };
  const out: Face[] = [];
  for (let k = 0; k < profile.length - 1; k += 1) {
    for (let i = 0; i < seg; i += 1) {
      const da = angleAt(i);
      const db = angleAt(i + 1);
      const f = faceFrom(id, "face", [ring(k, da), ring(k, db), ring(k + 1, db), ring(k + 1, da)], color, false);
      if (f) {
        // Sisi dalam (terlihat lewat potongan) dibuat lebih gelap.
        const mid = (da + db) / 2;
        const outward = { x: Math.cos((mid * Math.PI) / 180), y: Math.sin((mid * Math.PI) / 180), z: 0 };
        if (dot(outward, VIEW) < 0) f.light *= 0.62;
        out.push(f);
      }
    }
  }
  // tutup atas dan bawah
  const capTop: P3[] = [];
  const capBottom: P3[] = [];
  const last = profile.length - 1;
  for (let i = 0; i <= seg; i += 1) {
    capTop.push(ring(last, angleAt(i)));
    capBottom.push(ring(0, angleAt(seg - i)));
  }
  if (gap > 0) {
    capTop.push({ x: c.x, y: c.y, z: c.z + profile[last].z });
    capBottom.push({ x: c.x, y: c.y, z: c.z + profile[0].z });
  }
  if (profile[last].r > 0.5) {
    const f = faceFrom(id, "face", capTop, color, false);
    if (f) out.push(f);
  }
  if (profile[0].r > 0.5) {
    const f = faceFrom(id, "face", capBottom, color, false);
    if (f) {
      f.light *= 0.7;
      out.push(f);
    }
  }
  // bidang potong berarsir
  if (gap > 0) {
    for (const deg of [a0, a1]) {
      const pts: P3[] = profile.map((_, k) => ring(k, deg));
      pts.push({ x: c.x, y: c.y, z: c.z + profile[last].z }, { x: c.x, y: c.y, z: c.z + profile[0].z });
      const f = faceFrom(id, "cut", pts, color, false);
      if (f) out.push(f);
    }
  }
  return out;
}

function tubeFaces(id: string, path: P3[], width: number, color: string): Face[] {
  const out: Face[] = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    out.push({
      partId: id,
      kind: "tube",
      pts: [a, b],
      color,
      light: 0.9,
      depth: (a.x + a.y + a.z + b.x + b.y + b.z) / 2,
      width,
    });
  }
  return out;
}

/* ------------------------------- scene build ------------------------------- */

export function explodeOffset(part: ObjectPart, index: number, amount: number): P3 {
  if (amount <= 0) return { x: 0, y: 0, z: 0 };
  const e = part.explode;
  if (e && (e.x || e.y || e.z)) return { x: e.x * amount, y: e.y * amount, z: e.z * amount };
  if (!part.inner && part.cutaway) return { x: 0, y: 0, z: 0 };
  return { x: 0, y: 0, z: (18 + index * 9) * amount * (part.inner ? 1 : 0.4) };
}

export function partCenter(part: ObjectPart, offset: P3 = { x: 0, y: 0, z: 0 }): P3 {
  if (part.shape === "tube" && part.path?.length) {
    const mid = part.path[Math.floor(part.path.length / 2)];
    return { x: mid.x + offset.x, y: mid.y + offset.y, z: mid.z + offset.z };
  }
  const h = part.shape === "lathe" && part.profile?.length
    ? Math.max(...part.profile.map((p) => p.z))
    : part.size.z;
  return {
    x: part.position.x + offset.x,
    y: part.position.y + offset.y,
    z: part.position.z + offset.z + h * 0.55,
  };
}

export interface BuiltScene {
  faces: Face[];
  /** Pusat tiap bagian setelah explode/animasi (ruang dunia, sebelum yaw). */
  centers: Record<string, P3>;
}

export function buildScene(model: ObjectModel, opt: RenderOptions, visible?: Set<string>): BuiltScene {
  const faces: Face[] = [];
  const centers: Record<string, P3> = {};
  model.parts.forEach((part, index) => {
    if (part.inner && opt.cutaway < 0.15 && opt.explode < 0.15 && !visible?.has(part.id)) {
      centers[part.id] = partCenter(part);
      return;
    }
    const off = explodeOffset(part, index, opt.explode);
    const bob = part.motion === "bob" ? Math.sin(opt.t * 3 + index) * 2.5 : 0;
    const base: P3 = { x: part.position.x + off.x, y: part.position.y + off.y, z: part.position.z + off.z + bob };
    const color = part.color ?? "#90A4AE";
    const cut = part.cutaway ? opt.cutaway : 0;
    const spin = part.motion === "spin" ? opt.t * 90 : 0;
    centers[part.id] = partCenter(part, { x: off.x, y: off.y, z: off.z + bob });

    switch (part.shape) {
      case "box":
        faces.push(...boxFaces(part.id, base, part.size, color, spin));
        break;
      case "hollowBox":
        faces.push(...hollowBoxFaces(part.id, base, part.size, color, cut));
        break;
      case "tube": {
        const path = (part.path ?? []).map((p) => ({ x: p.x + off.x, y: p.y + off.y, z: p.z + off.z + bob }));
        faces.push(...tubeFaces(part.id, path, Math.max(1.5, part.size.x / 4 || 3), color));
        break;
      }
      default:
        faces.push(...latheFaces(part.id, base, profileFor(part), color, cut, opt.yaw + spin));
    }
  });

  // Yaw kamera: putar seluruh scene mengelilingi pusat model.
  const pivot = modelPivot(model);
  for (const f of faces) {
    f.pts = f.pts.map((p) => rotateZ(p, opt.yaw, pivot));
    f.depth = f.pts.reduce((s, p) => s + p.x + p.y + p.z, 0) / f.pts.length;
  }
  for (const id of Object.keys(centers)) centers[id] = rotateZ(centers[id], opt.yaw, pivot);
  faces.sort((a, b) => a.depth - b.depth);
  return { faces, centers };
}

export function modelPivot(model: ObjectModel): P3 {
  let sx = 0;
  let sy = 0;
  for (const p of model.parts) {
    sx += p.position.x;
    sy += p.position.y;
  }
  return { x: sx / model.parts.length, y: sy / model.parts.length, z: 0 };
}

/** Titik-titik jalur aliran (pusat bagian yang dilewati). */
export function flowPath(flow: ObjectFlow, centers: Record<string, P3>): P3[] {
  return flow.through.map((id) => centers[id]).filter((p): p is P3 => Boolean(p));
}

export function pointAlong(path: P3[], u: number): P3 {
  if (path.length === 1) return path[0];
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const l = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y, path[i + 1].z - path[i].z);
    lens.push(l);
    total += l;
  }
  let d = ((u % 1) + 1) % 1 * total;
  for (let i = 0; i < lens.length; i += 1) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? d / lens[i] : 0;
      return {
        x: path[i].x + (path[i + 1].x - path[i].x) * k,
        y: path[i].y + (path[i + 1].y - path[i].y) * k,
        z: path[i].z + (path[i + 1].z - path[i].z) * k,
      };
    }
    d -= lens[i];
  }
  return path[path.length - 1];
}

/* ------------------------------ screen mapping ----------------------------- */

export interface Viewport {
  scale: number;
  ox: number;
  oy: number;
}

/** Hitung skala+geser agar seluruh benda pas di kotak, lalu zoom ke titik fokus. */
export function fitViewport(
  faces: Face[],
  box: { x: number; y: number; w: number; h: number },
  zoom: number,
  focus?: P3,
): Viewport {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const f of faces) {
    for (const p of f.pts) {
      const q = iso(p);
      minX = Math.min(minX, q.x);
      maxX = Math.max(maxX, q.x);
      minY = Math.min(minY, q.y);
      maxY = Math.max(maxY, q.y);
    }
  }
  if (!Number.isFinite(minX)) return { scale: 1, ox: box.x + box.w / 2, oy: box.y + box.h / 2 };
  const base = Math.min(box.w / Math.max(1, maxX - minX), box.h / Math.max(1, maxY - minY));
  const scale = base * zoom;
  let cx = (minX + maxX) / 2;
  let cy = (minY + maxY) / 2;
  if (focus && zoom > 1) {
    const f = iso(focus);
    const k = Math.min(1, (zoom - 1) / zoom + 0.1);
    cx += (f.x - cx) * k;
    cy += (f.y - cy) * k;
  }
  return { scale, ox: box.x + box.w / 2 - cx * scale, oy: box.y + box.h / 2 - cy * scale };
}

export function toScreen(p: P3, vp: Viewport): P2 {
  const q = iso(p);
  return { x: vp.ox + q.x * vp.scale, y: vp.oy + q.y * vp.scale };
}

/* --------------------------------- colors --------------------------------- */

export function shade(hex: string, light: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.slice(0, 6);
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  const k = Math.min(1.25, Math.max(0.2, light));
  const ch = (v: number) => Math.min(255, Math.round(v * k)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/* --------------------------------- labels --------------------------------- */

export interface LabelIn {
  id: string;
  text: string;
  anchor: P2;
}
export interface LabelOut extends LabelIn {
  x: number;
  y: number;
  side: "left" | "right";
}

/** Callout dua kolom (kiri/kanan) dengan jarak minimum vertikal: tanpa tabrakan. */
export function layoutCallouts(
  items: LabelIn[],
  frame: { w: number; top: number; bottom: number },
  gap = 78,
): LabelOut[] {
  const mid = frame.w / 2;
  const sides: Record<"left" | "right", LabelIn[]> = { left: [], right: [] };
  for (const item of items) sides[item.anchor.x < mid ? "left" : "right"].push(item);
  // seimbangkan kolom
  while (Math.abs(sides.left.length - sides.right.length) > 1) {
    const from = sides.left.length > sides.right.length ? "left" : "right";
    const to = from === "left" ? "right" : "left";
    sides[from].sort((a, b) => (from === "left" ? a.anchor.x - b.anchor.x : b.anchor.x - a.anchor.x));
    sides[to].push(sides[from].pop()!);
  }
  const out: LabelOut[] = [];
  for (const side of ["left", "right"] as const) {
    const list = sides[side].sort((a, b) => a.anchor.y - b.anchor.y);
    let y = frame.top;
    const placed = list.map((item) => {
      y = Math.max(y, Math.min(frame.bottom, item.anchor.y));
      const at = y;
      y += gap;
      return at;
    });
    // kalau mentok bawah, geser naik
    const overflow = (placed[placed.length - 1] ?? 0) - frame.bottom;
    list.forEach((item, i) => {
      out.push({
        ...item,
        side,
        x: side === "left" ? 56 : frame.w - 56,
        y: Math.max(frame.top, placed[i] - Math.max(0, overflow)),
      });
    });
  }
  return out;
}

