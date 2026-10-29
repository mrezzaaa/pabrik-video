import * as THREE from "three";
import type { CadRuntime, CadSceneMeta, CadShot } from "./contract";

export const CAD_FOV = 38;

/** Jarak kamera supaya model muat di frame (setelah roll) untuk aspect tertentu. */
export function fitDistance(meta: CadSceneMeta, shot: CadShot, aspect: number): number {
  const tan = Math.tan((CAD_FOV * Math.PI) / 360);
  // Saat explode, model melebar: jauhkan kamera supaya part tidak keluar frame.
  const r = meta.radius * (1 + (meta.explodeExtent ?? 0.5) * shot.explode);
  const horizontal = (r * Math.abs(Math.cos(shot.roll)) * 1.08) / (tan * aspect);
  const vertical = (r * Math.abs(Math.sin(shot.roll)) + r * 0.35) / tan;
  return Math.max(horizontal, vertical) / Math.max(0.1, shot.zoom);
}

/** Pasang pose kamera untuk shot pada waktu t. Dipakai renderer dan proyeksi label (satu sumber). */
export function applyCamera(
  camera: THREE.PerspectiveCamera,
  meta: CadSceneMeta,
  runtime: CadRuntime,
  shot: CadShot,
  t: number,
  aspect: number,
): void {
  const target = new THREE.Vector3();
  if (shot.focus && shot.focusMix > 0) {
    target.copy(runtime.anchor(shot.focus)).multiplyScalar(shot.focusMix);
  }
  const az = shot.azimuth + shot.orbit * t;
  const d = fitDistance(meta, shot, aspect);
  const el = shot.elevation;
  camera.fov = CAD_FOV;
  camera.aspect = aspect;
  camera.near = 0.1;
  camera.far = 400;
  camera.up.set(0, 1, 0);
  camera.position.set(
    target.x + d * Math.sin(az) * Math.cos(el),
    target.y + d * Math.sin(el),
    target.z + d * Math.cos(az) * Math.cos(el),
  );
  camera.lookAt(target);
  camera.rotateZ(shot.roll);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}
