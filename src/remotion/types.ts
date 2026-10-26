import type { VisualScene, WordTimestamp } from "../lib/types";

export type ReelsProps = {
  audioSrc: string;
  duration: number;
  fps: number;
  hook: string;
  topic: string;
  scenes: VisualScene[];
  words: WordTimestamp[];
};

export type SceneProps = {
  scene: VisualScene;
  index: number;
  total: number;
};
