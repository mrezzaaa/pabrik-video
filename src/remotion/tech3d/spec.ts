import { Easing, interpolate } from "remotion";
import { Keyframe, PartSpec, TechSceneSpec, Vec3 } from "./types";

export * from "./types";
export * from "./geometry";
import { Bounds, sceneBounds } from "./geometry";

export const ease = Easing.inOut(Easing.cubic);

/** Nilai track keyframe di frame tertentu (easing antar keyframe). */
export function track(frame: number, kfs: Keyframe[], fallback = 0): number {
  if (kfs.length === 0) return fallback;
  if (frame <= kfs[0].frame) return kfs[0].value;
  for (let i = 1; i < kfs.length; i++) {
    const a = kfs[i - 1];
    const b = kfs[i];
    if (frame <= b.frame) {
      if (b.frame === a.frame) return b.value;
      const t = (frame - a.frame) / (b.frame - a.frame);
      return a.value + (b.value - a.value) * ease(t);
    }
  }
  return kfs[kfs.length - 1].value;
}

/** Part yang sedang disorot + seberapa kuat (0..1), dengan fade in/out. */
export function focusAt(
  spec: TechSceneSpec,
  frame: number
): { partId: string | null; amount: number } {
  let best: { partId: string | null; amount: number } = {
    partId: null,
    amount: 0,
  };
  for (const h of spec.highlights) {
    const span = h.to - h.from;
    const ramp = Math.max(1, Math.min(10, Math.floor(span / 3)));
    const a = interpolate(
      frame,
      [h.from, h.from + ramp, h.to - ramp, h.to],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    if (a > best.amount) best = { partId: h.partId, amount: a };
  }
  return best;
}

const boundsCache = new WeakMap<
  PartSpec[],
  { a: Bounds; e: Bounds; all: Bounds }
>();

export function boundsOf(spec: TechSceneSpec) {
  let b = boundsCache.get(spec.parts);
  if (!b) {
    const a = sceneBounds(spec.parts, false);
    const e = sceneBounds(spec.parts, true);
    const all: Bounds = {
      min: [0, 1, 2].map((i) => Math.min(a.min[i], e.min[i])) as Vec3,
      max: [0, 1, 2].map((i) => Math.max(a.max[i], e.max[i])) as Vec3,
    };
    b = { a, e, all };
    boundsCache.set(spec.parts, b);
  }
  return b;
}

/* --------------------------------- gerak ---------------------------------- */

/** Posisi part di frame tertentu (dipakai mesh DAN proyeksi callout). */
export function partPosition(
  part: PartSpec,
  spec: TechSceneSpec,
  frame: number
): Vec3 {
  const e = track(frame, spec.explode);
  const [x, y, z] = part.position;
  const [dx, dy, dz] = part.explodeDir;
  const d = part.explodeDistance * e;
  const bob = part.bob
    ? Math.sin(frame * part.bob.speed) * part.bob.amp * (1 - e)
    : 0;
  return [x + dx * d, y + dy * d + bob, z + dz * d];
}

const FOV = 30;
const TAN = Math.tan((FOV / 2) * (Math.PI / 180));
const ASPECT = 1080 / 1920;

function framing(b: Bounds) {
  const cy = (b.min[1] + b.max[1]) / 2;
  const hv = (b.max[1] - b.min[1]) / 2;
  const hr = Math.hypot(
    Math.max(Math.abs(b.min[0]), Math.abs(b.max[0])),
    Math.max(Math.abs(b.min[2]), Math.abs(b.max[2]))
  );
  const distV = (hv * 1.25) / TAN;
  const distH = (hr * 1.2) / (TAN * ASPECT);
  const dist = Math.max(distV, distH) * 1.18;
  // geser model agak ke bawah supaya HUD judul tidak menimpa
  const target = cy + 0.04 * (2 * dist * TAN);
  return { dist, target };
}

/** Kamera orbit pelan; auto-framing dari bounding box assembly. */
export function cameraAt(spec: TechSceneSpec, frame: number) {
  const bb = boundsOf(spec);
  const fa = framing(bb.a);
  const fe = framing(bb.e);
  const e = track(frame, spec.explode);
  const dist = fa.dist + (fe.dist - fa.dist) * e;
  const targetY = fa.target + (fe.target - fa.target) * e;
  const t = frame / Math.max(1, spec.durationInFrames);
  const az = 0.5 + t * 0.5;
  const el = 0.32;
  const target: Vec3 = [0, targetY, 0];
  const position: Vec3 = [
    dist * Math.sin(az) * Math.cos(el),
    targetY + dist * Math.sin(el),
    dist * Math.cos(az) * Math.cos(el),
  ];
  return { position, target, fov: FOV };
}
