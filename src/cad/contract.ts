import type * as THREE from "three";

/**
 * Kontrak scene CAD 3D. Scene ditulis (oleh manusia atau LLM) sebagai modul
 * yang mengekspor `meta` dan `build`. Aturan keras:
 *  - DETERMINISTIK: tidak boleh memakai Math.random / Date / requestAnimationFrame.
 *    Acak lewat `ctx.seed` (kit.mulberry32), animasi murni fungsi dari `state.t`.
 *  - Sumbu utama model = sumbu X (kit.latheShell dan kit.bladeRing mengikuti ini).
 *  - Semua material memakai `ctx.clip` (kit.blueprintMaterials) supaya cutaway jalan.
 */
export interface CadPartMeta {
  id: string;
  label: string;
  /** Titik jangkar di ruang model (posisi diam): target kamera dan ujung leader line. */
  anchor: [number, number, number];
  /** Bagian panas: label dan aksen oranye. */
  hot?: boolean;
  /** Offset vertikal label dari jangkar, pecahan tinggi frame (negatif = ke atas). */
  labelDy?: number;
}

export interface CadSceneMeta {
  id: string;
  title: string;
  subtitle: string;
  parts: CadPartMeta[];
  /** Radius bola pembatas model; menentukan jarak kamera. */
  radius: number;
  /** Setengah lebar penampang (tegak lurus sumbu); menentukan jangkauan plane cutaway. */
  crossRadius: number;
}

export interface CadBuildContext {
  /** Plane cutaway bersama; CadStage mengubah `constant`-nya per frame. */
  clip: THREE.Plane;
  seed: number;
}

export interface CadFrameState {
  /** Detik sejak awal shot. */
  t: number;
  /** 0 = rakitan utuh, 1 = urai penuh. */
  explode: number;
}

export interface CadRuntime {
  root: THREE.Group;
  /** Pasang pose untuk waktu `state.t`. Harus murni dan idempoten. */
  update(state: CadFrameState): void;
  /** Posisi jangkar part saat ini (sudah termasuk offset explode); valid setelah update(). */
  anchor(partId: string): THREE.Vector3;
}

export interface CadSceneModule {
  meta: CadSceneMeta;
  build(ctx: CadBuildContext): CadRuntime;
}

/** Satu shot kamera/tampilan. Dirangkai per kalimat narasi oleh planner (commit 3). */
export interface CadShot {
  /** 0 = tanpa potongan, 1 = potong separuh. */
  cutaway: number;
  explode: number;
  azimuth: number;
  elevation: number;
  /** Putaran gambar (rad) supaya model panjang mengisi frame vertikal. */
  roll: number;
  zoom: number;
  /** Part yang jadi pusat kamera, null = pusat model. */
  focus: string | null;
  /** 0..1: seberapa jauh target kamera bergeser dari pusat model ke part fokus. */
  focusMix: number;
  /** Putaran orbit otomatis, rad/detik. */
  orbit: number;
  labels: "all" | "none" | string[];
  labelOpacity: number;
}

export const DEFAULT_SHOT: CadShot = {
  cutaway: 1,
  explode: 0,
  azimuth: 0.55,
  elevation: 0.38,
  roll: -0.5,
  zoom: 1,
  focus: null,
  focusMix: 0,
  orbit: 0.06,
  labels: "all",
  labelOpacity: 1,
};
