import * as THREE from "three";
import { createBlueprintMaterial } from "../materials";

export interface FanProps {
  blades?: number;
  radius?: number;
  thickness?: number;
  hubRadius?: number;
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a Three.js Fan Group:
 * - Center cylinder hub
 * - Torus outer housing / shroud
 * - Angled aerodynamic fan blades around the hub
 * - Pivot at (0, 0, 0) for natural unscaled axial rotation
 */
export function createFan({
  blades = 18,
  radius = 1.2,
  thickness = 0.25,
  hubRadius = 0.35,
  color,
  wireframe = false,
}: FanProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveFan";

  const mat = createBlueprintMaterial(color, wireframe);
  const wireMat = createBlueprintMaterial(color, true);

  // 1. Center Hub (cylinder oriented along Z-axis)
  const hubGeo = new THREE.CylinderGeometry(
    hubRadius,
    hubRadius * 1.1,
    thickness * 1.2,
    32
  );
  hubGeo.rotateX(Math.PI / 2); // align to Z
  const hubMesh = new THREE.Mesh(hubGeo, mat);
  group.add(hubMesh);

  // Nose cone on hub
  const noseGeo = new THREE.ConeGeometry(hubRadius, thickness * 1.5, 32);
  noseGeo.rotateX(Math.PI / 2);
  noseGeo.translate(0, 0, thickness * 0.7);
  const noseMesh = new THREE.Mesh(noseGeo, mat);
  group.add(noseMesh);

  // 2. Outer Torus Shroud / Ring
  const torusGeo = new THREE.TorusGeometry(
    radius,
    thickness * 0.18,
    16,
    48
  );
  const torusMesh = new THREE.Mesh(torusGeo, wireMat);
  group.add(torusMesh);

  // 3. Aerodynamic Fan Blades distributed radially
  const bladeLength = Math.max(0.2, radius - hubRadius * 0.95);
  const bladeWidth = (2 * Math.PI * radius) / blades * 0.75;
  const bladeGeo = new THREE.BoxGeometry(
    bladeWidth,
    bladeLength,
    thickness * 0.15
  );

  const angleStep = (Math.PI * 2) / blades;
  for (let i = 0; i < blades; i++) {
    const angle = i * angleStep;
    const bladeMesh = new THREE.Mesh(bladeGeo, mat);

    // Position blade between hub and outer rim
    const rMid = hubRadius + bladeLength / 2;
    bladeMesh.position.set(
      Math.cos(angle) * rMid,
      Math.sin(angle) * rMid,
      0
    );

    // Rotate blade to radial angle + aerodynamic pitch twist
    bladeMesh.rotation.z = angle - Math.PI / 2;
    bladeMesh.rotation.y = 0.45; // pitch angle for natural jet fan look

    group.add(bladeMesh);
  }

  return group;
}
