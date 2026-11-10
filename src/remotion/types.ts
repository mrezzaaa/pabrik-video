import type { VisualScene, WordTimestamp } from "../lib/types";

export type ReelsProps = {
  audioSrc: string;
  duration: number;
  fps: number;
  hook: string;
  topic: string;
  scenes: VisualScene[];
  words: WordTimestamp[];
  /** Judul hook di layar (2-6 kata). Kosong = tanpa kartu hook (project lama). */
  hookText?: string;
  /** Label kecil di atas judul, mis. "CARA KERJA". */
  hookKicker?: string;
  /** Detik hook selesai diucapkan; menentukan lama kartu tampil. */
  hookEnd?: number;
};

export type SceneProps = {
  scene: VisualScene;
  index: number;
  total: number;
};
