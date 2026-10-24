import * as THREE from "three";
import { createBlueprintMaterial } from "../materials";

export interface BoxProps {
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a proper 3D Box with blueprint lines:
 * - Pivot at (0, 0, 0)
 */
export function createBox({
  width = 1,
  height = 1,
  depth = 1,
  color,
  wireframe = false,
}: BoxProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveBox";

  const mat = createBlueprintMaterial(color, wireframe);
  const wireMat = createBlueprintMaterial(color, true);

  const geo = new THREE.BoxGeometry(width, height, depth);
  const mesh = new THREE.Mesh(geo, mat);
  const wire = new THREE.Mesh(geo.clone(), wireMat);

  group.add(mesh);
  group.add(wire);

  return group;
}
