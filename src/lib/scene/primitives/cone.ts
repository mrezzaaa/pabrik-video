import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface ConeProps {
  radiusTop?: number;
  radiusBottom?: number;
  radius?: number;
  height?: number;
  segments?: number;
  axis?: "x" | "y" | "z";
  layers?: number;
  style?: string;
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a 3D Cone / Nozzle primitive with X-ray transparency & wireframe overlay
 */
export function createCone({
  radiusTop = 0.5,
  radiusBottom = 1.0,
  radius,
  height = 1.8,
  segments = 36,
  axis = "y",
  layers = 1,
  style = "xray-blue",
}: ConeProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveCone";

  const rTop = radiusTop ?? 0;
  const rBottom = radius ?? radiusBottom;

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

  if (layers > 1) {
    const layerHeight = height / layers;
    for (let i = 0; i < layers; i++) {
      const frac0 = i / layers;
      const frac1 = (i + 1) / layers;
      const r0 = rBottom - (rBottom - rTop) * frac0;
      const r1 = rBottom - (rBottom - rTop) * frac1;

      const layerGeo = new THREE.CylinderGeometry(r1, r0, layerHeight * 0.94, segments);
      if (axis === "z") layerGeo.rotateX(Math.PI / 2);
      if (axis === "x") layerGeo.rotateZ(Math.PI / 2);

      const layerMesh = new THREE.Mesh(layerGeo, mat);
      const yOffset = -height / 2 + layerHeight * (i + 0.5);
      if (axis === "y") layerMesh.position.y = yOffset;
      else if (axis === "z") layerMesh.position.z = yOffset;
      else layerMesh.position.x = yOffset;

      group.add(layerMesh);
      group.add(createWireframeOverlay(layerGeo, wireColor));
    }
  } else {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, height, segments);
    if (axis === "z") geo.rotateX(Math.PI / 2);
    if (axis === "x") geo.rotateZ(Math.PI / 2);

    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    group.add(createWireframeOverlay(geo, wireColor));
  }

  return group;
}
