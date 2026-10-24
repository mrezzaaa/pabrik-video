import * as THREE from "three";
import { createBlueprintMaterial } from "../materials";

export interface ConeProps {
  radius?: number;
  radiusTop?: number;
  radiusBottom?: number;
  height?: number;
  layers?: number;
  segments?: number;
  axis?: "x" | "y" | "z";
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a proper 3D Cone / Truncated Staged Cone (e.g., Jet compressor stages, nozzles):
 * - Supports stepped compressor layers if layers > 1
 * - Pivot at (0, 0, 0)
 */
export function createCone({
  radius = 1,
  radiusTop = 0.5,
  radiusBottom,
  height = 2,
  layers = 1,
  segments = 48,
  axis = "y",
  color,
  wireframe = false,
}: ConeProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveCone";

  const rBot = radiusBottom ?? radius;
  const mat = createBlueprintMaterial(color, wireframe);
  const wireMat = createBlueprintMaterial(color, true);

  if (layers > 1) {
    // Multi-layer staged compressor discs / steps
    const layerH = height / layers;
    for (let i = 0; i < layers; i++) {
      const t0 = i / layers;
      const t1 = (i + 1) / layers;
      const r0 = rBot + (radiusTop - rBot) * t0;
      const r1 = rBot + (radiusTop - rBot) * t1;
      const yMid = -height / 2 + (i + 0.5) * layerH;

      const layerGeo = new THREE.CylinderGeometry(
        r1,
        r0,
        layerH * 0.92,
        segments
      );
      if (axis === "x") layerGeo.rotateZ(Math.PI / 2);
      if (axis === "z") layerGeo.rotateX(Math.PI / 2);

      const discMesh = new THREE.Mesh(layerGeo, mat);
      if (axis === "y") discMesh.position.y = yMid;
      else if (axis === "x") discMesh.position.x = yMid;
      else discMesh.position.z = yMid;

      const wireMesh = new THREE.Mesh(layerGeo.clone(), wireMat);
      discMesh.add(wireMesh);
      group.add(discMesh);
    }
  } else {
    const geo = new THREE.CylinderGeometry(
      radiusTop,
      rBot,
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
