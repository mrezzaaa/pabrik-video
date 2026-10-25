import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface SphereProps {
  radius?: number;
  segments?: number;
  style?: string;
  color?: string;
}

/**
 * Creates a 3D Sphere primitive with X-ray transparency & wireframe overlay
 * (used for droplets, condensation nuclei, atoms, ball bearings)
 */
export function createSphere({
  radius = 0.6,
  segments = 32,
  style = "xray-blue",
}: SphereProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveSphere";

  const geo = new THREE.SphereGeometry(radius, segments, segments);

  let mat = xrayBlueMaterial;
  let wireColor = 0x00d4ff;

  if (style === "xray-orange") {
    mat = xrayOrangeMaterial;
    wireColor = 0xff4500;
  } else if (style === "xray-blue-light") {
    mat = xrayBlueLightMaterial;
    wireColor = 0x66e0ff;
  }

  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  group.add(createWireframeOverlay(geo, wireColor));

  return group;
}
