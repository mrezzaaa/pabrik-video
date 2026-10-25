import { spring } from "remotion";

export interface ExplodeOptions {
  frame: number;
  startFrame?: number;
  fps?: number;
  offset?: number;
  direction?: [number, number, number];
}

export interface ExplodeResult {
  progress: number;
  offsetTranslation: [number, number, number];
  transform: string;
}

/**
 * Explode behavior (Section 3.4):
 * Menggunakan translateY/X/Z dengan spring easing.
 * DILARANG KERAS menggunakan scaleY atau scale!
 */
export function calculateExplode({
  frame,
  startFrame = 0,
  fps = 30,
  offset = 1.8,
  direction = [0, 1, 0],
}: ExplodeOptions): ExplodeResult {
  const relFrame = Math.max(0, frame - startFrame);

  // Remotion physical spring with slight dampening
  const progress = spring({
    frame: relFrame,
    fps,
    config: {
      damping: 14,
      mass: 0.8,
      stiffness: 80,
      overshootClamping: true,
    },
  });

  const tx = direction[0] * offset * progress;
  const ty = direction[1] * offset * progress;
  const tz = direction[2] * offset * progress;

  return {
    progress,
    offsetTranslation: [tx, ty, tz],
    transform: `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, ${tz.toFixed(2)}px)`,
  };
}

export const useExplodeBehavior = calculateExplode;
