import * as THREE from 'three';

export const xrayBlueMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x00D4FF,
  emissive: 0x00D4FF,
  emissiveIntensity: 0.5,
  transparent: true,
  opacity: 0.18,
  transmission: 0.92,
  roughness: 0.1,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const xrayBlueDarkMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0088CC,
  emissive: 0x00D4FF,
  emissiveIntensity: 0.3,
  transparent: true,
  opacity: 0.25,
  transmission: 0.8,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const xrayBlueLightMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x66E0FF,
  emissive: 0x66E0FF,
  emissiveIntensity: 0.7,
  transparent: true,
  opacity: 0.22,
  transmission: 0.9,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const xrayOrangeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xFF6B35,
  emissive: 0xFF4500,
  emissiveIntensity: 0.9,
  transparent: true,
  opacity: 0.65,
  transmission: 0.5,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export function createWireframeOverlay(geometry: THREE.BufferGeometry, color = 0x00D4FF) {
  const edges = new THREE.EdgesGeometry(geometry, 15);
  const lineMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
  return new THREE.LineSegments(edges, lineMat);
}

export const fresnelShader = {
  vertexShader: `varying vec3 vNormal; varying vec3 vViewPosition; void main(){vNormal=normalize(normalMatrix*normal); vec4 mvPosition=modelViewMatrix*vec4(position,1.0); vViewPosition=-mvPosition.xyz; gl_Position=projectionMatrix*mvPosition;}`,
  fragmentShader: `varying vec3 vNormal; varying vec3 vViewPosition; uniform vec3 glowColor; uniform float opacity; void main(){vec3 viewDir=normalize(vViewPosition); float fresnel=pow(1.0-dot(vNormal,viewDir),3.0); vec3 glow=glowColor*fresnel*1.5; gl_FragColor=vec4(glow,opacity*(fresnel+0.2));}`,
  uniforms: { glowColor: { value: new THREE.Color(0x00D4FF) }, opacity: { value: 0.6 } },
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
};
