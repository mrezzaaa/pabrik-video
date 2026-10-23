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
  floor?: number; // Tebal lantai yang tetap ada di area potongan (default 0.4)
}): Face3D[] {
  const { partId, x, y, z, dx, dy, dz } = params;
  const rx = params.cutRatio?.x ?? 0.5;
  const ry = params.cutRatio?.y ?? 0.5;
  const floor = Math.max(0, Math.min(dz - 0.1, params.floor ?? 0.4));

  const cutX = x + dx * (1 - rx);
  const cutY = y + dy * (1 - ry);

  const faces: Face3D[] = [];

  // 1. Jika floor > 0, buat plat lantai di kuadran potongan agar part internal tidak melayang
  if (floor > 0) {
    const cavityFloorPts: Point3D[] = [
      { x: cutX, y: cutY, z: z + floor },
      { x: x + dx, y: cutY, z: z + floor },
      { x: x + dx, y: y + dy, z: z + floor },
      { x: cutX, y: y + dy, z: z + floor },
    ];
    const cfCentroid = computeCentroid(cavityFloorPts);
    faces.push({
      id: `${partId}_cavity_floor`,
      partId,
      points3D: cavityFloorPts,
      normal: { x: 0, y: 0, z: 1 },
      role: "top",
      centroid3D: cfCentroid,
      depthKey: cfCentroid.x + cfCentroid.y + cfCentroid.z,
    });

    // Sisi kanan dan kiri tebal lantai
    const floorRightPts: Point3D[] = [
      { x: x + dx, y: cutY, z },
      { x: x + dx, y: y + dy, z },
      { x: x + dx, y: y + dy, z: z + floor },
      { x: x + dx, y: cutY, z: z + floor },
    ];
    const frCentroid = computeCentroid(floorRightPts);
    faces.push({
      id: `${partId}_floor_right`,
      partId,
      points3D: floorRightPts,
      normal: { x: 1, y: 0, z: 0 },
      role: "right",
      centroid3D: frCentroid,
      depthKey: frCentroid.x + frCentroid.y + frCentroid.z,
    });

    const floorLeftPts: Point3D[] = [
      { x: cutX, y: y + dy, z },
      { x: cutX, y: y + dy, z: z + floor },
      { x: x + dx, y: y + dy, z: z + floor },
      { x: x + dx, y: y + dy, z },
    ];
    const flCentroid = computeCentroid(floorLeftPts);
    faces.push({
      id: `${partId}_floor_left`,
      partId,
      points3D: floorLeftPts,
      normal: { x: 0, y: 1, z: 0 },
      role: "left",
      centroid3D: flCentroid,
      depthKey: flCentroid.x + flCentroid.y + flCentroid.z,
    });
  }

  // 2. Extrude polygon bentuk L dari z + floor setinggi (dz - floor)
  const zStart = z + floor;
  const heightExtrude = dz - floor;

  const footprint = [
    { x, y },
    { x: x + dx, y },
    { x: x + dx, y: cutY },
    { x: cutX, y: cutY },
    { x: cutX, y: y + dy },
    { x, y: y + dy },
  ];

  const lFaces = createExtrudePolygon({
    partId,
    footprint,
    z: zStart,
    dz: heightExtrude,
    isCutaway: false,
  });
  faces.push(...lFaces);

  // 3. Dinding penampang (cut) potongan yang menghadap ke kamera
  const cutWall1Pts: Point3D[] = [
    { x: x + dx, y: cutY, z: zStart },
    { x: cutX, y: cutY, z: zStart },
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
    { x: cutX, y: cutY, z: zStart },
    { x: cutX, y: y + dy, z: zStart },
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
 * 6. CUTAWAY CYLINDER
 * Silinder/tabung dengan 1 kuartal (x > 0, y > 0 dari pusat) dibuang.
 * Radius dalam = r - wall; wall = r berarti silinder pejal.
 * Face penampang diberi arsiran dan role "cut".
 */
export function createCutawayCylinder(params: {
  partId: string;
  x: number; // Pusat X
  y: number; // Pusat Y
  z: number; // Dasar Z
  radius: number;
  height: number;
  wall?: number;
  cut?: "front";
  segments?: number;
}): Face3D[] {
  const { partId, x, y, z, radius: r, height: h } = params;
  const wall = params.wall ?? r;
  const rIn = Math.max(0, r - wall);
  const segments = params.segments || 24;
  const faces: Face3D[] = [];

  // Potongan kuadran depan: x > 0 dan y > 0 (dari sudut 0 ke PI/2).
  // Sisa busur yang digambar adalah dari PI/2 ke 2*PI (90° ke 360°).
  const startAngle = Math.PI / 2;
  const endAngle = 2 * Math.PI;
  const arcSegments = Math.max(6, Math.round((segments * 3) / 4));

  const outerArc: Point3D[] = [];
  const innerArc: Point3D[] = [];

  for (let i = 0; i <= arcSegments; i++) {
    const angle = startAngle + (i * (endAngle - startAngle)) / arcSegments;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    outerArc.push({ x: x + r * cosA, y: y + r * sinA, z });
    innerArc.push({ x: x + rIn * cosA, y: y + rIn * sinA, z });
  }

  // 1. Cut Face pada angle 0 (sepanjang ray rIn..r pada y = y, z..z+h)
  const cutFace0Pts: Point3D[] = [
    { x: x + rIn, y, z },
    { x: x + r, y, z },
    { x: x + r, y, z: z + h },
    { x: x + rIn, y, z: z + h },
  ];
  const c0Centroid = computeCentroid(cutFace0Pts);
  faces.push({
    id: `${partId}_cut_face0`,
    partId,
    points3D: cutFace0Pts,
    normal: { x: 0, y: 1, z: 0 },
    role: "cut",
    isCutaway: true,
    centroid3D: c0Centroid,
    depthKey: c0Centroid.x + c0Centroid.y + c0Centroid.z + 0.1,
  });

  // 2. Cut Face pada angle PI/2 (sepanjang ray rIn..r pada x = x, z..z+h)
  const cutFace90Pts: Point3D[] = [
    { x, y: y + rIn, z },
    { x, y: y + rIn, z: z + h },
    { x, y: y + r, z: z + h },
    { x, y: y + r, z },
  ];
  const c90Centroid = computeCentroid(cutFace90Pts);
  faces.push({
    id: `${partId}_cut_face90`,
    partId,
    points3D: cutFace90Pts,
    normal: { x: 1, y: 0, z: 0 },
    role: "cut",
    isCutaway: true,
    centroid3D: c90Centroid,
    depthKey: c90Centroid.x + c90Centroid.y + c90Centroid.z + 0.1,
  });

  // 3. Top Faces (di z + h)
  for (let i = 0; i < arcSegments; i++) {
    const o0 = { ...outerArc[i], z: z + h };
    const o1 = { ...outerArc[i + 1], z: z + h };
    const in0 = { ...innerArc[i], z: z + h };
    const in1 = { ...innerArc[i + 1], z: z + h };

    const topQuadPts = rIn > 0 ? [o0, o1, in1, in0] : [o0, o1, { x, y, z: z + h }];
    const tCentroid = computeCentroid(topQuadPts);
    faces.push({
      id: `${partId}_top_${i}`,
      partId,
      points3D: topQuadPts,
      normal: { x: 0, y: 0, z: 1 },
      role: "top",
      centroid3D: tCentroid,
      depthKey: tCentroid.x + tCentroid.y + tCentroid.z,
    });
  }

  // 4. Dinding silinder luar
  for (let i = 0; i < arcSegments; i++) {
    const p0 = outerArc[i];
    const p1 = outerArc[i + 1];
    const wallQuad: Point3D[] = [
      p0,
      p1,
      { ...p1, z: z + h },
      { ...p0, z: z + h },
    ];
    const midAngle = startAngle + ((i + 0.5) * (endAngle - startAngle)) / arcSegments;
    const nx = Math.cos(midAngle);
    const ny = Math.sin(midAngle);
    const normal = { x: nx, y: ny, z: 0 };
    const role: FaceRole = nx > ny ? "right" : "left";
    const wCentroid = computeCentroid(wallQuad);

    faces.push({
      id: `${partId}_outer_wall_${i}`,
      partId,
      points3D: wallQuad,
      normal,
      role,
      centroid3D: wCentroid,
      depthKey: wCentroid.x + wCentroid.y + wCentroid.z,
    });
  }

  // 5. Jika berongga (rIn > 0), dinding interior tabung menghadap ke dalam rongga
  if (rIn > 0) {
    for (let i = 0; i < arcSegments; i++) {
      const p0 = innerArc[i];
      const p1 = innerArc[i + 1];
      const innerWallQuad: Point3D[] = [
        p1,
        p0,
        { ...p0, z: z + h },
        { ...p1, z: z + h },
      ];
      const midAngle = startAngle + ((i + 0.5) * (endAngle - startAngle)) / arcSegments;
      const nx = -Math.cos(midAngle);
      const ny = -Math.sin(midAngle);
      const normal = { x: nx, y: ny, z: 0 };
      const role: FaceRole = nx > ny ? "right" : "left";
      const iwCentroid = computeCentroid(innerWallQuad);

      faces.push({
        id: `${partId}_inner_wall_${i}`,
        partId,
        points3D: innerWallQuad,
        normal,
        role,
        centroid3D: iwCentroid,
        depthKey: iwCentroid.x + iwCentroid.y + iwCentroid.z,
      });
    }
  }

  return faces;
}

/**
 * 7. CYLINDER (Silinder Utuh)
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
 * Menghasilkan face lingkaran yang menghadap kamera dengan tutup highlight atas.
 */
export function createSphere(params: {
  partId: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  segments?: number;
}): Face3D[] {
  const { partId, x, y, z, radius: r } = params;
  const segments = params.segments || 16;
  const faces: Face3D[] = [];

  const mainCirclePts: Point3D[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    mainCirclePts.push({
      x: x + r * Math.cos(angle),
      y: y + r * Math.sin(angle),
      z: z + r,
    });
  }
  const centroid = computeCentroid(mainCirclePts);
  faces.push({
    id: `${partId}_sphere_body`,
    partId,
    points3D: mainCirclePts,
    normal: { x: 1, y: 1, z: 1 },
    role: "left",
    centroid3D: centroid,
    depthKey: centroid.x + centroid.y + centroid.z,
  });

  const hlPts: Point3D[] = [];
  const hlR = r * 0.45;
  for (let i = 0; i < segments; i++) {
    const angle = (i * 2 * Math.PI) / segments;
    hlPts.push({
      x: x - r * 0.2 + hlR * Math.cos(angle),
      y: y - r * 0.2 + hlR * Math.sin(angle),
      z: z + r * 1.4,
    });
  }
  const hlCentroid = computeCentroid(hlPts);
  faces.push({
    id: `${partId}_sphere_highlight`,
    partId,
    points3D: hlPts,
    normal: { x: 0, y: 0, z: 1 },
    role: "top",
    centroid3D: hlCentroid,
    depthKey: hlCentroid.x + hlCentroid.y + hlCentroid.z + 0.2,
  });

  return faces;
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
