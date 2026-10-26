import * as THREE from 'three';

/**
 * X-ray hologram materials.
 *
 * `transmission` alone is invisible on a pure black background (there is nothing
 * to refract), so the scene installs a low-intensity environment map (see
 * `SceneEnvironment.tsx`) and each material keeps a strong emissive core. The
 * combination reads as glowing transparent glass instead of flat grey plastic.
 */
export const xrayBlueMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x00D4FF,
  emissive: 0x00D4FF,
  emissiveIntensity: 0.55,
  transparent: true,
  opacity: 0.34,
  transmission: 0.72,
  roughness: 0.1,
  metalness: 0.0,
  ior: 1.55,
  thickness: 0.8,
  attenuationColor: new THREE.Color(0x00D4FF),
  attenuationDistance: 2.4,
  envMapIntensity: 0.85,
  clearcoat: 0.6,
  clearcoatRoughness: 0.25,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const xrayBlueDarkMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0088CC,
  emissive: 0x00D4FF,
  emissiveIntensity: 0.35,
  transparent: true,
  opacity: 0.28,
  transmission: 0.75,
  roughness: 0.16,
  metalness: 0.05,
  ior: 1.5,
  thickness: 1.0,
  attenuationColor: new THREE.Color(0x0088CC),
  attenuationDistance: 2.0,
  envMapIntensity: 0.7,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const xrayBlueLightMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x66E0FF,
  emissive: 0x66E0FF,
  emissiveIntensity: 0.8,
  transparent: true,
  opacity: 0.36,
  transmission: 0.78,
  roughness: 0.08,
  metalness: 0.0,
  ior: 1.6,
  thickness: 0.6,
  attenuationColor: new THREE.Color(0x66E0FF),
  attenuationDistance: 3.0,
  envMapIntensity: 1.0,
  clearcoat: 0.8,
  clearcoatRoughness: 0.2,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const xrayOrangeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xFFA864,
  emissive: 0xFF8A28,
  emissiveIntensity: 0.2,
  transparent: true,
  opacity: 0.3,
  transmission: 0.82,
  roughness: 0.24,
  metalness: 0.08,
  ior: 1.45,
  thickness: 0.4,
  attenuationColor: new THREE.Color(0xFF8A28),
  attenuationDistance: 6.0,
  envMapIntensity: 0.9,
  side: THREE.DoubleSide,
  depthWrite: false,
});

/**
 * Ghost shell for outer casings (laptop unibody, covers): almost invisible
 * glass so the internals read through it.
 */
export const xrayGhostMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x22c6f0,
  emissive: 0x00d4ff,
  emissiveIntensity: 0.26,
  transparent: true,
  opacity: 0.2,
  transmission: 0.86,
  roughness: 0.18,
  metalness: 0.0,
  ior: 1.5,
  thickness: 0.4,
  attenuationColor: new THREE.Color(0x00a8e0),
  attenuationDistance: 3.0,
  envMapIntensity: 0.6,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export function createWireframeOverlay(geometry: THREE.BufferGeometry, color = 0x00D4FF) {
  const edges = new THREE.EdgesGeometry(geometry, 15);
  const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.38 });
  return new THREE.LineSegments(edges, lineMat);
}

/**
 * Adds an edge overlay that follows an existing mesh's transform.
 * Adding the overlay at the group origin (the old behaviour) left stray
 * wireframe cubes floating wherever a part was offset from its parent.
 */
export function addWireframeOverlay(
  parent: THREE.Object3D,
  mesh: THREE.Mesh,
  color = 0x00D4FF
) {
  const overlay = createWireframeOverlay(mesh.geometry, color);
  overlay.position.copy(mesh.position);
  overlay.rotation.copy(mesh.rotation);
  overlay.scale.copy(mesh.scale);
  parent.add(overlay);
  return overlay;
}

export const fresnelShader = {
  vertexShader: `varying vec3 vNormal; varying vec3 vViewPosition; void main(){vNormal=normalize(normalMatrix*normal); vec4 mvPosition=modelViewMatrix*vec4(position,1.0); vViewPosition=-mvPosition.xyz; gl_Position=projectionMatrix*mvPosition;}`,
  fragmentShader: `varying vec3 vNormal; varying vec3 vViewPosition; uniform vec3 glowColor; uniform float opacity; void main(){vec3 viewDir=normalize(vViewPosition); float fresnel=pow(1.0-dot(vNormal,viewDir),3.0); vec3 glow=glowColor*fresnel*1.5; gl_FragColor=vec4(glow,opacity*(fresnel+0.2));}`,
  uniforms: { glowColor: { value: new THREE.Color(0x00D4FF) }, opacity: { value: 0.6 } },
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
};
