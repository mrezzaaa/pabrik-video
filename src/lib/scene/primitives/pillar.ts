import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  xrayBlueLightMaterial,
  addWireframeOverlay,
} from "../materials/xray.material";

export interface PillarProps {
  height?: number;
  radius?: number;
  capWidth?: number;
  hasFooting?: boolean;
  style?: string;
}

/**
 * Elevated highway pier (referensi: pilar jalan tol x-ray).
 *
 * - Hammerhead pier cap that the deck sits on
 * - Tapered round column (stronger at the base)
 * - Square pile cap / footing at ground level
 *
 * Origin is the centre of the whole pier so a component's `position3D` places
 * the pier's mid-height where the author expects it.
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

  const bodyMat = style === "xray-orange" ? xrayBlueDarkMaterial : xrayBlueMaterial;
  const capMat = style === "xray-blue-light" ? xrayBlueLightMaterial : xrayBlueMaterial;
  const wireColor = style === "xray-orange" ? 0xff4500 : 0x00d4ff;

  const capHeight = Math.max(0.3, height * 0.13);
  const capDepth = Math.max(0.5, radius * 2.1);
  const footHeight = hasFooting ? Math.max(0.22, height * 0.08) : 0;
  const footWidth = radius * 3.4;

  /* 1. Hammerhead pier cap */
  const capGeo = new THREE.BoxGeometry(capWidth, capHeight, capDepth);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.set(0, height / 2 - capHeight / 2, 0);
  group.add(cap);
  addWireframeOverlay(group, cap, wireColor);

  // Bearing pads where the deck rests on the cap.
  const padGeo = new THREE.BoxGeometry(capWidth * 0.11, capHeight * 0.28, capDepth * 0.8);
  for (const sx of [-0.3, 0.3]) {
    const pad = new THREE.Mesh(padGeo, xrayBlueDarkMaterial);
    pad.position.set(sx * capWidth, height / 2 + capHeight * 0.05, 0);
    group.add(pad);
  }

  /* 2. Tapered column */
  const shaftHeight = height - capHeight - footHeight;
  const shaftGeo = new THREE.CylinderGeometry(radius, radius * 1.16, shaftHeight, 28, 1);
  const shaft = new THREE.Mesh(shaftGeo, bodyMat);
  shaft.position.set(0, -height / 2 + footHeight + shaftHeight / 2, 0);
  group.add(shaft);
  addWireframeOverlay(group, shaft, wireColor);

  /* 3. Pile cap / footing */
  if (hasFooting) {
    const footGeo = new THREE.BoxGeometry(footWidth, footHeight, footWidth);
    const foot = new THREE.Mesh(footGeo, bodyMat);
    foot.position.set(0, -height / 2 + footHeight / 2, 0);
    group.add(foot);
    addWireframeOverlay(group, foot, wireColor);

    // Chamfered pedestal between footing and column.
    const pedestalGeo = new THREE.CylinderGeometry(
      radius * 1.3,
      radius * 1.7,
      footHeight * 0.9,
      24
    );
    const pedestal = new THREE.Mesh(pedestalGeo, xrayBlueDarkMaterial);
    pedestal.position.set(0, -height / 2 + footHeight + footHeight * 0.35, 0);
    group.add(pedestal);
  }

  return group;
}
