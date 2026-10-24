import * as THREE from "three";
import { createBlueprintMaterial } from "../materials";

export interface CylinderProps {
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  hollow?: boolean;
  innerRadius?: number;
  segments?: number;
  axis?: "x" | "y" | "z";
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a proper 3D Cylinder or Hollow Tube:
 * - Solid cylinder or double-walled tube (e.g. for tumbler outer/inner wall)
 * - Pivot at (0, 0, 0)
 */
export function createCylinder({
  radius = 1,
  radiusTop,
  radiusBottom,
  height = 2,
  hollow = false,
  innerRadius,
  segments = 48,
  axis = "y",
  color,
  wireframe = false,
}: CylinderProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveCylinder";

  const rTop = radiusTop ?? radius;
  const rBottom = radiusBottom ?? radius;
  const mat = createBlueprintMaterial(color, wireframe);
  const wireMat = createBlueprintMaterial(color, true);

  if (hollow || (innerRadius && innerRadius > 0)) {
    const ri = innerRadius ?? Math.max(0.1, rBottom * 0.82);
    const ro = rBottom;
    // Lathe profile for precision hollow double wall
    const pts = [
      new THREE.Vector2(ri, -height / 2),
      new THREE.Vector2(ro, -height / 2),
      new THREE.Vector2(ro, height / 2),
      new THREE.Vector2(ri, height / 2),
      new THREE.Vector2(ri, -height / 2),
    ];
    const geo = new THREE.LatheGeometry(pts, segments);
    if (axis === "x") geo.rotateZ(Math.PI / 2);
    if (axis === "z") geo.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(geo, mat);
    const wire = new THREE.Mesh(geo.clone(), wireMat);
    group.add(mesh);
    group.add(wire);
  } else {
    const geo = new THREE.CylinderGeometry(
      rTop,
      rBottom,
      height,
      segments,
      2,
      false
    );
    if (axis === "x") geo.rotateZ(Math.PI / 2);
    if (axis === "z") geo.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(geo, mat);
    const wire = new THREE.Mesh(geo.clone(), wireMat);
    group.add(mesh);
    group.add(wire);
  }

  return group;
}
