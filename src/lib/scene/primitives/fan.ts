import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface FanProps {
  blades?: number;
  radius?: number;
  thickness?: number;
  hubRadius?: number;
  hubDepth?: number;
  boltCount?: number;
  pitch?: number;
  style?: string;
  color?: string;
  wireframe?: boolean;
}

/**
 * Authentic 3D turbofan / compressor / impeller:
 * - 3-part cylindrical hub (front spinner, side wall with real depth, rear plate)
 * - 14-18 twisted airfoil blades with real thickness (NOT flat umbrella triangles)
 * - 6 bolt heads on the hub face
 * - Outer shroud ring
 * - Axis is local +Z so the whole group spins around its own centre (rotateZ only)
 *
 * `radius` is the blade tip radius in scene units; 1.0 scene unit ≈ 100 px of the
 * reference drawing, so hub depth defaults to ~0.25 * radius (the "25px hub").
 */
export function createFan({
  blades = 16,
  radius = 1.1,
  thickness = 0.05,
  hubRadius = Math.max(0.18, radius * 0.34),
  hubDepth = radius * 0.25,
  boltCount = 6,
  pitch = 0.34,
  style = "xray-blue",
}: FanProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveFan";

  const bladeCount = Math.min(18, Math.max(14, Math.round(blades)));
  const bladeThickness = Math.max(0.02, thickness);
  const span = Math.max(0.12, radius - hubRadius * 0.92);

  let mat: THREE.Material = xrayBlueMaterial;
  let hubMat: THREE.Material = xrayBlueDarkMaterial;
  let boltMat: THREE.Material = xrayBlueLightMaterial;
  let wireColor = 0x00d4ff;

  if (style === "xray-orange") {
    mat = xrayOrangeMaterial;
    hubMat = xrayOrangeMaterial;
    boltMat = xrayOrangeMaterial;
    wireColor = 0xff4500;
  } else if (style === "xray-blue-light") {
    mat = xrayBlueLightMaterial;
    hubMat = xrayBlueMaterial;
    boltMat = xrayBlueDarkMaterial;
    wireColor = 0x66e0ff;
  } else if (style === "xray-blue-dark") {
    mat = xrayBlueDarkMaterial;
    hubMat = xrayBlueMaterial;
    boltMat = xrayBlueLightMaterial;
    wireColor = 0x0088cc;
  }

  /* ---------------------------------------------------------------- */
  /* 1. Hub — three real parts so it reads as a cylinder, not a disc  */
  /* ---------------------------------------------------------------- */

  // 1a. Side wall (the depth of the hub)
  const hubWallGeo = new THREE.CylinderGeometry(hubRadius, hubRadius, hubDepth, 40, 1, true);
  hubWallGeo.rotateX(Math.PI / 2); // axis -> Z
  const hubWall = new THREE.Mesh(hubWallGeo, hubMat);
  group.add(hubWall);
  group.add(createWireframeOverlay(hubWallGeo, wireColor));

  // 1b. Rear plate (darker, sits behind the blades)
  const rearGeo = new THREE.CircleGeometry(hubRadius, 40);
  rearGeo.translate(0, 0, -hubDepth / 2);
  const rearPlate = new THREE.Mesh(rearGeo, hubMat);
  group.add(rearPlate);

  // 1c. Front face + spinner nose
  const frontGeo = new THREE.CircleGeometry(hubRadius, 40);
  frontGeo.translate(0, 0, hubDepth / 2);
  const frontFace = new THREE.Mesh(frontGeo, mat);
  group.add(frontFace);

  const noseHeight = hubDepth * 0.85;
  const noseGeo = new THREE.ConeGeometry(hubRadius * 0.92, noseHeight, 40);
  noseGeo.rotateX(Math.PI / 2);
  noseGeo.translate(0, 0, hubDepth / 2 + noseHeight / 2);
  const nose = new THREE.Mesh(noseGeo, hubMat);
  group.add(nose);
  group.add(createWireframeOverlay(noseGeo, wireColor));

  /* ---------------------------------------------------------------- */
  /* 2. Bolt circle on the hub face                                    */
  /* ---------------------------------------------------------------- */

  const boltGeo = new THREE.CylinderGeometry(
    Math.max(0.012, hubRadius * 0.075),
    Math.max(0.012, hubRadius * 0.075),
    bladeThickness * 0.9,
    12
  );
  boltGeo.rotateX(Math.PI / 2);
  for (let i = 0; i < boltCount; i++) {
    const angle = (i / boltCount) * Math.PI * 2;
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(
      Math.cos(angle) * hubRadius * 0.66,
      Math.sin(angle) * hubRadius * 0.66,
      hubDepth / 2 + bladeThickness * 0.45
    );
    group.add(bolt);
  }

  /* ---------------------------------------------------------------- */
  /* 3. Blades — extruded airfoil quads with real side walls            */
  /* ---------------------------------------------------------------- */

  const chordRoot = ((2 * Math.PI * hubRadius) / bladeCount) * 0.92;
  const chordTip = ((2 * Math.PI * radius) / bladeCount) * 0.62;

  const shape = new THREE.Shape();
  shape.moveTo(-chordRoot / 2, 0);
  shape.lineTo(chordRoot / 2, 0);
  shape.lineTo(chordTip / 2, span * 0.94);
  shape.quadraticCurveTo(chordTip * 0.18, span * 1.02, -chordTip / 2, span * 0.94);
  shape.lineTo(-chordRoot / 2, 0);

  const bladeGeo = new THREE.ExtrudeGeometry(shape, {
    depth: bladeThickness,
    bevelEnabled: true,
    bevelThickness: bladeThickness * 0.18,
    bevelSize: bladeThickness * 0.4,
    bevelSegments: 1,
    curveSegments: 6,
  });
  bladeGeo.translate(0, 0, -bladeThickness / 2);
  bladeGeo.computeVertexNormals();

  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2;

    // Parent carries the radial placement + spin angle.
    const bladePivot = new THREE.Group();
    bladePivot.rotation.z = angle;

    // Child carries the blade mesh + its edge overlay in the same transform.
    const bladeAssembly = new THREE.Group();
    bladeAssembly.position.set(0, hubRadius * 0.9, 0);
    // Twist the chord around the radial (Y) axis so the fan looks aerodynamic.
    bladeAssembly.rotation.x = -pitch;

    const blade = new THREE.Mesh(bladeGeo, mat);
    bladeAssembly.add(blade);
    bladeAssembly.add(createWireframeOverlay(bladeGeo, wireColor));

    bladePivot.add(bladeAssembly);
    group.add(bladePivot);
  }

  /* ---------------------------------------------------------------- */
  /* 4. Shroud / casing ring                                           */
  /* ---------------------------------------------------------------- */

  const shroudGeo = new THREE.TorusGeometry(
    radius + bladeThickness,
    Math.max(0.015, bladeThickness * 0.45),
    16,
    64
  );
  const shroud = new THREE.Mesh(shroudGeo, hubMat);
  group.add(shroud);
  group.add(createWireframeOverlay(shroudGeo, wireColor));

  return group;
}
