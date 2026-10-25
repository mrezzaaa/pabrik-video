import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface RoadProps {
  length?: number;
  width?: number;
  thickness?: number;
  lanes?: number;
  hasCars?: boolean;
  style?: string;
}

/**
 * Creates an elevated transparent X-ray road/highway deck (referensi Foto Test 1):
 * - Transparent blue road deck
 * - Median and lane divider stripes
 * - Shoulder guardrails
 * - Optional miniature X-ray vehicles with orange powertrains
 */
export function createRoad({
  length = 16,
  width = 2.6,
  thickness = 0.18,
  lanes = 4,
  hasCars = true,
  style = "xray-blue",
}: RoadProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveRoad";

  // 1. Main Transparent Road Slab
  const deckGeo = new THREE.BoxGeometry(width, thickness, length);
  const deckMesh = new THREE.Mesh(deckGeo, xrayBlueMaterial);
  group.add(deckMesh);
  group.add(createWireframeOverlay(deckGeo, 0x00d4ff));

  // 2. Guardrails on both sides
  const railHeight = 0.25;
  const railThick = 0.08;
  const railGeo = new THREE.BoxGeometry(railThick, railHeight, length);

  const leftRail = new THREE.Mesh(railGeo, xrayBlueLightMaterial);
  leftRail.position.set(-width / 2 + railThick / 2, railHeight / 2 + thickness / 2, 0);
  group.add(leftRail);
  group.add(createWireframeOverlay(railGeo, 0x66e0ff));

  const rightRail = new THREE.Mesh(railGeo, xrayBlueLightMaterial);
  rightRail.position.set(width / 2 - railThick / 2, railHeight / 2 + thickness / 2, 0);
  group.add(rightRail);

  // 3. Lane Dash Markings (wireframe strips)
  const dashCount = Math.floor(length / 1.2);
  const dashGeo = new THREE.BoxGeometry(0.06, 0.02, 0.5);
  const dashMat = new THREE.MeshBasicMaterial({
    color: 0x66e0ff,
    transparent: true,
    opacity: 0.8,
  });

  for (let i = 0; i < dashCount; i++) {
    const zPos = -length / 2 + 0.6 + i * 1.2;
    // Center dashed divider
    const centerDash = new THREE.Mesh(dashGeo, dashMat);
    centerDash.position.set(0, thickness / 2 + 0.01, zPos);
    group.add(centerDash);

    // Quarter lane dividers for 4-lane feel
    if (lanes >= 4) {
      const leftDash = new THREE.Mesh(dashGeo, dashMat);
      leftDash.position.set(-width / 4, thickness / 2 + 0.01, zPos);
      group.add(leftDash);

      const rightDash = new THREE.Mesh(dashGeo, dashMat);
      rightDash.position.set(width / 4, thickness / 2 + 0.01, zPos);
      group.add(rightDash);
    }
  }

  // 4. Optional miniature X-Ray vehicles (blue transparent body + orange engine core)
  if (hasCars) {
    const carPositions = [
      { x: -width / 4, z: -3.5, heading: 0 },
      { x: -width / 4, z: 2.5, heading: 0 },
      { x: width / 4, z: -1.0, heading: Math.PI },
      { x: width / 4, z: 4.8, heading: Math.PI },
    ];

    for (const cp of carPositions) {
      const carGroup = new THREE.Group();
      carGroup.position.set(cp.x, thickness / 2 + 0.16, cp.z);
      carGroup.rotation.y = cp.heading;

      // Car chassis/body
      const carBodyGeo = new THREE.BoxGeometry(0.55, 0.28, 1.1);
      const carBody = new THREE.Mesh(carBodyGeo, xrayBlueMaterial);
      carGroup.add(carBody);
      carGroup.add(createWireframeOverlay(carBodyGeo, 0x00d4ff));

      // Car engine / drivetrain (glowing orange core inside transparent body)
      const engineGeo = new THREE.BoxGeometry(0.25, 0.16, 0.35);
      const engineMesh = new THREE.Mesh(engineGeo, xrayOrangeMaterial);
      engineMesh.position.set(0, -0.04, 0.28);
      carGroup.add(engineMesh);
      carGroup.add(createWireframeOverlay(engineGeo, 0xff4500));

      // Drivetrain shaft
      const shaftGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.6, 12);
      shaftGeo.rotateX(Math.PI / 2);
      const shaftMesh = new THREE.Mesh(shaftGeo, xrayOrangeMaterial);
      shaftMesh.position.set(0, -0.06, -0.15);
      carGroup.add(shaftMesh);

      group.add(carGroup);
    }
  }

  return group;
}
