import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  SemanticIsoScene,
  SemanticIsoPart,
  PhaseTimelineBlock,
  Point3D,
} from "@/schemas/video-blueprint";
import {
  projectIso,
  calculateFaceNormal,
  computeStageFit,
  getFaceShading,
  sortFacesBackToFront,
  type RenderableFace,
  type Face3D,
  type PaletteToken,
  createBox,
  createSheet,
  createWedge,
  createCylinder,
  createCutawayCylinder,
  createCutawayBox,
  createExtrudePolygon,
  createPipe,
  createWaveSurface,
  createSphere,
  rotatePointZ,
} from "@/iso";

interface IsometricStageProps {
  visualScene: SemanticIsoScene;
  phases: PhaseTimelineBlock[];
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

function generatePartBaseFaces(part: SemanticIsoPart): Face3D[] {
  if (!part || !part.shape) {
    return [];
  }
  const { shape, position: pos = { x: 0, y: 0, z: 0 }, partId } = part;
  switch (shape.type) {
    case "box":
      return createBox({
        partId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        dx: shape.dx,
        dy: shape.dy,
        dz: shape.dz,
      });

    case "sheet":
      return createSheet({
        partId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        dx: shape.dx,
        dy: shape.dy,
        thickness: shape.thickness ?? 0.2,
      });

    case "wedge":
      return createWedge({
        partId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        dx: shape.dx,
        dy: shape.dy,
        dz: shape.dz,
        slopeAxis: shape.slopeAxis ?? "x",
      });

    case "cylinder":
      return createCylinder({
        partId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        radius: shape.radius,
        height: shape.height,
      });

    case "cutawayCylinder":
      return createCutawayCylinder({
        partId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        radius: shape.radius,
        height: shape.height,
        wall: shape.wall,
        cut: shape.cut,
      });

    case "cutawayBox":
      return createCutawayBox({
        partId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        dx: shape.dx,
        dy: shape.dy,
        dz: shape.dz,
        cutRatio: {
          x: shape.cutRatioX ?? 0.5,
          y: shape.cutRatioY ?? 0.5,
        },
        floor: shape.floor ?? 0.4,
      });

    case "extrudePolygon":
      return createExtrudePolygon({
        partId,
        footprint: shape.footprint.map((p) => ({
          x: p.x + pos.x,
          y: p.y + pos.y,
        })),
        z: pos.z,
        dz: shape.dz,
      });

    case "pipe":
      return createPipe({
        partId,
        points: shape.points.map((p) => ({
          x: p.x + pos.x,
          y: p.y + pos.y,
          z: p.z + pos.z,
        })),
        radius: shape.radius ?? 0.3,
      });

    case "waveSurface":
      return createWaveSurface({
        partId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        dx: shape.dx,
        dy: shape.dy,
        amplitude: shape.amplitude ?? 0.4,
        wavelength: shape.wavelength ?? 3.0,
      });

    case "sphere":
      return createSphere({
        partId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        radius: shape.radius,
      });

    default:
      return [];
  }
}

interface InterpolatedState {
  visible: boolean;
  offset3D: Point3D;
  emphasis: "normal" | "focus" | "dim";
}

function getInterpolatedPartState(
  part: SemanticIsoPart,
  frame: number,
  phases: PhaseTimelineBlock[]
): InterpolatedState {
  const getPhaseState = (pIdx: number): InterpolatedState => {
    const found = part.states?.find((s) => s.phase === pIdx);
    return {
      visible: found?.visible ?? true,
      offset3D: found?.offset3D ?? { x: 0, y: 0, z: 0 },
      emphasis: found?.emphasis ?? "normal",
    };
  };

  if (!phases.length) {
    return getPhaseState(0);
  }

  let currentIdx = 0;
  for (let i = 0; i < phases.length; i++) {
    if (frame >= phases[i].startFrame) {
      currentIdx = i;
    }
  }

  const nextIdx = Math.min(phases.length - 1, currentIdx + 1);
  if (currentIdx === nextIdx) {
    return getPhaseState(currentIdx);
  }

  const nextStart = phases[nextIdx].startFrame;
  const tStart = nextStart - 14;
  const tEnd = nextStart + 14;

  if (frame < tStart) {
    return getPhaseState(currentIdx);
  }
  if (frame > tEnd) {
    return getPhaseState(nextIdx);
  }

  const progress = (frame - tStart) / (tEnd - tStart);
  const eased = progress * progress * (3 - 2 * progress);

  const sCurrent = getPhaseState(currentIdx);
  const sNext = getPhaseState(nextIdx);

  return {
    visible: sCurrent.visible || sNext.visible,
    offset3D: {
      x: (1 - eased) * sCurrent.offset3D.x + eased * sNext.offset3D.x,
      y: (1 - eased) * sCurrent.offset3D.y + eased * sNext.offset3D.y,
      z: (1 - eased) * sCurrent.offset3D.z + eased * sNext.offset3D.z,
    },
    emphasis: progress < 0.5 ? sCurrent.emphasis : sNext.emphasis,
  };
}

export const IsometricStage: React.FC<IsometricStageProps> = ({
  visualScene,
  phases,
}) => {
  const frame = useCurrentFrame();
  const { width = 1080, height = 1920 } = useVideoConfig();

  const ANTICIPATION_FRAMES = 12;

  let targetIndex = 0;
  for (let i = phases.length - 1; i >= 0; i--) {
    const threshold = phases[i].startFrame - (i === 0 ? 0 : ANTICIPATION_FRAMES);
    if (frame >= threshold) {
      targetIndex = i;
      break;
    }
  }

  const targetPhase = phases[targetIndex] ?? phases[0];
  const sourcePhase = phases[Math.max(0, targetIndex - 1)] ?? targetPhase;

  const activePhase =
    phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ??
    phases[phases.length - 1] ??
    phases[0];

  const transitionStart =
    targetPhase.startFrame - (targetIndex === 0 ? 0 : ANTICIPATION_FRAMES);
  const transitionFrames = 24;
  const progress = interpolate(
    frame,
    [transitionStart, transitionStart + transitionFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI);

  const camX = interpolate(
    easedProgress,
    [0, 1],
    [sourcePhase.camera.x, targetPhase.camera.x]
  );
  const camY = interpolate(
    easedProgress,
    [0, 1],
    [sourcePhase.camera.y, targetPhase.camera.y]
  );
  const camScale = interpolate(
    easedProgress,
    [0, 1],
    [sourcePhase.camera.scale, targetPhase.camera.scale]
  );

  const allRenderableFaces: (RenderableFace & {
    colorToken: PaletteToken;
    emphasis: "normal" | "focus" | "dim";
  })[] = [];

  const flowPipes: {
    partId: string;
    points2D: { x: number; y: number }[];
    speed: number;
  }[] = [];

  const socketAnchors: {
    partId: string;
    anchor2D: { x: number; y: number };
    isFocused: boolean;
  }[] = [];

  // 1. Collect all static 3D points for auto-fit calculation
  const allFitPoints: Point3D[] = [];
  for (const part of visualScene?.parts || []) {
    if (!part || !part.shape) continue;
    const baseFaces = generatePartBaseFaces(part);
    for (const f of baseFaces) {
      allFitPoints.push(...f.points3D);
    }
  }

  const fitConfig = computeStageFit(allFitPoints, {
    stageCenterX: width / 2,
    stageCenterY: height === 1080 ? 540 : 1000,
    maxStageWidth: height === 1080 ? 1200 : 800,
    maxStageHeight: height === 1080 ? 700 : 860,
  });

  // 2. Process each part with 3D animation & continuous phase states
  for (const part of visualScene?.parts || []) {
    if (!part || !part.shape) continue;
    const state = getInterpolatedPartState(part, frame, phases);
    if (!state.visible) continue;

    const baseFaces = generatePartBaseFaces(part);
    const partCenter = computeCentroid(baseFaces.flatMap((f) => f.points3D));

    // Dynamic 3D Animation offsets
    const anim = part.animation;
    const speed = anim?.speed ?? 1;
    let animOffsetX = 0;
    let animOffsetY = 0;
    let animOffsetZ = 0;
    let rotateAngle = 0;
    let pulseScale = 1;

    const isAnimActive =
      anim &&
      anim.type !== "none" &&
      (anim.activeInPhases?.includes(activePhase.segmentIndex) ?? true);

    if (isAnimActive) {
      if (anim.type === "translate3D") {
        const delta = (anim.amplitude || 0.6) * Math.sin(frame * 0.1 * speed);
        if (anim.axis === "x") animOffsetX = delta;
        else if (anim.axis === "y") animOffsetY = delta;
        else animOffsetZ = delta;
      } else if (anim.type === "rotate3D") {
        rotateAngle =
          (frame * (anim.amplitude || 360) / 60 * speed) * (Math.PI / 180);
      } else if (anim.type === "pulse") {
        pulseScale = 1 + (anim.amplitude || 0.1) * 0.08 * Math.sin(frame * 0.12 * speed);
      }
    }

    const rotPivot = anim?.pivot ?? { x: partCenter.x, y: partCenter.y };

    // Transform each face in 3D grid space
    for (const bf of baseFaces) {
      const transformedPts: Point3D[] = bf.points3D.map((p) => {
        let x = p.x;
        let y = p.y;
        let z = p.z;

        // Part static rotationZ
        if (part.rotationZ) {
          const pr = rotatePointZ(
            { x, y, z },
            part.rotationZ,
            partCenter.x,
            partCenter.y
          );
          x = pr.x;
          y = pr.y;
          z = pr.z;
        }

        // Pulse scale
        if (pulseScale !== 1) {
          x = partCenter.x + (x - partCenter.x) * pulseScale;
          y = partCenter.y + (y - partCenter.y) * pulseScale;
          z = partCenter.z + (z - partCenter.z) * pulseScale;
        }

        // rotate3D around pivot in x-y
        if (rotateAngle !== 0) {
          const dx = x - rotPivot.x;
          const dy = y - rotPivot.y;
          x = rotPivot.x + dx * Math.cos(rotateAngle) - dy * Math.sin(rotateAngle);
          y = rotPivot.y + dx * Math.sin(rotateAngle) + dy * Math.cos(rotateAngle);
        }

        // 3D translate offset & phase offset3D
        x += animOffsetX + state.offset3D.x;
        y += animOffsetY + state.offset3D.y;
        z += animOffsetZ + state.offset3D.z;

        return { x, y, z };
      });

      const newCentroid = computeCentroid(transformedPts);
      const newNormal = calculateFaceNormal(transformedPts);

      allRenderableFaces.push({
        id: bf.id,
        partId: part.partId,
        points3D: transformedPts,
        normal: newNormal,
        role: bf.role,
        isCutaway: bf.isCutaway || part.material === "cut",
        centroid3D: newCentroid,
        depthKey: newCentroid.x + newCentroid.y + newCentroid.z,
        material: part.material,
        layerBias: part.layerBias,
        colorToken: part.color,
        emphasis: state.emphasis,
      });
    }

    // Capture Pipe Flow Path
    if (part.shape.type === "pipe" && anim?.type === "flow") {
      const polyPts2D = part.shape.points.map((pt) => {
        const world3D: Point3D = {
          x: part.position.x + pt.x + animOffsetX + state.offset3D.x,
          y: part.position.y + pt.y + animOffsetY + state.offset3D.y,
          z: part.position.z + pt.z + animOffsetZ + state.offset3D.z,
        };
        return projectIso(world3D, fitConfig.unitScale, fitConfig.originX, fitConfig.originY);
      });
      flowPipes.push({
        partId: part.partId,
        points2D: polyPts2D,
        speed,
      });
    }

    // Socket dot anchor in 2D
    const dynamicCenter: Point3D = {
      x: partCenter.x + animOffsetX + state.offset3D.x,
      y: partCenter.y + animOffsetY + state.offset3D.y,
      z: partCenter.z + animOffsetZ + state.offset3D.z,
    };
    const anchor2D = projectIso(
      dynamicCenter,
      fitConfig.unitScale,
      fitConfig.originX,
      fitConfig.originY
    );
    const isFocused =
      state.emphasis === "focus" ||
      (activePhase?.activeComponentIds?.includes(part.componentId) ?? true);

    socketAnchors.push({
      partId: part.partId,
      anchor2D,
      isFocused,
    });
  }

  // 3. Backface Culling & Depth Sort
  const sortedFaces = sortFacesBackToFront(allRenderableFaces);

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

      {/* SVG Canvas with Camera Zoom/Pan Transform */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          transform: `translate(${camX}px, ${camY}px) scale(${camScale})`,
          transformOrigin: `${width / 2}px 1020px`,
        }}
      >
        <defs>
          {/* Diagonal 45° Technical Cutaway Cross-Section Hatch */}
          <pattern
            id="iso-cut-hatch"
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
              strokeWidth="2.2"
              opacity="0.35"
            />
          </pattern>
          {/* Legacy Gradients and Defs from previous version pipeline jobs */}
          {(visualScene as unknown as { svgDefsMarkup?: string })?.svgDefsMarkup && (
            <g
              dangerouslySetInnerHTML={{
                __html: (visualScene as unknown as { svgDefsMarkup?: string }).svgDefsMarkup || "",
              }}
            />
          )}
        </defs>

        {/* Studio Pedestal Base Ring beneath stage */}
        <ellipse
          cx={width / 2}
          cy={1290}
          rx={380}
          ry={140}
          fill="#E2E8F0"
          fillOpacity={0.5}
          stroke="#CBD5E1"
          strokeWidth={2}
        />
        <ellipse
          cx={width / 2}
          cy={1280}
          rx={350}
          ry={125}
          fill="#F1F5F9"
          fillOpacity={0.65}
        />

        {/* Render Deterministic 3D Projected Isometric Faces OR Legacy SVG Parts */}
        {sortedFaces.length > 0 ? (
          <g id="iso-stage-faces">
            {sortedFaces.map((face) => {
              const screenPoints = face.points3D.map((pt) =>
                projectIso(pt, fitConfig.unitScale, fitConfig.originX, fitConfig.originY)
              );
              const pointsStr = screenPoints
                .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                .join(" ");

              const shading = getFaceShading(
                face.colorToken ?? "metal",
                face.role,
                face.material
              );

              // Emphasis styling: Dimmed background parts in Phase 2
              let opacity = shading.fillOpacity;
              if (face.emphasis === "dim") {
                opacity = 0.25;
              } else if (face.emphasis === "focus") {
                opacity = Math.max(opacity, 0.95);
              }

              return (
                <g key={face.id}>
                  {/* Base Cel-Shaded Polygon */}
                  <polygon
                    points={pointsStr}
                    fill={shading.fill}
                    fillOpacity={opacity}
                    stroke={shading.stroke}
                    strokeWidth={shading.strokeWidth}
                    strokeLinejoin={shading.strokeLinejoin}
                    strokeLinecap="round"
                  />

                  {/* Diagonal Cutaway Hatching Overlay for Cross-Sections */}
                  {(face.isCutaway || shading.hatchPatternId) && (
                    <polygon
                      points={pointsStr}
                      fill="url(#iso-cut-hatch)"
                      fillOpacity={opacity * 0.9}
                      stroke="none"
                    />
                  )}
                </g>
              );
            })}
          </g>
        ) : (
          /* Legacy SVG Markup Fallback (for older jobs or jobs without 3D shape definitions) */
          <svg
            x="40"
            y="520"
            width="1000"
            height="1000"
            viewBox="0 0 1000 1000"
            style={{ overflow: "visible" }}
          >
            {([...(visualScene?.parts || [])])
              .sort(
                (a: unknown, b: unknown) =>
                  ((a as { layerOrder?: number }).layerOrder ?? 50) -
                  ((b as { layerOrder?: number }).layerOrder ?? 50)
              )
              .map((partRaw: unknown) => {
                const part = partRaw as {
                  partId: string;
                  componentId: string;
                  svgMarkup?: string;
                  isCutawayWall?: boolean;
                  anchorPoint?: { x: number; y: number };
                  animation?: {
                    type?: string;
                    speed?: number;
                    dx?: number;
                    dy?: number;
                    rotateDeg?: number;
                  };
                };
                if (!part.svgMarkup) return null;
                const isFocused =
                  activePhase?.activeComponentIds?.includes(part.componentId) ?? true;
                const partOpacity = isFocused ? (part.isCutawayWall ? 0.4 : 1) : 0.45;
                const anchorX = part.anchorPoint?.x ?? 500;
                const anchorY = part.anchorPoint?.y ?? 500;

                let animTransform = "";
                const anim = part.animation;
                if (anim && anim.type !== "none") {
                  const spd = anim.speed || 1;
                  if (anim.type === "translate") {
                    const wave = Math.sin(frame * 0.08 * spd);
                    animTransform = `translate(${((anim.dx || 0) * wave).toFixed(2)}px, ${((anim.dy || 0) * wave).toFixed(2)}px)`;
                  } else if (anim.type === "rotate") {
                    const deg = ((frame * (anim.rotateDeg ? anim.rotateDeg / 60 : 2.5) * spd) % 360).toFixed(2);
                    animTransform = `rotate(${deg}deg)`;
                  } else if (anim.type === "pulse" || anim.type === "scale") {
                    const sc = (1 + 0.05 * Math.sin(frame * 0.12 * spd)).toFixed(3);
                    animTransform = `scale(${sc})`;
                  }
                }

                return (
                  <g
                    key={part.partId}
                    id={part.partId}
                    opacity={partOpacity}
                    style={{
                      transform: animTransform,
                      transformOrigin: `${anchorX}px ${anchorY}px`,
                      transition: "opacity 0.25s ease-in-out",
                    }}
                    dangerouslySetInnerHTML={{ __html: part.svgMarkup }}
                  />
                );
              })}
          </svg>
        )}

        {/* 3D Pipe Flow Paths (Dashed Animated Lines) */}
        <g id="iso-pipe-flows">
          {flowPipes.map((fp) => {
            const polyPoints = fp.points2D
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(" ");
            return (
              <polyline
                key={`flow_${fp.partId}`}
                points={polyPoints}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeDasharray="9 7"
                strokeDashoffset={-frame * fp.speed * 2.5}
                strokeLinecap="round"
                opacity={0.88}
              />
            );
          })}
        </g>

        {/* Part Callout Socket Dots */}
        <g id="iso-socket-dots">
          {sortedFaces.length > 0 ? (
            socketAnchors.map((socket) => (
              <g key={`socket_${socket.partId}`}>
                {socket.isFocused && (
                  <circle
                    cx={socket.anchor2D.x}
                    cy={socket.anchor2D.y}
                    r={12}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    opacity={0.6 + 0.35 * Math.sin(frame * 0.15)}
                  />
                )}
                <circle
                  cx={socket.anchor2D.x}
                  cy={socket.anchor2D.y}
                  r={socket.isFocused ? 6.5 : 4.5}
                  fill="#FFFFFF"
                  stroke="#1E293B"
                  strokeWidth={2.5}
                />
              </g>
            ))
          ) : (
            (visualScene?.parts || []).map((partRaw: unknown) => {
              const part = partRaw as {
                partId: string;
                componentId: string;
                anchorPoint?: { x: number; y: number };
              };
              if (!part.anchorPoint) return null;
              const isFocused =
                activePhase?.activeComponentIds?.includes(part.componentId) ?? true;
              const sx = 40 + (part.anchorPoint.x ?? 500);
              const sy = 520 + (part.anchorPoint.y ?? 500);
              return (
                <g key={`legacy_socket_${part.partId}`}>
                  {isFocused && (
                    <circle
                      cx={sx}
                      cy={sy}
                      r={11}
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth={2}
                      opacity={0.6 + 0.35 * Math.sin(frame * 0.15)}
                    />
                  )}
                  <circle
                    cx={sx}
                    cy={sy}
                    r={isFocused ? 6.5 : 4.5}
                    fill="#FFFFFF"
                    stroke="#1E293B"
                    strokeWidth={2.5}
                  />
                </g>
              );
            })
          )}
        </g>
      </svg>
    </AbsoluteFill>
  );
};
