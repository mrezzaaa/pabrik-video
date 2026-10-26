import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export type ShotType =
  | "WIDE"
  | "MEDIUM"
  | "CLOSE"
  | "MACRO"
  | "XRAY_SIDE"
  | "XRAY_QUARTER";

export interface CameraRigProps {
  shotType?: ShotType;
  focusComponentIds?: string[];
  focusPosition3D?: [number, number, number];
  /** Bounding sphere of the whole scene, measured by the scene component. */
  frameCenter?: [number, number, number];
  frameRadius?: number;
  /** Bounding box size of the whole subject (x, y, z). */
  frameSize?: [number, number, number];
  /** Radius of the focused part; used instead of `frameRadius` when present. */
  focusRadius?: number;
  /** Bounding box size of the focused part. */
  focusSize?: [number, number, number];
  zoomMultiplier?: number;
  explodeFactor?: number;
  phaseStartFrame?: number;
}

/**
 * Camera direction per shot (unit-ish, normalised at use).
 * Elevation is deliberately low (20-30 deg) so the result reads as an
 * isometric hologram instead of a top-down diagram.
 */
const SHOT_DIRECTIONS: Record<ShotType, [number, number, number]> = {
  WIDE: [0.52, 0.46, 1],
  MEDIUM: [0.55, 0.38, 1],
  CLOSE: [-0.5, 0.32, 1],
  MACRO: [0.35, 0.55, 1],
  XRAY_SIDE: [1, 0.24, 0.28],
  // 53 deg azimuth, 26 deg elevation: reads depth on flat subjects (laptop,
  // deck) instead of showing only their widest face.
  XRAY_QUARTER: [0.9, 0.42, 0.62],
};

/**
 * How much of the frame the fitted subject fills.
 * `1.0` places the subject's box exactly against the frame edge; below that
 * leaves margin. Values above 1 crop the subject, so they stay at 1.
 */
const SHOT_FILL: Record<ShotType, number> = {
  WIDE: 0.84,
  MEDIUM: 0.94,
  CLOSE: 1.0,
  MACRO: 1.0,
  XRAY_SIDE: 0.9,
  XRAY_QUARTER: 0.96,
};

const CAMERA_FOV = 42;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

/**
 * Deterministic cinematic rig:
 * - Fits any blueprint (laptop or toll road) from its bounding sphere
 * - zoomMultiplier 1.0-2.4 (clamped) changes distance, never the lens
 * - explodeFactor 0-1 (clamped) pulls back slightly so parts stay in frame
 * - spring settle at phase start, constant distance after that (no zoom spikes)
 */
export const CameraRig: React.FC<CameraRigProps> = ({
  shotType = "MEDIUM",
  focusPosition3D,
  frameCenter = [0, 0, 0],
  frameRadius = 4,
  frameSize,
  focusRadius,
  focusSize,
  zoomMultiplier = 1.0,
  explodeFactor = 0.0,
  phaseStartFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  const clampedZoom = clamp(zoomMultiplier, 1.0, 2.4);
  const clampedExplode = clamp(explodeFactor, 0.0, 1.0);

  const { eye, lookTarget } = useMemo(() => {
    const preset = SHOT_DIRECTIONS[shotType] || SHOT_DIRECTIONS.MEDIUM;
    const fill = SHOT_FILL[shotType] ?? SHOT_FILL.MEDIUM;

    // Keep a stable lens for every part of the video.
    if (camera.isPerspectiveCamera) {
      camera.fov = CAMERA_FOV;
      camera.aspect = width / height;
      camera.near = 0.1;
      camera.far = 1000;
      camera.updateProjectionMatrix();
    }

    const vFov = THREE.MathUtils.degToRad(CAMERA_FOV);
    const tanV = Math.tan(vFov / 2);
    const tanH = tanV * (width / height);

    /**
     * Exact distance at which a box, seen from `dir`, touches the frame edge.
     * Projecting the eight corners (instead of using the bounding sphere or the
     * box diagonal) is what keeps a wide deck or an open laptop both whole and
     * as large as a 9:16 frame allows.
     */
    const fitBox = (
      center: [number, number, number],
      size: [number, number, number],
      dir: THREE.Vector3
    ) => {
      const worldUp = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(worldUp, dir);
      if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
      right.normalize();
      const up = new THREE.Vector3().crossVectors(dir, right).normalize();

      const hx = Math.max(0.05, size[0] / 2);
      const hy = Math.max(0.05, size[1] / 2);
      const hz = Math.max(0.05, size[2] / 2);

      let need = 0;
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          for (const sz of [-1, 1]) {
            const p = new THREE.Vector3(sx * hx, sy * hy, sz * hz);
            const depth = p.dot(dir);
            need = Math.max(
              need,
              Math.abs(p.dot(right)) / tanH - depth,
              Math.abs(p.dot(up)) / tanV - depth
            );
          }
        }
      }
      return Math.max(1.5, need);
    };

    const dir = new THREE.Vector3(preset[0], preset[1], preset[2]).normalize();
    const useFocus = Boolean(focusPosition3D && focusSize);
    const target = (useFocus ? focusPosition3D! : frameCenter) as [
      number,
      number,
      number
    ];
    const boxSize = (useFocus ? focusSize! : frameSize) ?? [
      frameRadius * 2,
      frameRadius * 2,
      frameRadius * 2,
    ];

    // A focused close-up frames the part, but never tighter than 42% of the
    // whole subject, so a CPU die does not become an abstract slab.
    const wholeFit = fitBox(frameCenter, frameSize ?? boxSize, dir);
    const focusFit = useFocus
      ? Math.max(wholeFit * 0.42, fitBox(target, boxSize, dir))
      : wholeFit;

    // Larger `fill` means a tighter shot, so it divides the fitted distance.
    const targetDist =
      (focusFit / (fill * clampedZoom)) * (1 + 0.04 * clampedExplode);

    // Spring settle from a slightly wider start so each phase opens smoothly.
    const settle = spring({
      frame: Math.max(0, frame - phaseStartFrame),
      fps,
      config: { damping: 22, mass: 0.9, stiffness: 110, overshootClamping: true },
    });
    const currentDist = targetDist * (1 + 0.12 * (1 - settle));

    // Subtle deterministic drift for a live hologram feel.
    const drift = Math.sin((frame / fps) * 0.22) * 0.06;

    const cos = Math.cos(drift);
    const sin = Math.sin(drift);
    const rotatedX = dir.x * cos - dir.z * sin;
    const rotatedZ = dir.x * sin + dir.z * cos;

    return {
      eye: [
        target[0] + rotatedX * currentDist,
        target[1] + dir.y * currentDist,
        target[2] + rotatedZ * currentDist,
      ] as [number, number, number],
      lookTarget: [target[0], target[1], target[2]] as [number, number, number],
    };
  }, [
    camera,
    shotType,
    focusPosition3D,
    frameCenter,
    frameRadius,
    frameSize,
    focusRadius,
    focusSize,
    clampedZoom,
    clampedExplode,
    frame,
    fps,
    width,
    height,
    phaseStartFrame,
  ]);

  camera.position.set(eye[0], eye[1], eye[2]);
  camera.lookAt(lookTarget[0], lookTarget[1], lookTarget[2]);

  return null;
};
