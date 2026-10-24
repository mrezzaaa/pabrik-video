import { interpolate, Easing } from "remotion";

/**
 * Spesifikasi scene teknik 3D.
 * Ide utama: LLM TIDAK menulis kode 3D. LLM hanya memilih part dari library
 * (kind) dan mengisi parameter + timeline. Semua rendering deterministik.
 */

export type Vec3 = [number, number, number];

export type PartKind = "cylinder" | "tube" | "box" | "gear";

export interface PartSpec {
  id: string;
  kind: PartKind;
  /** posisi saat rakitan utuh */
  position: Vec3;
  /** parameter geometri, tergantung kind */
  params: Record<string, number | string>;
  /** arah & jarak tarik saat exploded view */
  explodeDir: Vec3;
  explodeDistance: number;
  /** putar terus (rad per frame) pada sumbu Z, mis. gear / crank */
  spinZ?: number;
}

export interface CalloutSpec {
  partId: string;
  text: string;
  /** frame mulai & selesai tampil */
  from: number;
  to: number;
  side: "L" | "R";
}

export interface Window {
  from: number;
  to: number;
}

export interface TechSceneSpec {
  title: string;
  themeColor: string;
  durationInFrames: number;
  parts: PartSpec[];
  /** sapuan scanner: wireframe -> blueprint solid (bawah ke atas) */
  sweep: Window;
  /** exploded view */
  explode: Window;
  /** potongan melintang masuk (clipping plane bergerak sepanjang sumbu X) */
  section: Window;
  /** potongan menutup lagi (opsional) */
  sectionOut?: Window;
  /** label fase di HUD atas */
  phases: Array<Window & { label: string }>;
  callouts: CalloutSpec[];
}

export const ease = Easing.inOut(Easing.cubic);

export function progress(frame: number, w: Window): number {
  return interpolate(frame, [w.from, w.to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

/** Posisi part di frame tertentu (dipakai mesh DAN proyeksi callout). */
export function partPosition(
  part: PartSpec,
  spec: TechSceneSpec,
  frame: number
): Vec3 {
  const e = progress(frame, spec.explode);
  const [x, y, z] = part.position;
  const [dx, dy, dz] = part.explodeDir;
  const d = part.explodeDistance * e;

  // Gerak mesin (piston naik-turun) hanya saat rakitan masih utuh.
  let bob = 0;
  if (part.id === "piston" || part.id === "rod") {
    bob = Math.sin(frame * 0.12) * 0.22 * (1 - e);
  }
  return [x + dx * d, y + dy * d + bob, z + dz * d];
}

/** Kamera orbit pelan; mundur saat exploded supaya semua part muat 9:16. */
export function cameraAt(spec: TechSceneSpec, frame: number) {
  const e = progress(frame, spec.explode);
  const t = frame / spec.durationInFrames;
  const az = 0.5 + t * 0.5;
  const el = 0.32;
  const dist = 17 + 11 * e;
  const target: Vec3 = [0, 1.55 - 0.65 * e, 0];
  const position: Vec3 = [
    target[0] + dist * Math.sin(az) * Math.cos(el),
    target[1] + dist * Math.sin(el),
    target[2] + dist * Math.cos(az) * Math.cos(el),
  ];
  return { position, target, fov: 30 };
}

/** Mesin 4-tak sederhana: contoh scene prototipe. */
export const DEMO_SPEC: TechSceneSpec = {
  title: "MESIN PEMBAKARAN",
  themeColor: "#38BDF8",
  durationInFrames: 360,
  parts: [
    {
      id: "block",
      kind: "tube",
      position: [0, 1.2, 0],
      params: { rOuter: 1.0, rInner: 0.82, h: 2.4 },
      explodeDir: [0, 1, 0],
      explodeDistance: 0,
    },
    {
      id: "head",
      kind: "cylinder",
      position: [0, 2.65, 0],
      params: { r: 1.05, h: 0.5 },
      explodeDir: [0, 1, 0],
      explodeDistance: 1.3,
    },
    {
      id: "sparkplug",
      kind: "cylinder",
      position: [0, 3.25, 0],
      params: { r: 0.13, h: 0.8 },
      explodeDir: [0, 1, 0],
      explodeDistance: 2.4,
    },
    {
      id: "intake",
      kind: "cylinder",
      position: [1.2, 2.65, 0],
      params: { r: 0.2, h: 1.0, axis: "x" },
      explodeDir: [1, 0, 0],
      explodeDistance: 1.7,
    },
    {
      id: "piston",
      kind: "cylinder",
      position: [0, 1.4, 0],
      params: { r: 0.78, h: 0.7 },
      explodeDir: [0, -1, 0],
      explodeDistance: 1.5,
    },
    {
      id: "rod",
      kind: "box",
      position: [0, 0.1, 0],
      params: { w: 0.2, h: 2.2, d: 0.32 },
      explodeDir: [0, -1, 0],
      explodeDistance: 2.7,
    },
    {
      id: "crank",
      kind: "cylinder",
      position: [0, -1.3, 0],
      params: { r: 0.95, h: 0.3, axis: "z" },
      explodeDir: [0, -1, 0],
      explodeDistance: 3.9,
      spinZ: 0.12,
    },
    {
      id: "flywheel",
      kind: "gear",
      position: [0, -1.3, 0.5],
      params: { rOuter: 1.25, rRoot: 1.08, teeth: 18, depth: 0.25, hole: 0.3 },
      explodeDir: [0, -1, 0],
      explodeDistance: 3.9,
      spinZ: 0.12,
    },
  ],
  sweep: { from: 6, to: 80 },
  section: { from: 90, to: 140 },
  sectionOut: { from: 190, to: 215 },
  explode: { from: 225, to: 290 },
  phases: [
    { from: 0, to: 90, label: "01 // WIREFRAME PASS" },
    { from: 90, to: 220, label: "02 // CROSS-SECTION" },
    { from: 220, to: 360, label: "03 // EXPLODED VIEW" },
  ],
  callouts: [
    { partId: "piston", text: "PISTON", from: 125, to: 190, side: "L" },
    { partId: "rod", text: "BATANG PENGHUBUNG", from: 145, to: 195, side: "R" },
    { partId: "sparkplug", text: "BUSI", from: 250, to: 335, side: "R" },
    { partId: "piston", text: "PISTON", from: 265, to: 345, side: "L" },
    { partId: "flywheel", text: "RODA GILA", from: 285, to: 352, side: "L" },
  ],
};
