import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  xrayGhostMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";
import { wireframeTerrainMaterial } from "../materials/wireframe-terrain.material";

export interface BoxProps {
  width?: number;
  height?: number;
  depth?: number;
  style?: string;
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a 3D Box primitive with X-ray transparency & wireframe overlay
 * (used for chassis, battery, motherboard, engine blocks, substrate plates)
 */
export function createBox({
  width = 1,
  height = 1,
  depth = 1,
  style = "xray-blue",
}: BoxProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveBox";

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
  } else if (style === "xray-ghost") {
    mat = xrayGhostMaterial;
    wireColor = 0x00d4ff;
  } else if (style === "wireframe-green") {
    mat = wireframeTerrainMaterial;
    wireColor = 0x00ff00;
  }

  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);
  group.add(createWireframeOverlay(geo, wireColor));

  return group;
}
