export interface RotateBehaviorOptions {
  frame: number;
  fps?: number;
  axis?: "x" | "y" | "z";
  speed?: number;
}

export interface RotateTransformResult {
  transform: string;
  transformOrigin: string;
  rotationDegrees: number;
  rotationRadians: number;
  axis: "x" | "y" | "z";
}

/**
 * Rotate behavior:
 * - Rotates around axis without ANY scale deformation
 * - Natural pivot at center 50% 50%
 */
export function useRotateBehavior({
  frame,
  fps = 30,
  axis = "z",
  speed = 1.0,
}: RotateBehaviorOptions): RotateTransformResult {
  const normAxis = (axis || "z").toLowerCase() as "x" | "y" | "z";
  const rotation = (frame * speed * 6) % 360; // deg
  const rotationRad = (rotation * Math.PI) / 180;

  return {
    transform: `rotate${normAxis.toUpperCase()}(${rotation}deg)`,
    transformOrigin: "50% 50%",
    rotationDegrees: rotation,
    rotationRadians: rotationRad,
    axis: normAxis,
  };
}
