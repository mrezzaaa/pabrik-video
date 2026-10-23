/**
 * Auto-Center, Auto-Scale, & 3D Anchor Projector for 1080x1920 Canvas
 *
 * Menghitung bounding box 2D dari seluruh titik 3D setelah diproyeksikan,
 * lalu menyesuaikan skala (unitScale) dan titik pusat (originX, originY)
 * agar objek cutaway pas di area pandang stage (±800x880 px) tanpa terpotong.
 */

import { type Point3D, type Point2D, projectIso } from "./math";

export interface StageFitConfig {
  unitScale: number; // px per grid unit
  originX: number;   // Screen X center
  originY: number;   // Screen Y center
}

export interface BoundingBox2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Menghitung konfigurasi fit optimal agar seluruh objek 3D muat rapi di tengah kanvas 1080x1920.
 */
export function computeStageFit(
  allPoints3D: Point3D[],
  options?: {
    stageCenterX?: number; // Default 540 (tengah 1080)
    stageCenterY?: number; // Default 1000 (antara HUD atas dan Subtitle bawah)
    maxStageWidth?: number; // Default 800px
    maxStageHeight?: number; // Default 860px
    minScale?: number; // Default 35
    maxScale?: number; // Default 85
  }
): StageFitConfig {
  const stageCenterX = options?.stageCenterX ?? 540;
  const stageCenterY = options?.stageCenterY ?? 1000;
  const maxStageWidth = options?.maxStageWidth ?? 800;
  const maxStageHeight = options?.maxStageHeight ?? 860;
  const minScale = options?.minScale ?? 35;
  const maxScale = options?.maxScale ?? 85;

  if (!allPoints3D.length) {
    return { unitScale: 55, originX: stageCenterX, originY: stageCenterY };
  }

  // 1. Proyeksikan dengan skala normal 1.0 pada origin (0, 0)
  let minX0 = Infinity;
  let maxX0 = -Infinity;
  let minY0 = Infinity;
  let maxY0 = -Infinity;

  for (const pt of allPoints3D) {
    const p2d = projectIso(pt, 1.0, 0, 0);
    if (p2d.x < minX0) minX0 = p2d.x;
    if (p2d.x > maxX0) maxX0 = p2d.x;
    if (p2d.y < minY0) minY0 = p2d.y;
    if (p2d.y > maxY0) maxY0 = p2d.y;
  }

  const width0 = Math.max(0.1, maxX0 - minX0);
  const height0 = Math.max(0.1, maxY0 - minY0);

  // 2. Hitung skala optimal agar pas dengan area panggung
  const scaleX = maxStageWidth / width0;
  const scaleY = maxStageHeight / height0;
  const targetScale = Math.min(scaleX, scaleY);
  const unitScale = Math.max(minScale, Math.min(maxScale, targetScale));

  // 3. Hitung originX dan originY agar titik tengah bounding box berada di stageCenter
  const centerX0 = (minX0 + maxX0) / 2;
  const centerY0 = (minY0 + maxY0) / 2;

  const originX = Math.round(stageCenterX - centerX0 * unitScale);
  const originY = Math.round(stageCenterY - centerY0 * unitScale);

  return { unitScale, originX, originY };
}

/**
 * Menghitung koordinat 2D di layar (1080x1920) untuk penempatan anchor dark pill callout
 * langsung dari koordinat 3D part.
 */
export function project3DAnchor(
  center3D: Point3D,
  fitConfig: StageFitConfig
): Point2D {
  const p2d = projectIso(center3D, fitConfig.unitScale, fitConfig.originX, fitConfig.originY);

  // Clamp agar pill pointer tidak pernah mepet keluar kanvas
  return {
    x: Math.round(Math.max(160, Math.min(920, p2d.x))),
    y: Math.round(Math.max(620, Math.min(1440, p2d.y))),
  };
}
