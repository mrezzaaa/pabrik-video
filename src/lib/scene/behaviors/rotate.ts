export interface RotateOptions {
  frame: number;
  fps?: number;
  axis?: "x" | "y" | "z";
  speed?: number;
}

export interface RotateResult {
  rotationRadians: number;
  rotationDegrees: number;
  axis: "x" | "y" | "z";
  transform: string;
  transformOrigin: string;
}

/**
 * Pure 3D rotation behavior:
 * HANYA pakai rotation.z (atau sumbu terkait), transformOrigin 50% 50%.
 * DILARANG KERAS menggunakan scale (itu yang bikin fan mengembang seperti payung).
 */
export function calculateRotation({
  frame,
  fps = 30,
  axis = "z",
  speed = 1.0,
}: RotateOptions): RotateResult {
  const normAxis = (axis || "z").toLowerCase() as "x" | "y" | "z";
  // 360 degrees in (fps / speed) frames
  const rotationDegrees = (frame * speed * (360 / Math.max(1, fps))) % 360;
  const rotationRadians = (rotationDegrees * Math.PI) / 180;

  return {
    rotationRadians,
    rotationDegrees,
    axis: normAxis,
    transform: `rotate${normAxis.toUpperCase()}(${rotationDegrees.toFixed(2)}deg)`,
    transformOrigin: "50% 50%",
  };
}

export const useRotateBehavior = calculateRotation;
