import {
  type IsoFace3D,
  type Point3D,
  computeCentroid3D,
  isPointInFrontCutaway,
  rotatePoint3D,
  translatePoint3D,
} from "./iso-math";

export interface RevolveProfileParams {
  partId: string;
  baseColor: string;
  center?: Point3D;
  axis?: "Z" | "X" | "Y";
  points: Array<{ r: number; z: number }>;
  wallThickness?: number;
  startAngle?: number;
  endAngle?: number;
  segments?: number;
  cutaway?: boolean;
  opacity?: number;
}

export function buildRevolveProfile3D(params: RevolveProfileParams): {
  faces: IsoFace3D[];
  anchor3D: Point3D;
} {
  const {
    partId,
    baseColor,
    center = { x: 0, y: 0, z: 0 },
    axis = "Z",
    points,
    wallThickness = 8,
    cutaway = false,
    opacity = 1,
  } = params;

  const startAngle = params.startAngle ?? (cutaway ? 90 : 0);
  const endAngle = params.endAngle ?? (cutaway ? 360 : 360);
  const span = Math.max(30, endAngle - startAngle);
  const segments = params.segments ?? (span >= 300 ? 18 : 14);

  const profile =
    points.length >= 2
      ? points
      : [
          { r: 42, z: -55 },
          { r: 42, z: 55 },
        ];

  const faces: IsoFace3D[] = [];
  const allVertices: Point3D[] = [];

  const mapCylindrical = (r: number, h: number, angleDeg: number): Point3D => {
    const rad = (angleDeg * Math.PI) / 180;
    const u = r * Math.cos(rad);
    const v = r * Math.sin(rad);
    if (axis === "X") {
      return { x: center.x + h, y: center.y + u, z: center.z + v };
    }
    if (axis === "Y") {
      return { x: center.x + u, y: center.y + h, z: center.z + v };
    }
    return { x: center.x + u, y: center.y + v, z: center.z + h };
  };

  for (let s = 0; s < segments; s++) {
    const a0 = startAngle + (span * s) / segments;
    const a1 = startAngle + (span * (s + 1)) / segments;

    for (let i = 0; i < profile.length - 1; i++) {
      const p0 = profile[i];
      const p1 = profile[i + 1];

      const v00 = mapCylindrical(p0.r, p0.z, a0);
      const v10 = mapCylindrical(p0.r, p0.z, a1);
      const v11 = mapCylindrical(p1.r, p1.z, a1);
      const v01 = mapCylindrical(p1.r, p1.z, a0);

      allVertices.push(v00, v11);

      faces.push({
        id: `${partId}_outer_${s}_${i}`,
        partId,
        vertices: [v00, v10, v11, v01],
        baseColor,
        opacity,
      });

      if (wallThickness > 0 && (cutaway || span < 355)) {
        const ir0 = Math.max(2, p0.r - wallThickness);
        const ir1 = Math.max(2, p1.r - wallThickness);

        const iv00 = mapCylindrical(ir0, p0.z, a0);
        const iv10 = mapCylindrical(ir0, p0.z, a1);
        const iv11 = mapCylindrical(ir1, p1.z, a1);
        const iv01 = mapCylindrical(ir1, p1.z, a0);

        faces.push({
          id: `${partId}_inner_${s}_${i}`,
          partId,
          vertices: [iv00, iv01, iv11, iv10],
          baseColor,
          opacity,
        });

        if (i === profile.length - 2) {
          faces.push({
            id: `${partId}_top_rim_${s}`,
            partId,
            vertices: [v01, v11, iv11, iv01],
            baseColor,
            opacity,
            normalOverride: { x: 0, y: 0, z: 1 },
          });
        }
      }
    }
  }

  if (span < 355 && wallThickness > 0) {
    for (const capAngle of [startAngle, endAngle]) {
      for (let i = 0; i < profile.length - 1; i++) {
        const p0 = profile[i];
        const p1 = profile[i + 1];
        const ir0 = Math.max(2, p0.r - wallThickness);
        const ir1 = Math.max(2, p1.r - wallThickness);

        const o0 = mapCylindrical(p0.r, p0.z, capAngle);
        const o1 = mapCylindrical(p1.r, p1.z, capAngle);
        const i1 = mapCylindrical(ir1, p1.z, capAngle);
        const i0 = mapCylindrical(ir0, p0.z, capAngle);

        faces.push({
          id: `${partId}_cutaway_cap_${capAngle}_${i}`,
          partId,
          vertices: [o0, o1, i1, i0],
          baseColor,
          opacity,
          isCutawayCap: true,
        });
      }
    }
  } else if (span >= 355) {
    const topP = profile[profile.length - 1];
    if (topP && topP.r > 2) {
      const topVerts: Point3D[] = [];
      for (let s = 0; s < segments; s++) {
        const ang = startAngle + (360 * s) / segments;
        topVerts.push(mapCylindrical(topP.r, topP.z, ang));
      }
      faces.push({
        id: `${partId}_top_cap`,
        partId,
        vertices: topVerts,
        baseColor,
        opacity,
        normalOverride: { x: 0, y: 0, z: 1 },
      });
    }
  }

  return {
    faces,
    anchor3D: allVertices.length > 0 ? computeCentroid3D(allVertices) : center,
  };
}

export interface ExtrudePolygonParams {
  partId: string;
  baseColor: string;
  center?: Point3D;
  polygon: Array<{ x: number; y: number }>;
  depth?: number;
  axis?: "Z" | "X" | "Y";
  cutaway?: boolean;
  opacity?: number;
}

export function buildExtrudePolygon3D(params: ExtrudePolygonParams): {
  faces: IsoFace3D[];
  anchor3D: Point3D;
} {
  const {
    partId,
    baseColor,
    center = { x: 0, y: 0, z: 0 },
    polygon,
    depth = 24,
    axis = "Z",
    cutaway = false,
    opacity = 1,
  } = params;

  const poly =
    polygon.length >= 3
      ? polygon
      : [
          { x: -30, y: -20 },
          { x: 30, y: -20 },
          { x: 30, y: 20 },
          { x: -30, y: 20 },
        ];

  const half = depth / 2;
  const mapPt = (px: number, py: number, h: number): Point3D => {
    if (axis === "X") {
      return { x: center.x + h, y: center.y + px, z: center.z + py };
    }
    if (axis === "Y") {
      return { x: center.x + px, y: center.y + h, z: center.z + py };
    }
    return { x: center.x + px, y: center.y + py, z: center.z + h };
  };

  const bottomVerts = poly.map((p) => mapPt(p.x, p.y, -half));
  const topVerts = poly.map((p) => mapPt(p.x, p.y, half));

  const faces: IsoFace3D[] = [
    {
      id: `${partId}_bottom`,
      partId,
      vertices: [...bottomVerts].reverse(),
      baseColor,
      opacity,
    },
    {
      id: `${partId}_top`,
      partId,
      vertices: topVerts,
      baseColor,
      opacity,
      normalOverride: { x: 0, y: 0, z: 1 },
    },
  ];

  for (let i = 0; i < poly.length; i++) {
    const next = (i + 1) % poly.length;
    const quad = [
      bottomVerts[i],
      bottomVerts[next],
      topVerts[next],
      topVerts[i],
    ];
    if (cutaway && isPointInFrontCutaway(computeCentroid3D(quad), center)) {
      continue;
    }
    faces.push({
      id: `${partId}_side_${i}`,
      partId,
      vertices: quad,
      baseColor,
      opacity,
    });
  }

  return {
    faces,
    anchor3D: computeCentroid3D([...bottomVerts, ...topVerts]),
  };
}

export interface Box3DParams {
  partId: string;
  baseColor: string;
  center?: Point3D;
  size: { w: number; d: number; h: number };
  wallThickness?: number;
  hollow?: boolean;
  cutaway?: boolean;
  opacity?: number;
}

export function buildBox3D(params: Box3DParams): {
  faces: IsoFace3D[];
  anchor3D: Point3D;
} {
  const {
    partId,
    baseColor,
    center = { x: 0, y: 0, z: 0 },
    size,
    wallThickness = 8,
    hollow = false,
    cutaway = false,
    opacity = 1,
  } = params;

  const hw = (size.w || 60) / 2;
  const hd = (size.d || 60) / 2;
  const hh = (size.h || 60) / 2;

  const c = (dx: number, dy: number, dz: number): Point3D => ({
    x: center.x + dx,
    y: center.y + dy,
    z: center.z + dz,
  });

  const v000 = c(-hw, -hd, -hh);
  const v100 = c(hw, -hd, -hh);
  const v110 = c(hw, hd, -hh);
  const v010 = c(-hw, hd, -hh);

  const v001 = c(-hw, -hd, hh);
  const v101 = c(hw, -hd, hh);
  const v111 = c(hw, hd, hh);
  const v011 = c(-hw, hd, hh);

  const faces: IsoFace3D[] = [
    {
      id: `${partId}_bottom`,
      partId,
      vertices: [v000, v010, v110, v100],
      baseColor,
      opacity,
      normalOverride: { x: 0, y: 0, z: -1 },
    },
    {
      id: `${partId}_back_x`,
      partId,
      vertices: [v000, v001, v011, v010],
      baseColor,
      opacity,
      normalOverride: { x: -1, y: 0, z: 0 },
    },
    {
      id: `${partId}_back_y`,
      partId,
      vertices: [v000, v100, v101, v001],
      baseColor,
      opacity,
      normalOverride: { x: 0, y: -1, z: 0 },
    }
  ];

  if (!hollow && !cutaway) {
    faces.push(
      {
        id: `${partId}_front_x`,
        partId,
        vertices: [v100, v110, v111, v101],
        baseColor,
        opacity,
        normalOverride: { x: 1, y: 0, z: 0 },
      },
      {
        id: `${partId}_front_y`,
        partId,
        vertices: [v010, v011, v111, v110],
        baseColor,
        opacity,
        normalOverride: { x: 0, y: 1, z: 0 },
      },
      {
        id: `${partId}_top`,
        partId,
        vertices: [v001, v101, v111, v011],
        baseColor,
        opacity,
        normalOverride: { x: 0, y: 0, z: 1 },
      }
    );
  } else {
    const t = Math.min(wallThickness, hw * 0.4, hd * 0.4);
    const iw = hw - t;
    const id = hd - t;
    const ih = hh - t;

    faces.push(
      {
        id: `${partId}_inner_floor`,
        partId,
        vertices: [
          c(-iw, -id, -ih),
          c(hw, -id, -ih),
          c(hw, hd, -ih),
          c(-iw, hd, -ih),
        ],
        baseColor,
        opacity,
        normalOverride: { x: 0, y: 0, z: 1 },
      },
      {
        id: `${partId}_inner_wall_x`,
        partId,
        vertices: [
          c(-iw, -id, -ih),
          c(-iw, hd, -ih),
          c(-iw, hd, hh),
          c(-iw, -id, hh),
        ],
        baseColor,
        opacity,
        normalOverride: { x: 1, y: 0, z: 0 },
      },
      {
        id: `${partId}_inner_wall_y`,
        partId,
        vertices: [
          c(-iw, -id, -ih),
          c(-iw, -id, hh),
          c(hw, -id, hh),
          c(hw, -id, -ih),
        ],
        baseColor,
        opacity,
        normalOverride: { x: 0, y: 1, z: 0 },
      },
      {
        id: `${partId}_cutaway_cap_left`,
        partId,
        vertices: [
          c(-hw, hd, -hh),
          c(-iw, hd, -hh),
          c(-iw, hd, hh),
          c(-hw, hd, hh),
        ],
        baseColor,
        opacity,
        isCutawayCap: true,
      },
      {
        id: `${partId}_cutaway_cap_right`,
        partId,
        vertices: [
          c(hw, -hd, -hh),
          c(hw, -id, -hh),
          c(hw, -id, hh),
          c(hw, -hd, hh),
        ],
        baseColor,
        opacity,
        isCutawayCap: true,
      },
      {
        id: `${partId}_top_rim_x`,
        partId,
        vertices: [
          c(-hw, -hd, hh),
          c(-iw, -hd, hh),
          c(-iw, hd, hh),
          c(-hw, hd, hh),
        ],
        baseColor,
        opacity,
        normalOverride: { x: 0, y: 0, z: 1 },
      },
      {
        id: `${partId}_top_rim_y`,
        partId,
        vertices: [
          c(-iw, -hd, hh),
          c(hw, -hd, hh),
          c(hw, -id, hh),
          c(-iw, -id, hh),
        ],
        baseColor,
        opacity,
        normalOverride: { x: 0, y: 0, z: 1 },
      }
    );
  }

  return {
    faces,
    anchor3D: center,
  };
}

export interface TubePath3DParams {
  partId: string;
  baseColor: string;
  path: Point3D[];
  radius?: number;
  cutaway?: boolean;
  opacity?: number;
}

export function buildTubePath3D(params: TubePath3DParams): {
  faces: IsoFace3D[];
  anchor3D: Point3D;
} {
  const {
    partId,
    baseColor,
    path,
    radius = 8,
    cutaway = false,
    opacity = 1,
  } = params;

  const pts =
    path.length >= 2
      ? path
      : [
          { x: -40, y: 0, z: -30 },
          { x: 40, y: 0, z: 30 },
        ];

  const radialSegments = 8;
  const angleSpan = cutaway ? 220 : 360;
  const rings: Point3D[][] = [];

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const next = pts[Math.min(pts.length - 1, i + 1)];
    const prev = pts[Math.max(0, i - 1)];
    const tx = next.x - prev.x;
    const ty = next.y - prev.y;
    const tz = next.z - prev.z;
    const tLen = Math.hypot(tx, ty, tz) || 1;
    const tangent = { x: tx / tLen, y: ty / tLen, z: tz / tLen };

    const up =
      Math.abs(tangent.z) < 0.9
        ? { x: 0, y: 0, z: 1 }
        : { x: 1, y: 0, z: 0 };
    const ux = tangent.y * up.z - tangent.z * up.y;
    const uy = tangent.z * up.x - tangent.x * up.z;
    const uz = tangent.x * up.y - tangent.y * up.x;
    const uLen = Math.hypot(ux, uy, uz) || 1;
    const u = { x: ux / uLen, y: uy / uLen, z: uz / uLen };
    const v = {
      x: tangent.y * u.z - tangent.z * u.y,
      y: tangent.z * u.x - tangent.x * u.z,
      z: tangent.x * u.y - tangent.y * u.x,
    };

    const ring: Point3D[] = [];
    for (let s = 0; s <= radialSegments; s++) {
      const ang = ((angleSpan * s) / radialSegments) * (Math.PI / 180);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      ring.push({
        x: p.x + (u.x * ca + v.x * sa) * radius,
        y: p.y + (u.y * ca + v.y * sa) * radius,
        z: p.z + (u.z * ca + v.z * sa) * radius,
      });
    }
    rings.push(ring);
  }

  const faces: IsoFace3D[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    const r0 = rings[i];
    const r1 = rings[i + 1];
    for (let s = 0; s < radialSegments; s++) {
      faces.push({
        id: `${partId}_tube_${i}_${s}`,
        partId,
        vertices: [r0[s], r0[s + 1], r1[s + 1], r1[s]],
        baseColor,
        opacity,
      });
    }
  }

  return {
    faces,
    anchor3D: pts[Math.floor(pts.length / 2)] ?? { x: 0, y: 0, z: 0 },
  };
}

export interface RadialArray3DParams {
  partId: string;
  baseColor: string;
  center?: Point3D;
  axis?: "Z" | "X" | "Y";
  count?: number;
  radius?: number;
  elementSize?: { w: number; d: number; h: number };
  rotationAngleOffsetDeg?: number;
  cutaway?: boolean;
  opacity?: number;
}

export function buildRadialArray3D(params: RadialArray3DParams): {
  faces: IsoFace3D[];
  anchor3D: Point3D;
} {
  const {
    partId,
    baseColor,
    center = { x: 0, y: 0, z: 0 },
    axis = "Z",
    count = 8,
    radius = 32,
    elementSize = { w: 14, d: 8, h: 28 },
    rotationAngleOffsetDeg = 0,
    cutaway = false,
    opacity = 1,
  } = params;

  const safeCount = Math.min(20, Math.max(3, count));
  const faces: IsoFace3D[] = [];

  for (let i = 0; i < safeCount; i++) {
    const angleDeg = rotationAngleOffsetDeg + (360 * i) / safeCount;
    if (cutaway && angleDeg % 360 > 15 && angleDeg % 360 < 85) {
      continue;
    }

    const baseBlade = buildBox3D({
      partId: `${partId}_item_${i}`,
      baseColor,
      center: { x: radius, y: 0, z: 0 },
      size: elementSize,
      opacity,
    });

    for (const f of baseBlade.faces) {
      const rotatedVerts = f.vertices.map((v) => {
        const rot = rotatePoint3D(v, axis, angleDeg, { x: 0, y: 0, z: 0 });
        return translatePoint3D(rot, center);
      });
      faces.push({
        ...f,
        partId,
        vertices: rotatedVerts,
        normalOverride: undefined,
      });
    }
  }

  return {
    faces,
    anchor3D: center,
  };
}

export interface ParticleStream3DItem {
  id: string;
  position3D: Point3D;
  tangent3D: Point3D;
  color: string;
  size: number;
  particleType: "ions" | "electrons" | "heat-waves" | "fluid" | "steam" | "airflow";
}

export function sampleParticleStream3D(params: {
  streamId: string;
  path: Point3D[];
  count: number;
  speed: number;
  size: number;
  color: string;
  particleType: "ions" | "electrons" | "heat-waves" | "fluid" | "steam" | "airflow";
  frame: number;
}): ParticleStream3DItem[] {
  const {
    streamId,
    path,
    count = 10,
    speed = 1.4,
    size = 10,
    color,
    particleType,
    frame,
  } = params;

  if (path.length < 2) return [];

  const safeCount = Math.min(24, Math.max(3, count));
  const items: ParticleStream3DItem[] = [];
  const totalSegments = path.length - 1;

  for (let i = 0; i < safeCount; i++) {
    const progress = ((frame * 0.012 * speed) + i / safeCount) % 1;
    const scaled = progress * totalSegments;
    const segIdx = Math.min(totalSegments - 1, Math.floor(scaled));
    const localT = scaled - segIdx;

    const p0 = path[segIdx];
    const p1 = path[segIdx + 1];

    const pos: Point3D = {
      x: p0.x + (p1.x - p0.x) * localT,
      y: p0.y + (p1.y - p0.y) * localT,
      z: p0.z + (p1.z - p0.z) * localT,
    };

    const tangent: Point3D = {
      x: p1.x - p0.x,
      y: p1.y - p0.y,
      z: p1.z - p0.z,
    };

    items.push({
      id: `${streamId}_p_${i}`,
      position3D: pos,
      tangent3D: tangent,
      color,
      size,
      particleType,
    });
  }

  return items;
}
