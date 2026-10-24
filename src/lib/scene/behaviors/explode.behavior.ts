import { spring } from "remotion";

export interface ExplodeBehaviorOptions {
  frame: number;
  startFrame?: number;
  fps?: number;
  offset?: number;
  direction?: [number, number, number];
}

export interface ExplodeTransformResult {
  transform: string;
  progress: number;
  offsetTranslation: [number, number, number];
}

/**
 * Explode behavior:
 * - Moves components outwards smoothly using Remotion spring physics
 * - Strict translation only (DILARANG pakai scale)
 */
export function useExplodeBehavior({
  frame,
  startFrame = 0,
  fps = 30,
  offset = 80,
  direction = [0, 1, 0],
}: ExplodeBehaviorOptions): ExplodeTransformResult {
  const currentFrame = Math.max(0, frame - startFrame);
  const progress = spring({
    frame: currentFrame,
    fps,
    config: { damping: 200 },
  });

  const tx = direction[0] * offset * progress;
  const ty = direction[1] * offset * progress;
  const tz = direction[2] * offset * progress;

  return {
    transform: `translate3d(${tx}px, ${ty}px, ${tz}px)`,
    progress,
    offsetTranslation: [tx, ty, tz],
  };
}
