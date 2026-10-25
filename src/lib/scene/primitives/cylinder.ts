import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface CylinderProps {
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  hollow?: boolean;
  innerRadius?: number;
  segments?: number;
  axis?: "x" | "y" | "z";
  style?: string;
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a 3D Cylinder / Hollow Tube with X-ray transparency & wireframe overlay
 * (used for shafts, pistons, casings, pipes, tumbler walls)
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
  style = "xray-blue",
}: CylinderProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveCylinder";

  const rTop = radiusTop ?? radius;
  const rBottom = radiusBottom ?? radius;

  let mat: THREE.Material = xrayBlueMaterial;
  let wireColor = 0x00d4ff;

  if (style === "xray-orange") {
    mat = xrayOrangeMaterial;
    wireColor = 0xff4500;
  } else if (style === "xray-blue-dark") {
    mat = xrayBlueDarkMaterial;
    wireColor = 0x0088cc;
  } else if (style === "xray-blue-light") {
    mat = xrayBlueLightMaterial;
    wireColor = 0x66e0ff;
  }

  if (hollow || (innerRadius && innerRadius > 0)) {
    const ri = innerRadius ?? Math.max(0.1, rBottom * 0.82);
    const ro = rBottom;
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
    group.add(mesh);
    group.add(createWireframeOverlay(geo, wireColor));
  } else {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, height, segments);
    if (axis === "x") geo.rotateZ(Math.PI / 2);
    if (axis === "z") geo.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    group.add(createWireframeOverlay(geo, wireColor));
  }

  return group;
}
