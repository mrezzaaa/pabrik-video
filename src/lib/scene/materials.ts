import * as THREE from "three";

export const BLUEPRINT_CYAN = "#00D4FF";
export const BLUEPRINT_CORE = "#041527";

/**
 * Material blueprint neon biru (#00D4FF) khas kitabedah
 */
export function createBlueprintMaterial(
  color: string = BLUEPRINT_CYAN,
  wireframe: boolean = false
) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(wireframe ? color : BLUEPRINT_CORE),
    emissive: new THREE.Color(color),
    emissiveIntensity: wireframe ? 0.8 : 0.25,
    roughness: 0.3,
    metalness: 0.7,
    wireframe,
    transparent: true,
    opacity: wireframe ? 0.95 : 0.85,
    side: THREE.DoubleSide,
  });
}
