import * as THREE from "three";
import {
  xrayBlueMaterial,
  xrayBlueDarkMaterial,
  xrayBlueLightMaterial,
  xrayOrangeMaterial,
  createWireframeOverlay,
} from "../materials/xray.material";

export interface QuadProps {
  width?: number;
  height?: number;
  depth?: number;
  style?: string;
  gridX?: number;
  gridY?: number;
  bezel?: boolean;
}

/**
 * Flat technical panel: display, PCB, keyboard deck, glass sheet.
 * Thin extruded slab + bezel frame + optional trace grid, all x-ray.
 */
export function createQuad({
  width = 1.4,
  height = 0.9,
  depth = 0.04,
  style = "xray-blue",
  gridX = 0,
  gridY = 0,
  bezel = true,
}: QuadProps = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = "PrimitiveQuad";

  let mat: THREE.Material = xrayBlueMaterial;
  let frameMat: THREE.Material = xrayBlueLightMaterial;
  let wireColor = 0x00d4ff;

  if (style === "xray-orange") {
    mat = xrayOrangeMaterial;
    frameMat = xrayOrangeMaterial;
    wireColor = 0xff4500;
  } else if (style === "xray-blue-dark") {
    mat = xrayBlueDarkMaterial;
    frameMat = xrayBlueMaterial;
    wireColor = 0x0088cc;
  } else if (style === "xray-blue-light") {
    mat = xrayBlueLightMaterial;
    frameMat = xrayBlueDarkMaterial;
    wireColor = 0x66e0ff;
  }

  const panelGeo = new THREE.BoxGeometry(width, height, depth);
  const panel = new THREE.Mesh(panelGeo, mat);
  group.add(panel);
  group.add(createWireframeOverlay(panelGeo, wireColor));

  // Bezel frame so a flat panel still reads as a manufactured part.
  if (bezel) {
    const bar = Math.max(0.012, Math.min(width, height) * 0.035);
    const bezelHeight = depth * 1.6;
    const bars: Array<[number, number, number, number]> = [
      [width, bar, 0, height / 2 - bar / 2],
      [width, bar, 0, -height / 2 + bar / 2],
      [bar, height, width / 2 - bar / 2, 0],
      [bar, height, -width / 2 + bar / 2, 0],
    ];
    for (const [bw, bh, bx, by] of bars) {
      const geo = new THREE.BoxGeometry(bw, bh, bezelHeight);
      const mesh = new THREE.Mesh(geo, frameMat);
      mesh.position.set(bx, by, 0);
      group.add(mesh);
    }
  }

  // Optional trace / key grid drawn just above the panel surface.
  const cols = Math.max(0, Math.round(gridX));
  const rows = Math.max(0, Math.round(gridY));
  if (cols > 0 || rows > 0) {
    const points: number[] = [];
    const z = depth / 2 + 0.002;
    const halfW = width / 2 - Math.max(0.02, width * 0.03);
    const halfH = height / 2 - Math.max(0.02, height * 0.03);
    for (let i = 1; i <= cols; i++) {
      const x = -halfW + (i / (cols + 1)) * halfW * 2;
      points.push(x, -halfH, z, x, halfH, z);
    }
    for (let j = 1; j <= rows; j++) {
      const y = -halfH + (j / (rows + 1)) * halfH * 2;
      points.push(-halfW, y, z, halfW, y, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({
        color: wireColor,
        transparent: true,
        opacity: 0.28,
      })
    );
    group.add(lines);
  }

  return group;
}
