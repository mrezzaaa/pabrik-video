import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
  addWireframeOverlay,
} from "../materials/xray.material";
import { createCar } from "./car";

export interface RoadProps {
  length?: number;
  width?: number;
  thickness?: number;
  lanes?: number;
  hasCars?: boolean;
  style?: string;
}

/**
 * Elevated transparent X-ray highway deck (referensi: jalan tol elevated).
 *
 * Cross-section, top to bottom:
 * - asphalt deck slab
 * - one deep box girder (not a stack of plates)
 * - internal diaphragms every ~2 units
 * - parapets + continuous edge lines + dashed lane dividers on top
 */
export function createRoad({
  length = 9,
  width = 2.6,
  thickness = 0.18,
  lanes = 4,
  hasCars = false,
  style = "xray-blue",
}: RoadProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveRoad";

  const deckMat = style === "xray-orange" ? xrayOrangeMaterial : xrayBlueMaterial;
  const edgeMat = xrayBlueLightMaterial;
  const wireColor = 0x00d4ff;

  /* 1. Main deck slab */
  const deckGeo = new THREE.BoxGeometry(width, thickness, length);
  const deck = new THREE.Mesh(deckGeo, deckMat);
  group.add(deck);
  group.add(createWireframeOverlay(deckGeo, wireColor));

  /* 2. Box girder — a single deep box under the deck */
  const girderDepth = Math.max(0.16, thickness * 1.4);
  const girderWidth = width * 0.66;
  const girderGeo = new THREE.BoxGeometry(girderWidth, girderDepth, length * 0.985);
  const girder = new THREE.Mesh(girderGeo, xrayBlueLightMaterial);
  girder.position.set(0, -thickness / 2 - girderDepth / 2, 0);
  group.add(girder);
  addWireframeOverlay(group, girder, 0x66e0ff);

  /* 3. Internal diaphragms (what stiffens the box) */
  const diaphragmGeo = new THREE.BoxGeometry(
    girderWidth * 0.9,
    girderDepth * 0.86,
    Math.max(0.03, girderDepth * 0.16)
  );
  const diaphragmCount = Math.max(2, Math.round(length / 1.8));
  for (let i = 0; i < diaphragmCount; i++) {
    const diaphragm = new THREE.Mesh(diaphragmGeo, xrayBlueLightMaterial);
    const z = -length / 2 + (i + 0.5) * (length / diaphragmCount);
    diaphragm.position.set(0, -thickness / 2 - girderDepth / 2, z);
    group.add(diaphragm);
  }

  /* 4. Parapets (concrete barrier walls) */
  const parapetHeight = Math.max(0.18, thickness * 1.3);
  const parapetThickness = Math.max(0.04, width * 0.022);
  const parapetGeo = new THREE.BoxGeometry(parapetThickness, parapetHeight, length);
  for (const side of [-1, 1]) {
    const parapet = new THREE.Mesh(parapetGeo, edgeMat);
    parapet.position.set(
      side * (width / 2 - parapetThickness / 2),
      thickness / 2 + parapetHeight / 2,
      0
    );
    group.add(parapet);
    addWireframeOverlay(group, parapet, 0x66e0ff);
  }

  /* 5. Road markings, drawn on the deck surface */
  const topY = thickness / 2 + 0.006;
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0x8ef0ff,
    transparent: true,
    opacity: 0.9,
  });

  // Continuous edge lines
  const edgeGeo = new THREE.BoxGeometry(0.035, 0.008, length * 0.97);
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(edgeGeo, lineMat);
    edge.position.set(side * (width / 2 - parapetThickness - 0.09), topY, 0);
    group.add(edge);
  }

  // Dashed lane dividers
  const laneCount = Math.max(1, Math.round(lanes));
  const dashCount = Math.max(6, Math.floor(length / 0.9));
  const dashGeo = new THREE.BoxGeometry(0.03, 0.008, Math.min(0.45, length / 14));
  for (let lane = 1; lane < laneCount; lane++) {
    const x = -width / 2 + (lane / laneCount) * width;
    for (let i = 0; i < dashCount; i++) {
      const dash = new THREE.Mesh(dashGeo, lineMat);
      const z = -length / 2 + (i + 0.5) * (length / dashCount);
      dash.position.set(x, topY, z);
      group.add(dash);
    }
  }

  /* 6. Optional vehicles (the scene usually carries them as separate nodes) */
  if (hasCars) {
    const laneX = [-width * 0.3, width * 0.3];
    const slots = [
      { x: laneX[0], z: -length * 0.28, heading: 0 },
      { x: laneX[1], z: length * 0.18, heading: Math.PI },
    ];
    for (const slot of slots) {
      const car = createCar({
        length: Math.max(0.7, width * 0.4),
        width: Math.max(0.3, width * 0.18),
        height: Math.max(0.22, width * 0.11),
      });
      car.position.set(slot.x, thickness / 2, slot.z);
      car.rotation.y = slot.heading;
      group.add(car);
    }
  }

  return group;
}
