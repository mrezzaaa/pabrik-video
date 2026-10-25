import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface TorusProps {
  radius?: number;
  tube?: number;
  radialSegments?: number;
  tubularSegments?: number;
  arc?: number;
  axis?: "x" | "y" | "z";
  style?: string;
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a 3D Torus with X-ray transparency & wireframe overlay
 * (used for ring seals, o-rings, coil windings, lip insulators)
 */
export function createTorus({
  radius = 0.8,
  tube = 0.12,
  radialSegments = 24,
  tubularSegments = 48,
  arc = Math.PI * 2,
  axis = "y",
  style = "xray-blue",
}: TorusProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveTorus";

  let mat: THREE.Material = xrayBlueMaterial;
  let wireColor = 0x00d4ff;

  if (style === "xray-orange") {
    mat = xrayOrangeMaterial;
    wireColor = 0xff4500;
  } else if (style === "xray-blue-dark") {
    mat = xrayBlueDarkMaterial;
    wireColor = 0x0088cc;
  } else if (style === "xray-blue-light") {
    mat = xrayBlueLightMaterial;
    wireColor = 0x66e0ff;
  }

  const geo = new THREE.TorusGeometry(
    radius,
    tube,
    radialSegments,
    tubularSegments,
    arc
  );

  // If axis === "y", rotate so ring lies horizontal in XZ plane
  if (axis === "y") geo.rotateX(Math.PI / 2);
  else if (axis === "x") geo.rotateY(Math.PI / 2);

  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  group.add(createWireframeOverlay(geo, wireColor));

  return group;
}
