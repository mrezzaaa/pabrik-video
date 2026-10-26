import * as THREE from "three";
import { xrayBlueMaterial, createWireframeOverlay } from "../materials/xray.material";
import { createWireframeTerrainMesh } from "../materials/wireframe-terrain.material";

export interface PlaneProps {
  width?: number;
  height?: number;
  segmentsX?: number;
  segmentsY?: number;
  wireframeOnly?: boolean;
  style?: string;
  elevation?: number;
}

/**
 * Flat X-ray floor OR undulating neon terrain.
 *
 * "wireframe-green" gives the reference hologram terrain (dense 100x100 wireframe
 * grid with mountain/valley waves flattened at the centre where the subject sits).
 * Every other style is a transparent technical floor plate.
 */
export function createPlane({
  width = 12,
  height = 12,
  segmentsX = 100,
  segmentsY = 100,
  wireframeOnly = false,
  style = "xray-blue",
  elevation = 1.6,
}: PlaneProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitivePlane";

  if (style === "wireframe-green" || style === "wireframe-blue") {
    // Dense hologram terrain. Keep the grid readable even if the LLM under-specs it.
    const segX = Math.max(48, Math.round(segmentsX));
    const segY = Math.max(48, Math.round(segmentsY));
    const terrain = createWireframeTerrainMesh(
      width,
      height,
      segX,
      segY,
      Math.max(0.4, elevation)
    );
    if (style === "wireframe-blue") {
      const material = (terrain.material as THREE.MeshBasicMaterial).clone();
      material.color = new THREE.Color(0x38bdf8);
      terrain.material = material;
    }
    group.add(terrain);
    return group;
  }
  const geo = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
  geo.rotateX(-Math.PI / 2); // flat horizontal floor

  if (!wireframeOnly) {
    const mesh = new THREE.Mesh(geo, xrayBlueMaterial);
    group.add(mesh);
  }

  group.add(createWireframeOverlay(geo, 0x00d4ff));

  return group;
}
