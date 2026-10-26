import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface CarProps {
  length?: number;
  width?: number;
  height?: number;
  style?: string;
  color?: string;
}

/**
 * X-ray vehicle (referensi: mobil tembus pandang dengan mesin oranye).
 *
 * Translucent body + cabin, four dark wheels, glowing orange engine block and
 * driveshaft. Origin sits on the ground plane (y = 0), nose towards -Z.
 */
export function createCar({
  length = 1.0,
  width = 0.46,
  height = 0.3,
  style = "xray-blue",
}: CarProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveCar";

  const bodyHeight = height * 0.45;
  const cabinHeight = height * 0.42;
  const wheelRadius = height * 0.24;
  const wheelWidth = width * 0.14;

  let bodyMat: THREE.Material = xrayBlueMaterial;
  let cabinMat: THREE.Material = xrayBlueLightMaterial;
  let wheelMat: THREE.Material = xrayBlueDarkMaterial;
  let engineMat: THREE.Material = xrayOrangeMaterial;
  let wireColor = 0x00d4ff;

  if (style === "xray-orange") {
    bodyMat = xrayOrangeMaterial;
    cabinMat = xrayOrangeMaterial;
    engineMat = xrayBlueLightMaterial;
    wireColor = 0xff4500;
  }

  /** Adds a mesh and its edge overlay at the same transform. */
  const addPair = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number],
    overlayColor = wireColor
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    group.add(mesh);
    const overlay = createWireframeOverlay(geometry, overlayColor);
    overlay.position.set(...position);
    group.add(overlay);
  };

  /* 1. Lower body */
  const bodyGeo = new THREE.BoxGeometry(width, bodyHeight, length);
  const bodyY = wheelRadius + bodyHeight / 2;
  addPair(bodyGeo, bodyMat, [0, bodyY, 0]);

  /* 2. Cabin (greenhouse) */
  const cabinGeo = new THREE.BoxGeometry(width * 0.82, cabinHeight, length * 0.46);
  const cabinY = bodyY + bodyHeight / 2 + cabinHeight / 2;
  addPair(cabinGeo, cabinMat, [0, cabinY, -length * 0.04]);

  /* 3. Wheels — real cylinders, axis along X */
  const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18);
  wheelGeo.rotateZ(Math.PI / 2);
  const axleZ = length * 0.31;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addPair(
        wheelGeo,
        wheelMat,
        [sx * (width / 2 - wheelWidth * 0.35), wheelRadius, sz * axleZ],
        0x0088cc
      );
    }
  }

  /* 4. Glowing powertrain: engine block + driveshaft */
  const engineGeo = new THREE.BoxGeometry(width * 0.55, bodyHeight * 0.9, length * 0.3);
  addPair(engineGeo, engineMat, [0, bodyY, length * 0.26], 0xff4500);

  const shaftGeo = new THREE.CylinderGeometry(width * 0.035, width * 0.035, length * 0.62, 12);
  shaftGeo.rotateX(Math.PI / 2);
  addPair(
    shaftGeo,
    engineMat,
    [0, wheelRadius + bodyHeight * 0.35, length * 0.02],
    0xff4500
  );

  /* 5. Headlights */
  const lightGeo = new THREE.SphereGeometry(width * 0.055, 10, 10);
  for (const sx of [-1, 1]) {
    addPair(lightGeo, cabinMat, [sx * width * 0.3, bodyY, -length * 0.5]);
  }

  return group;
}
