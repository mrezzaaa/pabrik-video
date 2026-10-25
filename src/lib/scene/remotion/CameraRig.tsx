import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export type ShotType = "WIDE" | "MEDIUM" | "CLOSE" | "MACRO" | "XRAY_SIDE";

export interface CameraRigProps {
  shotType?: ShotType;
  focusComponentIds?: string[];
  focusPosition3D?: [number, number, number];
  zoomMultiplier?: number;
  explodeFactor?: number;
}

const SHOT_PRESETS: Record<
  ShotType,
  { position: [number, number, number]; target: [number, number, number] }
> = {
  WIDE: {
    position: [0, 2.8, 9.2],
    target: [0, 0, 0],
  },
  MEDIUM: {
    position: [4.2, 2.6, 8.2],
    target: [0, 0.2, 0],
  },
  CLOSE: {
    position: [-3.8, 2.4, 8.4],
    target: [0, 0.2, 0],
  },
  MACRO: {
    position: [2.5, 3.2, 8.6],
    target: [0, 0.2, 0],
  },
  XRAY_SIDE: {
    position: [8.6, 1.8, 3.2],
    target: [0, 0.3, 0],
  },
};

/**
 * Universal Camera Rig:
 * - Stable, consistent viewing distance without jarring zoom-in effects
 * - Smooth spring transitions between angles
 * - Clamped explodeFactor (0.0 - 1.0)
 * - Dynamically tracks focusPosition3D
 */
export const CameraRig: React.FC<CameraRigProps> = ({
  shotType = "MEDIUM",
  focusPosition3D,
  zoomMultiplier = 1.0,
  explodeFactor = 0.0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camera = useThree((s) => s.camera);

  // Clamped explodeFactor for parts separation
  const clampedExplode = Math.min(1.0, Math.max(0.0, Number(explodeFactor) || 0.0));

  const targetPreset = SHOT_PRESETS[shotType] || SHOT_PRESETS.MEDIUM;

  // Calculate target position and camera eye
  const { eye, lookTarget } = useMemo(() => {
    const basePos = targetPreset.position;
    const baseTarget = targetPreset.target;

    // Focus target shift if provided
    const fx = focusPosition3D ? focusPosition3D[0] : baseTarget[0];
    const fy = focusPosition3D ? focusPosition3D[1] : baseTarget[1];
    const fz = focusPosition3D ? focusPosition3D[2] : baseTarget[2];

    // Direction vector from focus to base position
    const dir = new THREE.Vector3(
      basePos[0] - fx,
      basePos[1] - fy,
      basePos[2] - fz
    );
    // Constant distance without zoom scaling
    const dist = dir.length();
    dir.normalize();

    // Explode pull back slightly to accommodate expanding parts
    const explodeOffset = clampedExplode * 1.2;
    const currentDist = dist + explodeOffset;

    // Subtle eased drift for organic cinematic feel
    const driftAngle = (frame / (fps * 20)) * Math.PI * 0.1;
    const rotatedX = dir.x * Math.cos(driftAngle) - dir.z * Math.sin(driftAngle);
    const rotatedZ = dir.x * Math.sin(driftAngle) + dir.z * Math.cos(driftAngle);

    const eyeX = fx + rotatedX * currentDist;
    const eyeY = fy + dir.y * currentDist;
    const eyeZ = fz + rotatedZ * currentDist;

    return {
      eye: [eyeX, eyeY, eyeZ] as [number, number, number],
      lookTarget: [fx, fy, fz] as [number, number, number],
    };
  }, [targetPreset, focusPosition3D, clampedExplode, frame, fps]);

  camera.position.set(eye[0], eye[1], eye[2]);
  camera.lookAt(lookTarget[0], lookTarget[1], lookTarget[2]);

  return null;
};
