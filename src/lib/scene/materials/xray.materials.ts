
// /src/lib/scene/materials/xray.materials.ts
// Universal X-Ray Hologram Materials - untuk jet, mobil, F16, drone, apapun
// Style: blue x-ray transparent kaya referensi lu (Adobe Stock)

import * as THREE from 'three';

// 1. BASE X-RAY BLUE - body utama tembus pandang
export const xrayBlueMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x00D4FF,
  emissive: 0x00D4FF,
  emissiveIntensity: 0.5,
  transparent: true,
  opacity: 0.18, // tembus pandang 18%
  transmission: 0.92, // kaca
  ior: 1.4,
  roughness: 0.1,
  metalness: 0.1,
  side: THREE.DoubleSide,
  depthWrite: false, // biar gak z-fighting pas transparent
});

// 2. X-RAY BLUE DARK - untuk part dalam yang lebih gelap
export const xrayBlueDarkMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0088CC,
  emissive: 0x00D4FF,
  emissiveIntensity: 0.3,
  transparent: true,
  opacity: 0.25,
  transmission: 0.8,
  roughness: 0.2,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// 3. X-RAY BLUE LIGHT - highlight
export const xrayBlueLightMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x66E0FF,
  emissive: 0x66E0FF,
  emissiveIntensity: 0.7,
  transparent: true,
  opacity: 0.22,
  transmission: 0.9,
  roughness: 0.05,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// 4. X-RAY ORANGE - untuk engine/drivetrain highlight kaya mobil foto ke-2 lu
// Mobil: drivetrain orange, Jet: afterburner orange
export const xrayOrangeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xFF6B35,
  emissive: 0xFF4500,
  emissiveIntensity: 0.9,
  transparent: true,
  opacity: 0.65, // lebih solid biar highlight
  transmission: 0.5,
  roughness: 0.15,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// 5. WIREFRAME OVERLAY - garis tepi glowing
export function createWireframeOverlay(geometry: THREE.BufferGeometry, color = 0x00D4FF) {
  const edges = new THREE.EdgesGeometry(geometry, 15); // 15 deg threshold
  const lineMat = new THREE.LineBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.35,
    linewidth: 1,
  });
  return new THREE.LineSegments(edges, lineMat);
}

// 6. FRESNEL GLOW SHADER - biar pinggiran glowing kaya hologram
export const fresnelShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    uniform vec3 glowColor;
    uniform float opacity;
    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - dot(vNormal, viewDir), 3.0);
      vec3 glow = glowColor * fresnel * 1.5;
      gl_FragColor = vec4(glow, opacity * (fresnel + 0.2));
    }
  `,
  uniforms: {
    glowColor: { value: new THREE.Color(0x00D4FF) },
    opacity: { value: 0.6 }
  },
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
};

// USAGE DI KITABEDAHSCENE:
// - Mobil: body = xrayBlueMaterial, engine = xrayOrangeMaterial, chassis = wireframe overlay
// - F16: fuselage = xrayBlueMaterial, cockpit glass = xrayBlueLight, engine F110 = xrayBlueDark, missile = xrayBlueMaterial
// - Jet engine: casing = xrayBlue, turbine = xrayBlueLight, shaft = xrayBlueDark, combustor injectors = xrayOrange
// - Terrain: plane geometry + wireframe green material
