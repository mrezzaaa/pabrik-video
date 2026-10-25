import * as THREE from "three";

export interface CutawayOptions {
  enabled: boolean;
  normal?: [number, number, number];
  constant?: number;
}

/**
 * Cutaway behavior (Section 3.4):
 * Uses Three.js clipping plane or visibility toggle for cutaway inspection
 */
export function createCutawayPlane({
  enabled,
  normal = [0, 0, -1],
  constant = 0,
}: CutawayOptions): THREE.Plane[] {
  if (!enabled) return [];
  const planeNormal = new THREE.Vector3(normal[0], normal[1], normal[2]).normalize();
  return [new THREE.Plane(planeNormal, constant)];
}

export function isComponentVisibleInCutaway(
  componentId: string,
  visibleComponentIds?: string[],
  cutawayEnabled = false
): boolean {
  if (!cutawayEnabled || !visibleComponentIds || visibleComponentIds.length === 0) {
    return true;
  }
  return visibleComponentIds.includes(componentId);
}
