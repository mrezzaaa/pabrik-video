import * as THREE from "three";
import {
  xrayBlueMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";
import { wireframeTerrainMaterial } from "../materials/wireframe-terrain.material";

export interface PlaneProps {
  width?: number;
  height?: number;
  segmentsX?: number;
  segmentsY?: number;
  wireframeOnly?: boolean;
  style?: string;
}

/**
 * Creates a planar 3D surface or neon grid substrate
 */
export function createPlane({
  width = 6,
  height = 6,
  segmentsX = 20,
  segmentsY = 20,
  wireframeOnly = false,
  style = "xray-blue",
}: PlaneProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitivePlane";

  const geo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
  geo.rotateX(-Math.PI / 2); // Default flat horizontal ground

  const mat =
    style === "wireframe-green"
      ? wireframeTerrainMaterial
      : xrayBlueMaterial;

  if (!wireframeOnly) {
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
  }

  const wireColor = style === "wireframe-green" ? 0x00ff00 : 0x00d4ff;
  group.add(createWireframeOverlay(geo, wireColor));

  return group;
}
