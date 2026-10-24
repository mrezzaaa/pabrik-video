/**
 * Tipe murni (tanpa import three/remotion) supaya aman dipakai
 * oleh worker Node, prompt builder, dan bundle Remotion sekaligus.
 */

export type Vec3 = [number, number, number];

export type PartKind = "cylinder" | "tube" | "box" | "gear" | "cone";

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
  /** gerak bolak-balik vertikal saat rakitan utuh (mis. piston) */
  bob?: { amp: number; speed: number };
}

/** Part di katalog: PartSpec + info untuk LLM director. */
export interface AssemblyPart extends PartSpec {
  /** nama dalam bahasa Indonesia, dipakai LLM untuk narasi & label */
  nameId: string;
  /** fungsi singkat, dipakai LLM supaya narasinya akurat */
  role: string;
}

export interface AssemblyDef {
  id: string;
  title: string;
  /** topik apa saja yang cocok dijelaskan dengan assembly ini */
  fits: string;
  parts: AssemblyPart[];
}

export interface Window {
  from: number;
  to: number;
}

export interface Keyframe {
  frame: number;
  value: number;
}

export interface CalloutSpec {
  partId: string;
  text: string;
  from: number;
  to: number;
  side: "L" | "R";
}

export interface Highlight extends Window {
  partId: string;
}

export interface TechSceneSpec {
  title: string;
  themeColor: string;
  durationInFrames: number;
  parts: PartSpec[];
  /** 0 = semua wireframe, 1 = semua blueprint solid (sapuan scanner di antaranya) */
  reveal: Keyframe[];
  /** 0 = rakitan utuh, 1 = exploded */
  explode: Keyframe[];
  /** 0 = tertutup, 1 = terpotong setengah (cross-section) */
  section: Keyframe[];
  /** part yang disorot (part lain meredup) */
  highlights: Highlight[];
  /** label fase di HUD atas */
  phases: Array<Window & { label: string }>;
  callouts: CalloutSpec[];
}
