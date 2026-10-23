import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  IsoPart3D,
  IsoSceneGraph,
  ParticleStream3DSpec,
  PhaseTimelineBlock,
} from "@/schemas/video-blueprint";
import {
  DEFAULT_ISO_CONFIG,
  compileIsoFacesToSvgPolygons,
  projectIso3D,
  rotatePoint3D,
  translatePoint3D,
  type IsoFace3D,
  type Point3D,
} from "../iso-engine/iso-math";
import {
  buildBox3D,
  buildExtrudePolygon3D,
  buildRadialArray3D,
  buildRevolveProfile3D,
  buildTubePath3D,
  sampleParticleStream3D,
} from "../iso-engine/iso-builders";

interface IsometricStageProps {
  visualScene: IsoSceneGraph;
  phases: PhaseTimelineBlock[];
}

/**
 * Builds the 3D faces of a single IsoPart3D and applies dynamic 3D part-level animation
 * (`rotate`, `oscillate`, `pulse`, `explodeOffset`) before returning the transformed faces + 3D anchor.
 */
function buildAnimatedPartFaces(
  part: IsoPart3D,
  frame: number,
  isFocused: boolean,
): {
  faces: IsoFace3D[];
  anchor3D: Point3D;
} {
  const center = part.params.center ?? { x: 0, y: 0, z: 0 };
  const axis = part.params.axis ?? "Z";
  const anim = part.animation ?? {
    type: "none",
    axis: "Z",
    speed: 1,
    amplitude: 10,
  };

  let rawResult: { faces: IsoFace3D[]; anchor3D: Point3D };

  switch (part.builderType) {
    case "revolveProfile": {
      rawResult = buildRevolveProfile3D({
        partId: part.partId,
        baseColor: part.materialColor,
        center,
        axis,
        points: part.params.profilePoints ?? [
          { r: 46, z: -60 },
          { r: 52, z: 0 },
          { r: 46, z: 60 },
        ],
        wallThickness: part.params.wallThickness ?? 9,
        startAngle: part.params.startAngle,
        endAngle: part.params.endAngle,
        cutaway: part.cutaway,
        opacity: part.opacity,
      });
      break;
    }

    case "extrudePolygon": {
      rawResult = buildExtrudePolygon3D({
        partId: part.partId,
        baseColor: part.materialColor,
        center,
        axis,
        polygon: part.params.polygon ?? [
          { x: -32, y: -22 },
          { x: 32, y: -22 },
          { x: 26, y: 26 },
          { x: -26, y: 26 },
        ],
        depth: part.params.depth ?? 28,
        cutaway: part.cutaway,
        opacity: part.opacity,
      });
      break;
    }

    case "tubePath3D": {
      rawResult = buildTubePath3D({
        partId: part.partId,
        baseColor: part.materialColor,
        path: part.params.path3D ?? [
          { x: center.x - 32, y: center.y - 16, z: center.z - 32 },
          { x: center.x, y: center.y, z: center.z },
          { x: center.x + 32, y: center.y + 16, z: center.z + 32 },
        ],
        radius: part.params.tubeRadius ?? 8,
        cutaway: part.cutaway,
        opacity: part.opacity,
      });
      break;
    }

    case "radialArray3D": {
      const rotSpin =
        anim.type === "rotate" ? (frame * 1.8 * (anim.speed || 1)) % 360 : 0;
      rawResult = buildRadialArray3D({
        partId: part.partId,
        baseColor: part.materialColor,
        center,
        axis,
        count: part.params.radialCount ?? 8,
        radius: part.params.radialRadius ?? 30,
        elementSize: part.params.elementSize ?? { w: 14, d: 9, h: 32 },
        rotationAngleOffsetDeg: rotSpin,
        cutaway: part.cutaway,
        opacity: part.opacity,
      });
      break;
    }

    case "hollowBox3D": {
      rawResult = buildBox3D({
        partId: part.partId,
        baseColor: part.materialColor,
        center,
        size: part.params.size ?? { w: 96, d: 88, h: 112 },
        wallThickness: part.params.wallThickness ?? 10,
        hollow: true,
        cutaway: true,
        opacity: part.opacity,
      });
      break;
    }

    case "box3D":
    default: {
      rawResult = buildBox3D({
        partId: part.partId,
        baseColor: part.materialColor,
        center,
        size: part.params.size ?? { w: 44, d: 44, h: 44 },
        wallThickness: part.params.wallThickness ?? 8,
        hollow: false,
        cutaway: part.cutaway,
        opacity: part.opacity,
      });
      break;
    }
  }

  // Compute dynamic 3D offset / rotation per frame
  const speed = anim.speed || 1;
  const amp = anim.amplitude || 8;
  let offset3D: Point3D = { x: 0, y: 0, z: 0 };
  let angleDeg = 0;

  if (anim.type === "oscillate") {
    const wave = Math.sin(frame * 0.09 * speed) * Math.min(18, amp);
    offset3D = {
      x: anim.axis === "X" ? wave : 0,
      y: anim.axis === "Y" ? wave : 0,
      z: anim.axis === "Z" ? wave : 0,
    };
  } else if (anim.type === "explodeOffset") {
    const wave = (Math.sin(frame * 0.06 * speed) + 1) * 0.5;
    const ev = anim.explodeVector ?? { x: 12, y: 12, z: 14 };
    offset3D = {
      x: ev.x * wave,
      y: ev.y * wave,
      z: ev.z * wave,
    };
  } else if (anim.type === "rotate" && part.builderType !== "radialArray3D") {
    angleDeg = (frame * 1.5 * speed) % 360;
  }

  const strokeWidth = isFocused ? 2.8 : 2.3;
  const partOpacity = isFocused
    ? part.opacity
    : Math.max(0.68, part.opacity * 0.85);

  const transformedFaces: IsoFace3D[] = rawResult.faces.map((face) => {
    const verts = face.vertices.map((v) => {
      const rotated =
        angleDeg !== 0 ? rotatePoint3D(v, anim.axis, angleDeg, center) : v;
      return translatePoint3D(rotated, offset3D);
    });
    return {
      ...face,
      vertices: verts,
      strokeWidth,
      opacity: partOpacity,
    };
  });

  return {
    faces: transformedFaces,
    anchor3D: translatePoint3D(rawResult.anchor3D, offset3D),
  };
}

/**
 * Renders 3D particle streams projected into 2D isometric SVG space (with ZERO raw `<text>` elements)
 */
function renderIsoParticleStream3D(
  stream: ParticleStream3DSpec,
  frame: number,
  activeSegmentIndex: number,
) {
  if (
    stream.activeInPhases &&
    stream.activeInPhases.length > 0 &&
    !stream.activeInPhases.includes(activeSegmentIndex)
  ) {
    return null;
  }

  const projectedPath = stream.path3D.map((pt) =>
    projectIso3D(pt, DEFAULT_ISO_CONFIG),
  );
  const pathD = projectedPath
    .map(
      (p, idx) =>
        `${idx === 0 ? "M" : "L"} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`,
    )
    .join(" ");

  const sampledParticles = sampleParticleStream3D({
    streamId: stream.id,
    path: stream.path3D,
    count: stream.count,
    speed: stream.speed,
    size: stream.size,
    color: stream.color,
    particleType: stream.type,
    frame,
  });

  return (
    <g key={stream.id}>
      {/* Dashed 3D Flow Trajectory */}
      <path
        d={pathD}
        fill="none"
        stroke={stream.color}
        strokeWidth={3}
        strokeDasharray="8 10"
        strokeDashoffset={-(frame * stream.speed * 2.4)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.48}
      />

      {/* Animated 3D Particles Projected to Isometric Screen Space */}
      {sampledParticles.map((item, idx) => {
        const pt2D = projectIso3D(item.position3D, DEFAULT_ISO_CONFIG);
        const r = Math.max(5, Math.min(16, item.size));
        const wave = Math.sin(frame * 0.14 + idx) * 3.5;
        const cx = pt2D.sx + wave;
        const cy = pt2D.sy - wave * 0.6;

        if (stream.type === "heat-waves" || stream.type === "airflow") {
          return (
            <path
              key={item.id}
              d={`M ${(cx - r).toFixed(1)} ${cy.toFixed(1)} Q ${cx.toFixed(1)} ${(cy - r * 1.1).toFixed(1)}, ${(cx + r).toFixed(1)} ${cy.toFixed(1)}`}
              fill="none"
              stroke={item.color}
              strokeWidth={3.2}
              strokeLinecap="round"
            />
          );
        }

        if (stream.type === "steam") {
          return (
            <circle
              key={item.id}
              cx={cx}
              cy={cy}
              r={r * 1.15}
              fill="#FFFFFF"
              fillOpacity={0.78}
              stroke="#1E293B"
              strokeWidth={2}
            />
          );
        }

        // Pure vector inner core + outer cel-shaded sphere for ions/electrons/fluid (ZERO <text>)
        return (
          <g key={item.id}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={item.color}
              stroke="#1E293B"
              strokeWidth={2.2}
            />
            <circle
              cx={cx - r * 0.28}
              cy={cy - r * 0.28}
              r={Math.max(2, r * 0.32)}
              fill="#FFFFFF"
              opacity={0.85}
            />
          </g>
        );
      })}
    </g>
  );
}

export const IsometricStage: React.FC<IsometricStageProps> = ({
  visualScene,
  phases,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activePhase =
    phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ??
    phases[phases.length - 1] ??
    phases[0];

  const prevPhaseIndex = Math.max(0, (activePhase?.segmentIndex ?? 0) - 1);
  const prevPhase = phases[prevPhaseIndex] ?? activePhase;

  const localFrame = Math.max(0, frame - (activePhase?.startFrame ?? 0));

  // Smooth spring camera zoom & pan (damping: 18, stiffness: 120)
  const camSpring = spring({
    frame: localFrame,
    fps,
    config: {
      damping: 18,
      stiffness: 120,
    },
  });

  const camX = interpolate(
    camSpring,
    [0, 1],
    [prevPhase?.camera.x ?? 0, activePhase?.camera.x ?? 0],
  );
  const camY = interpolate(
    camSpring,
    [0, 1],
    [prevPhase?.camera.y ?? 0, activePhase?.camera.y ?? 0],
  );
  const camScale = interpolate(
    camSpring,
    [0, 1],
    [prevPhase?.camera.scale ?? 1, activePhase?.camera.scale ?? 1],
  );

  // Compile all 3D parts into depth-sorted (Painter's Algorithm) 2D SVG polygons
  const allFaces: IsoFace3D[] = [];
  const partAnchors2D: Array<{
    partId: string;
    sx: number;
    sy: number;
    isFocused: boolean;
  }> = [];

  for (const part of visualScene?.parts || []) {
    const isFocused =
      activePhase?.activeComponentIds?.includes(part.componentId) ?? true;
    const { faces, anchor3D } = buildAnimatedPartFaces(part, frame, isFocused);
    allFaces.push(...faces);

    const pt2D = projectIso3D(anchor3D, DEFAULT_ISO_CONFIG);
    partAnchors2D.push({
      partId: part.partId,
      sx: pt2D.sx,
      sy: pt2D.sy,
      isFocused,
    });
  }

  const compiledPolygons = compileIsoFacesToSvgPolygons(
    allFaces,
    DEFAULT_ISO_CONFIG,
  );

  // Isometric pedestal base ring projected in 3D at z = -76
  const basePedestalRing = Array.from({ length: 24 }).map((_, i) => {
    const ang = (i / 24) * Math.PI * 2;
    return projectIso3D(
      { x: Math.cos(ang) * 78, y: Math.sin(ang) * 78, z: -76 },
      DEFAULT_ISO_CONFIG,
    );
  });
  const pedestalPathD =
    basePedestalRing
      .map(
        (p, idx) =>
          `${idx === 0 ? "M" : "L"} ${p.sx.toFixed(1)} ${p.sy.toFixed(1)}`,
      )
      .join(" ") + " Z";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#F8F9FA",
        backgroundImage:
          "radial-gradient(circle at 50% 48%, #FFFFFF 0%, #F8F9FA 62%, #E2E8F0 100%)",
        overflow: "hidden",
      }}
    >
      {/* Warm Studio Floor Shadow */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 1350,
          width: 680,
          height: 150,
          marginLeft: -340,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.14) 0%, rgba(15, 23, 42, 0.0) 72%)",
          transform: `translate(${camX * 0.5}px, ${camY * 0.5}px) scale(${camScale})`,
        }}
      />

      {/* Universal 3D-to-2D Isometric SVG Compiler Output (ZERO raw <text> inside geometry) */}
      <svg
        viewBox="0 0 1080 1920"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          transform: `translate(${camX}px, ${camY}px) scale(${camScale})`,
          transformOrigin: "540px 1020px",
        }}
      >
        <defs>
          {/* Cross-Section Hatching Pattern for 90° Cutaway Walls */}
          <pattern
            id="iso-cutaway-hatch"
            width="10"
            height="10"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke="#1E293B"
              strokeWidth="2"
              opacity="0.28"
            />
          </pattern>
        </defs>

        {/* 1. Isometric Studio Pedestal Base Disc */}
        <path
          d={pedestalPathD}
          fill="#E2E8F0"
          fillOpacity={0.55}
          stroke="#CBD5E1"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* 2. Depth-Sorted 3D Isometric Polygons (Painter's Algorithm) */}
        {compiledPolygons.map((poly) => (
          <g key={poly.id} opacity={poly.opacity}>
            <path
              d={poly.d}
              fill={poly.fill}
              stroke={poly.stroke}
              strokeWidth={poly.strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {poly.isCutawayCap && (
              <path
                d={poly.d}
                fill="url(#iso-cutaway-hatch)"
                stroke="#1E293B"
                strokeWidth={poly.strokeWidth}
                strokeLinejoin="round"
              />
            )}
          </g>
        ))}

        {/* 3. 3D Particle & Physics Streams Projected Along 3D Paths */}
        {(visualScene?.particleStreams || []).map((stream) =>
          renderIsoParticleStream3D(
            stream,
            frame,
            activePhase?.segmentIndex ?? 0,
          ),
        )}

        {/* 4. 3D Socket Anchor Dots for <PopUpCallout /> Pill Pointers */}
        {partAnchors2D.map((anchor) => (
          <circle
            key={`socket_${anchor.partId}`}
            cx={anchor.sx}
            cy={anchor.sy}
            r={anchor.isFocused ? 7.5 : 5.5}
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth={3}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
