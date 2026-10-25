import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface PillarProps {
  height?: number;
  radius?: number;
  capWidth?: number;
  hasFooting?: boolean;
  style?: string;
}

/**
 * Creates an elevated highway bridge pier / pillar (referensi Foto Test 1):
 * - Pier cap crossbeam at top supporting road
 * - Main tall support shaft/column
 * - Foundation pile cap at bottom
 */
export function createPillar({
  height = 4.0,
  radius = 0.38,
  capWidth = 2.8,
  hasFooting = true,
  style = "xray-blue",
}: PillarProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitivePillar";

  // 1. Hammerhead / Pier Cap at Top
  const capHeight = 0.45;
  const capDepth = 0.7;
  const capGeo = new THREE.BoxGeometry(capWidth, capHeight, capDepth);
  const capMesh = new THREE.Mesh(capGeo, xrayBlueMaterial);
  capMesh.position.set(0, height / 2 - capHeight / 2, 0);
  group.add(capMesh);
  group.add(createWireframeOverlay(capGeo, 0x00d4ff));

  // 2. Main Vertical Column Shaft
  const shaftHeight = height - capHeight - (hasFooting ? 0.3 : 0);
  const shaftGeo = new THREE.CylinderGeometry(radius, radius * 1.1, shaftHeight, 24);
  const shaftMesh = new THREE.Mesh(shaftGeo, xrayBlueDarkMaterial);
  shaftMesh.position.set(0, (height / 2 - capHeight) - shaftHeight / 2, 0);
  group.add(shaftMesh);
  group.add(createWireframeOverlay(shaftGeo, 0x00d4ff));

  // 3. Foundation Footing / Pile Cap at Ground Level
  if (hasFooting) {
    const footWidth = radius * 3.2;
    const footHeight = 0.35;
    const footGeo = new THREE.BoxGeometry(footWidth, footHeight, footWidth);
    const footMesh = new THREE.Mesh(footGeo, xrayBlueMaterial);
    footMesh.position.set(0, -height / 2 + footHeight / 2, 0);
    group.add(footMesh);
    group.add(createWireframeOverlay(footGeo, 0x00d4ff));
  }

  return group;
}
