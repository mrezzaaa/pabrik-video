/**
 * Classical 30-Degree Isometric Math Engine
 *
 * Sumbu Koordinat 3D & Konvensi Kamera:
 * - +x: Kanan-depan (sudut +30° terhadap bidang horizontal)
 * - +y: Kiri-depan (sudut +150° atau 30° ke kiri terhadap bidang horizontal)
 * - +z: Ke atas (vertikal)
 *
 * Proyeksi Isometrik Standar:
 * sx = (x - y) * cos(30°) * U
 * sy = (x + y) * sin(30°) * U - z * U
 *
 * Face yang terlihat kamera (kamera berada di +x, +y, +z memandang ke origin):
 * - Top face: normal (0, 0, 1) -> Menghadap ke atas
 * - Right face: normal (1, 0, 0) -> Menghadap kanan-depan
 * - Left face: normal (0, 1, 0) -> Menghadap kiri-depan
 * - Cut face: normal penampang bidang potong interior
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export const COS_30 = Math.cos(Math.PI / 6); // ~0.8660254
export const SIN_30 = Math.sin(Math.PI / 6); // 0.5

/**
 * Memproyeksikan titik 3D dalam grid unit ke titik 2D di layar.
 * @param pt Titik dalam koordinat 3D grid
 * @param unitScale Piksel per grid unit (U)
 * @param originX Titik tengah X di layar
 * @param originY Titik tengah Y di layar
 */
export function projectIso(
  pt: Point3D,
  unitScale = 50,
  originX = 0,
  originY = 0
): Point2D {
  const sx = (pt.x - pt.y) * COS_30 * unitScale;
  const sy = (pt.x + pt.y) * SIN_30 * unitScale - pt.z * unitScale;
  return {
    x: originX + sx,
    y: originY + sy,
  };
}

/**
 * Vektor arah pandang kamera dari tak hingga menuju origin: (1, 1, 1).
 * Normal face dot product dengan kamera untuk backface culling.
 */
export function isFaceFacingCamera(normal: Point3D): boolean {
  // Kamera melihat dari (+1, +1, +1) ke origin (0, 0, 0).
  // Normal face outward n. Vektor dari objek ke kamera adalah (+1, +1, +1).
  // Face terlihat jika n · (1, 1, 1) > 0.0001
  return normal.x + normal.y + normal.z > 0.0001;
}

/**
 * Menghitung normal segitiga/poligon dari 3 titik pertama (counter-clockwise outward).
 */
export function calculateFaceNormal(p0: Point3D, p1: Point3D, p2: Point3D): Point3D {
  const ax = p1.x - p0.x;
  const ay = p1.y - p0.y;
  const az = p1.z - p0.z;

  const bx = p2.x - p0.x;
  const by = p2.y - p0.y;
  const bz = p2.z - p0.z;

  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;

  const len = Math.hypot(nx, ny, nz) || 1;
  return {
    x: nx / len,
    y: ny / len,
    z: nz / len,
  };
}

/**
 * Rotasi titik 3D mengelilingi sumbu Z dengan pusat (cx, cy)
 */
export function rotateZ(pt: Point3D, angleDeg: number, cx = 0, cy = 0): Point3D {
  if (!angleDeg) return pt;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const dx = pt.x - cx;
  const dy = pt.y - cy;

  return {
    x: cx + (dx * cos - dy * sin),
    y: cy + (dx * sin + dy * cos),
    z: pt.z,
  };
}
