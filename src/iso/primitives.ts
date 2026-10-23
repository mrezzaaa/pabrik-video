/**
 * 3D Isometric Geometric Primitives & Cutaway Generators
 *
 * Setiap primitif menghasilkan daftar face 3D terstruktur:
 * - points3D: Daftar titik poligon dalam 3D grid space
 * - normal: Vektor normal keluar
 * - role: "top" | "left" | "right" | "cut" (untuk pewarnaan 3-tone deterministik)
 * - isCutaway: boolean (menentukan apakah face ini dinding potongan berarsir)
 */

import {
  type Point3D,
  calculateFaceNormal,
  isFaceFacingCamera,
} from "./math";
import type { FaceRole } from "./shading";

export interface Face3D {
  id: string;
  partId: string;
  points3D: Point3D[];
  normal: Point3D;
  role: FaceRole;
  isCutaway?: boolean;
  centroid3D: Point3D;
  depthKey: number; // x + y + z dari centroid untuk depth-sort
}

function computeCentroid(pts: Point3D[]): Point3D {
  let x = 0;
  let y = 0;
  let z = 0;
  for (const p of pts) {
    x += p.x;
    y += p.y;
    z += p.z;
  }
  const n = pts.length || 1;
  return { x: x / n, y: y / n, z: z / n };
}

/**
 * 1. BOX PRIMITIVE
 * Balok 3D ortogonal dengan dimensi dx, dy, dz pada posisi (x, y, z).
 */
export function createBox(params: {
  partId: string;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
}): Face3D[] {
  const { partId, x, y, z, dx, dy, dz } = params;
  const faces: Face3D[] = [];

  // Top face (+z)
  const topPts: Point3D[] = [
    { x, y, z: z + dz },
    { x: x + dx, y, z: z + dz },
    { x: x + dx, y: y + dy, z: z + dz },
    { x, y: y + dy, z: z + dz },
  ];
  const topCentroid = computeCentroid(topPts);
  faces.push({
    id: `${partId}_top`,
    partId,
    points3D: topPts,
    normal: { x: 0, y: 0, z: 1 },
    role: "top",
    centroid3D: topCentroid,
    depthKey: topCentroid.x + topCentroid.y + topCentroid.z,
  });

  // Right face (+x)
  const rightPts: Point3D[] = [
    { x: x + dx, y, z },
    { x: x + dx, y: y + dy, z },
    { x: x + dx, y: y + dy, z: z + dz },
    { x: x + dx, y, z: z + dz },
  ];
  const rightCentroid = computeCentroid(rightPts);
  faces.push({
    id: `${partId}_right`,
    partId,
    points3D: rightPts,
    normal: { x: 1, y: 0, z: 0 },
    role: "right",
    centroid3D: rightCentroid,
    depthKey: rightCentroid.x + rightCentroid.y + rightCentroid.z,
  });

  // Left face (+y)
  const leftPts: Point3D[] = [
    { x, y: y + dy, z },
    { x, y: y + dy, z: z + dz },
    { x: x + dx, y: y + dy, z: z + dz },
    { x: x + dx, y: y + dy, z },
  ];
  const leftCentroid = computeCentroid(leftPts);
  faces.push({
    id: `${partId}_left`,
    partId,
    points3D: leftPts,
    normal: { x: 0, y: 1, z: 0 },
    role: "left",
    centroid3D: leftCentroid,
    depthKey: leftCentroid.x + leftCentroid.y + leftCentroid.z,
  });

  return faces;
}

/**
 * 2. SHEET (Pelat / Lapisan Tipis)
 */
export function createSheet(params: {
  partId: string;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  thickness?: number;
}): Face3D[] {
  return createBox({
    partId: params.partId,
    x: params.x,
    y: params.y,
    z: params.z,
    dx: params.dx,
    dy: params.dy,
    dz: params.thickness ?? 0.2,
  });
}

/**
 * 3. WEDGE (Ramp / Bidang Miring / Baji)
 */
export function createWedge(params: {
  partId: string;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  slopeAxis?: "x" | "y";
}): Face3D[] {
  const { partId, x, y, z, dx, dy, dz, slopeAxis = "x" } = params;
  const faces: Face3D[] = [];

  if (slopeAxis === "x") {
    // Kemiringan naik sepanjang sumbu X dari x ke x+dx
    // Sloped top face
    const topPts = [
      { x, y, z },
      { x: x + dx, y, z: z + dz },
      { x: x + dx, y: y + dy, z: z + dz },
      { x, y: y + dy, z },
    ];
    const topNorm = calculateFaceNormal(topPts[0], topPts[1], topPts[2]);
    const topCentroid = computeCentroid(topPts);
    faces.push({
      id: `${partId}_slope`,
      partId,
      points3D: topPts,
      normal: topNorm,
      role: "top",
      centroid3D: topCentroid,
      depthKey: topCentroid.x + topCentroid.y + topCentroid.z,
    });

    // Right face (+x, vertikal)
    const rightPts = [
      { x: x + dx, y, z },
      { x: x + dx, y: y + dy, z },
      { x: x + dx, y: y + dy, z: z + dz },
      { x: x + dx, y, z: z + dz },
    ];
    const rightCentroid = computeCentroid(rightPts);
    faces.push({
      id: `${partId}_right`,
      partId,
      points3D: rightPts,
      normal: { x: 1, y: 0, z: 0 },
      role: "right",
      centroid3D: rightCentroid,
      depthKey: rightCentroid.x + rightCentroid.y + rightCentroid.z,
    });

    // Left triangle face (+y)
    const leftPts = [
      { x, y: y + dy, z },
      { x: x + dx, y: y + dy, z },
      { x: x + dx, y: y + dy, z: z + dz },
    ];
    const leftCentroid = computeCentroid(leftPts);
    faces.push({
      id: `${partId}_left`,
      partId,
      points3D: leftPts,
      normal: { x: 0, y: 1, z: 0 },
      role: "left",
      centroid3D: leftCentroid,
      depthKey: leftCentroid.x + leftCentroid.y + leftCentroid.z,
    });
  } else {
    // Slope along Y
    const topPts = [
      { x, y, z },
      { x: x + dx, y, z },
      { x: x + dx, y: y + dy, z: z + dz },
      { x, y: y + dy, z: z + dz },
    ];
    const topNorm = calculateFaceNormal(topPts[0], topPts[1], topPts[2]);
    const topCentroid = computeCentroid(topPts);
    faces.push({
      id: `${partId}_slope`,
      partId,
      points3D: topPts,
      normal: topNorm,
      role: "top",
      centroid3D: topCentroid,
      depthKey: topCentroid.x + topCentroid.y + topCentroid.z,
    });

    // Left face (+y, vertical)
    const leftPts = [
      { x, y: y + dy, z },
      { x, y: y + dy, z: z + dz },
      { x: x + dx, y: y + dy, z: z + dz },
      { x: x + dx, y: y + dy, z },
    ];
    const leftCentroid = computeCentroid(leftPts);
    faces.push({
      id: `${partId}_left`,
      partId,
      points3D: leftPts,
      normal: { x: 0, y: 1, z: 0 },
      role: "left",
      centroid3D: leftCentroid,
      depthKey: leftCentroid.x + leftCentroid.y + leftCentroid.z,
    });

    // Right triangle face (+x)
    const rightPts = [
      { x: x + dx, y, z },
      { x: x + dx, y: y + dy, z: z + dz },
      { x: x + dx, y: y + dy, z },
    ];
    const rightCentroid = computeCentroid(rightPts);
    faces.push({
      id: `${partId}_right`,
      partId,
      points3D: rightPts,
      normal: { x: 1, y: 0, z: 0 },
      role: "right",
      centroid3D: rightCentroid,
      depthKey: rightCentroid.x + rightCentroid.y + rightCentroid.z,
    });
  }

  return faces;
}

/**
 * 4. EXTRUDE POLYGON
 * Mengekstrusi footprint 2D pada bidang (x, y) setinggi dz.
 * Digunakan untuk bentuk L, baji, bentukan tanah, dan geometri non-kotak.
 */
export function createExtrudePolygon(params: {
  partId: string;
  footprint: { x: number; y: number }[]; // Titik counter-clockwise
  z: number;
  dz: number;
  isCutaway?: boolean;
}): Face3D[] {
  const { partId, footprint, z, dz, isCutaway } = params;
  const faces: Face3D[] = [];
  const n = footprint.length;
  if (n < 3) return faces;

  // 1. Top face (+z)
  const topPts = footprint.map((p) => ({ x: p.x, y: p.y, z: z + dz }));
  const topCentroid = computeCentroid(topPts);
  faces.push({
    id: `${partId}_extrude_top`,
    partId,
    points3D: topPts,
    normal: { x: 0, y: 0, z: 1 },
    role: "top",
    centroid3D: topCentroid,
    depthKey: topCentroid.x + topCentroid.y + topCentroid.z,
  });

  // 2. Dinding samping untuk setiap segmen footprint
  for (let i = 0; i < n; i++) {
    const p0 = footprint[i];
    const p1 = footprint[(i + 1) % n];

    const wallPts: Point3D[] = [
      { x: p0.x, y: p0.y, z },
      { x: p1.x, y: p1.y, z },
      { x: p1.x, y: p1.y, z: z + dz },
      { x: p0.x, y: p0.y, z: z + dz },
    ];

    const normal = calculateFaceNormal(wallPts[0], wallPts[1], wallPts[2]);
    if (!isFaceFacingCamera(normal)) continue;

    const wallCentroid = computeCentroid(wallPts);
    let role: FaceRole = "left";
    if (normal.x > 0.4) role = "right";
    else if (normal.y > 0.4) role = "left";

    faces.push({
      id: `${partId}_wall_${i}`,
      partId,
      points3D: wallPts,
      normal,
      role: isCutaway ? "cut" : role,
      isCutaway,
      centroid3D: wallCentroid,
      depthKey: wallCentroid.x + wallCentroid.y + wallCentroid.z,
    });
  }

  return faces;
}

/**
 * 5. CUTAWAY BOX (Helper Penampang Belahan 90°)
 * Menghasilkan bentuk L dengan dinding penampang (cut) berarsir diagonal.
 */
export function createCutawayBox(params: {
  partId: string;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  cutRatio?: { x: number; y: number }; // Proporsi sudut depan yang dibelah (default 0.5, 0.5)
}): Face3D[] {
  const { partId, x, y, z, dx, dy, dz } = params;
  const rx = params.cutRatio?.x ?? 0.5;
  const ry = params.cutRatio?.y ?? 0.5;

  const cutX = x + dx * (1 - rx);
  const cutY = y + dy * (1 - ry);

  // Footprint L-shape (menghilangkan kuadran kanan-depan cutX..x+dx, cutY..y+dy)
  const footprint = [
    { x, y },
    { x: x + dx, y },
    { x: x + dx, y: cutY },
    { x: cutX, y: cutY },
    { x: cutX, y: y + dy },
    { x, y: y + dy },
  ];

  const faces = createExtrudePolygon({
    partId,
    footprint,
    z,
    dz,
    isCutaway: false,
  });

  // Tandai face potongan interior sebagai "cut"
  // Wall interior 1: dari (x+dx, cutY) ke (cutX, cutY) -> normal menghadap -y?
  // Dalam footprint, segmen 2: (x+dx, cutY) ke (cutX, cutY)
  // segmen 3: (cutX, cutY) ke (cutX, y+dy)
  // Dinding ini adalah penampang potongan langsung!
  const cutWall1Pts: Point3D[] = [
    { x: x + dx, y: cutY, z },
    { x: cutX, y: cutY, z },
    { x: cutX, y: cutY, z: z + dz },
    { x: x + dx, y: cutY, z: z + dz },
  ];
  const c1Centroid = computeCentroid(cutWall1Pts);
  faces.push({
    id: `${partId}_cut_x`,
    partId,
    points3D: cutWall1Pts,
    normal: { x: 0, y: 1, z: 0 },
    role: "cut",
    isCutaway: true,
    centroid3D: c1Centroid,
    depthKey: c1Centroid.x + c1Centroid.y + c1Centroid.z + 0.1,
  });

  const cutWall2Pts: Point3D[] = [
    { x: cutX, y: cutY, z },
    { x: cutX, y: y + dy, z },
    { x: cutX, y: y + dy, z: z + dz },
    { x: cutX, y: cutY, z: z + dz },
  ];
  const c2Centroid = computeCentroid(cutWall2Pts);
  faces.push({
    id: `${partId}_cut_y`,
    partId,
    points3D: cutWall2Pts,
    normal: { x: 1, y: 0, z: 0 },
    role: "cut",
    isCutaway: true,
    centroid3D: c2Centroid,
    depthKey: c2Centroid.x + c2Centroid.y + c2Centroid.z + 0.1,
  });

  return faces;
}

/**
 * 6. CYLINDER (Silinder Isometrik)
 * Tutup elips atas + dinding tabung dengan tepi tangen yang akurat.
 */
export function createCylinder(params: {
  partId: string;
  x: number; // Pusat X
  y: number; // Pusat Y
  z: number; // Dasar Z
  radius: number;
  height: number;
  segments?: number;
}): Face3D[] {
  const { partId, x, y, z, radius, height } = params;
  const segments = params.segments || 20;
  const footprint: { x: number; y: number }[] = [];

  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    footprint.push({
      x: x + radius * Math.cos(angle),
      y: y + radius * Math.sin(angle),
    });
  }

  return createExtrudePolygon({
    partId,
    footprint,
    z,
    dz: height,
    isCutaway: false,
  });
}

/**
 * 7. PIPE (Pipa Polylines 3D dengan Siku)
 */
export function createPipe(params: {
  partId: string;
  points: Point3D[];
  radius?: number;
}): Face3D[] {
  const { partId, points, radius = 0.3 } = params;
  const faces: Face3D[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const dx = Math.abs(p1.x - p0.x);
    const dy = Math.abs(p1.y - p0.y);
    const dz = Math.abs(p1.z - p0.z);

    const minX = Math.min(p0.x, p1.x) - (dx === 0 ? radius : 0);
    const minY = Math.min(p0.y, p1.y) - (dy === 0 ? radius : 0);
    const minZ = Math.min(p0.z, p1.z) - (dz === 0 ? radius : 0);

    const sizeX = Math.max(radius * 2, dx);
    const sizeY = Math.max(radius * 2, dy);
    const sizeZ = Math.max(radius * 2, dz);

    faces.push(
      ...createBox({
        partId: `${partId}_seg_${i}`,
        x: minX,
        y: minY,
        z: minZ,
        dx: sizeX,
        dy: sizeY,
        dz: sizeZ,
      })
    );
  }

  return faces;
}

/**
 * 8. SPHERE (Bola Isometrik)
 * Dalam proyeksi isometrik, bola berpusat di (x,y,z) memproyeksikan lingkaran sempurna 2D
 */
export interface SpherePrimitive {
  type: "sphere";
  partId: string;
  center: Point3D;
  radius: number;
  depthKey: number;
}

/**
 * 9. WAVE SURFACE (Permukaan Gelombang Air / Frekuensi)
 */
export function createWaveSurface(params: {
  partId: string;
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  amplitude?: number;
  wavelength?: number;
  phaseShift?: number;
}): Face3D[] {
  const {
    partId,
    x,
    y,
    z,
    dx,
    dy,
    amplitude = 0.5,
    wavelength = 3.0,
    phaseShift = 0,
  } = params;

  const faces: Face3D[] = [];
  const stepsX = 6;
  const stepsY = 4;
  const stepSizeX = dx / stepsX;
  const stepSizeY = dy / stepsY;

  const getZ = (px: number) => {
    return z + amplitude * Math.sin(((px - x) / wavelength) * 2 * Math.PI + phaseShift);
  };

  for (let ix = 0; ix < stepsX; ix++) {
    for (let iy = 0; iy < stepsY; iy++) {
      const x0 = x + ix * stepSizeX;
      const x1 = x0 + stepSizeX;
      const y0 = y + iy * stepSizeY;
      const y1 = y0 + stepSizeY;

      const pts: Point3D[] = [
        { x: x0, y: y0, z: getZ(x0) },
        { x: x1, y: y0, z: getZ(x1) },
        { x: x1, y: y1, z: getZ(x1) },
        { x: x0, y: y1, z: getZ(x0) },
      ];

      const normal = calculateFaceNormal(pts[0], pts[1], pts[2]);
      const centroid = computeCentroid(pts);

      faces.push({
        id: `${partId}_wave_${ix}_${iy}`,
        partId,
        points3D: pts,
        normal,
        role: "top",
        centroid3D: centroid,
        depthKey: centroid.x + centroid.y + centroid.z,
      });
    }
  }

  return faces;
}
