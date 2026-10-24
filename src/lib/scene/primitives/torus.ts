import * as THREE from "three";
import { createBlueprintMaterial } from "../materials";

export interface TorusProps {
  radius?: number;
  tube?: number;
  radialSegments?: number;
  tubularSegments?: number;
  arc?: number;
  axis?: "x" | "y" | "z";
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a proper 3D Torus (e.g., vacuum ring seal, o-ring, lip insulator in tumbler):
 * - Pivot at (0, 0, 0)
 */
export function createTorus({
  radius = 0.8,
  tube = 0.12,
  radialSegments = 24,
  tubularSegments = 48,
  arc = Math.PI * 2,
  axis = "y",
  color,
  wireframe = false,
}: TorusProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveTorus";

  const mat = createBlueprintMaterial(color, wireframe);
  const wireMat = createBlueprintMaterial(color, true);

  const geo = new THREE.TorusGeometry(
    radius,
    tube,
    radialSegments,
    tubularSegments,
    arc
  );

  // By default Torus lies in XY plane. If axis === "y", rotate so ring lies horizontal in XZ plane
  if (axis === "y") geo.rotateX(Math.PI / 2);
  else if (axis === "x") geo.rotateY(Math.PI / 2);

  const mesh = new THREE.Mesh(geo, mat);
  const wire = new THREE.Mesh(geo.clone(), wireMat);
  group.add(mesh);
  group.add(wire);

  return group;
}
