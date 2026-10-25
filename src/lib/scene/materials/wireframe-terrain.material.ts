import * as THREE from "three";

export const wireframeTerrainMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
  transparent: true,
  opacity: 0.55,
});

export const wireframeTerrainDenseMaterial = new THREE.MeshBasicMaterial({
  color: 0x22ff55,
  wireframe: true,
  transparent: true,
  opacity: 0.75,
});

/**
 * Creates undulating neon green wireframe terrain mesh (referensi 1000_F_188692916)
 */
export function createWireframeTerrainMesh(
  width = 24,
  depth = 24,
  segmentsX = 40,
  segmentsY = 40,
  maxElevation = 2.5
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, depth, segmentsX, segmentsY);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Undulating mountain & valley wave function
    const distFromCenter = Math.sqrt(x * x + z * z);
    const wave =
      Math.sin(x * 0.45) * Math.cos(z * 0.45) * 1.2 +
      Math.sin(x * 0.9 + 1.2) * 0.5 +
      Math.cos(z * 0.75) * 0.6;
    // Flatten center area slightly for subjects (roads/vehicles/buildings)
    const centerFalloff = Math.min(1.0, Math.pow(distFromCenter / 4.0, 1.8));
    const y = Math.max(0, wave * maxElevation * centerFalloff);
    pos.setY(i, y);
  }
  geometry.computeVertexNormals();

  return new THREE.Mesh(geometry, wireframeTerrainMaterial);
}
