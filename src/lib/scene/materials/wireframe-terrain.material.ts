import * as THREE from "three";

export const wireframeTerrainMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
  transparent: true,
  opacity: 0.55,
  vertexColors: true,
});

/** Softer, darker green that sits behind the subject instead of competing. */
export function createTerrainMaterial(color = 0x16c455, opacity = 0.34) {
  return new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity,
    vertexColors: true,
    depthWrite: false,
  });
}

/**
 * Creates undulating neon green wireframe terrain (referensi 1000_F_188692916).
 *
 * Vertex colours fade the grid out towards the rim so the plane dissolves into
 * the black background instead of ending on a hard rectangle. The centre stays
 * flat so the subject sits on level ground.
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
  const maxDist = Math.sqrt((width / 2) ** 2 + (depth / 2) ** 2);
  const colors = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const distFromCenter = Math.sqrt(x * x + z * z);

    // Undulating mountain & valley wave function
    const wave =
      Math.sin(x * 0.45) * Math.cos(z * 0.45) * 1.2 +
      Math.sin(x * 0.9 + 1.2) * 0.5 +
      Math.cos(z * 0.75) * 0.6;

    // Flatten the centre so roads/vehicles have level ground.
    const centerFalloff = Math.min(1.0, Math.pow(distFromCenter / 4.0, 1.8));
    const y = Math.max(0, wave * maxElevation * centerFalloff);
    pos.setY(i, y);

    // Radial brightness falloff (centre 1.0 -> rim 0.12).
    const d = Math.min(1, distFromCenter / maxDist);
    const fade = 1 - THREE.MathUtils.smoothstep(d, 0.45, 1.0);
    const brightness = 0.12 + 0.88 * fade;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }

  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = createTerrainMaterial().clone();
  return new THREE.Mesh(geometry, material);
}
