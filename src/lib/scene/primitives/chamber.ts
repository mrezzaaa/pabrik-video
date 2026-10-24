import * as THREE from "three";
import { createBlueprintMaterial } from "../materials";

export interface ChamberProps {
  radiusOuter?: number;
  radiusInner?: number;
  height?: number;
  nozzles?: number;
  axis?: "x" | "y" | "z";
  color?: string;
  wireframe?: boolean;
}

/**
 * Creates a proper 3D Combustion / Vacuum Chamber:
 * - Annular chamber body with inner lining and circumferential injector nozzles
 * - Pivot at (0, 0, 0)
 */
export function createChamber({
  radiusOuter = 1.1,
  radiusInner = 0.8,
  height = 1.6,
  nozzles = 8,
  axis = "y",
  color,
  wireframe = false,
}: ChamberProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveChamber";

  const mat = createBlueprintMaterial(color, wireframe);
  const wireMat = createBlueprintMaterial(color, true);

  // 1. Annular double-wall chamber
  const pts = [
    new THREE.Vector2(radiusInner, -height / 2),
    new THREE.Vector2(radiusOuter, -height / 2),
    new THREE.Vector2(radiusOuter, height / 2),
    new THREE.Vector2(radiusInner, height / 2),
    new THREE.Vector2(radiusInner, -height / 2),
  ];
  const geo = new THREE.LatheGeometry(pts, 48);
  if (axis === "x") geo.rotateZ(Math.PI / 2);
  if (axis === "z") geo.rotateX(Math.PI / 2);

  const mainMesh = new THREE.Mesh(geo, mat);
  const mainWire = new THREE.Mesh(geo.clone(), wireMat);
  group.add(mainMesh);
  group.add(mainWire);

  // 2. Injector nozzles / ports around the chamber
  if (nozzles > 0) {
    const nozzleR = (radiusOuter - radiusInner) * 0.45;
    const nozzleH = (radiusOuter - radiusInner) * 1.4;
    const nozzleGeo = new THREE.CylinderGeometry(nozzleR, nozzleR * 0.8, nozzleH, 16);
    nozzleGeo.rotateZ(Math.PI / 2);

    const step = (Math.PI * 2) / nozzles;
    const midR = (radiusOuter + radiusInner) / 2;

    for (let i = 0; i < nozzles; i++) {
      const angle = i * step;
      const nozzleMesh = new THREE.Mesh(nozzleGeo, mat);

      if (axis === "y") {
        nozzleMesh.position.set(
          Math.cos(angle) * midR,
          0,
          Math.sin(angle) * midR
        );
        nozzleMesh.rotation.y = -angle;
      } else if (axis === "z") {
        nozzleMesh.position.set(
          Math.cos(angle) * midR,
          Math.sin(angle) * midR,
          0
        );
        nozzleMesh.rotation.z = angle;
      }
      group.add(nozzleMesh);
    }
  }

  return group;
}
