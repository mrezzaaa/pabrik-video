import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  IsoSceneGraph,
  IsoVectorPart,
  PhaseTimelineBlock,
} from "@/schemas/video-blueprint";

interface IsometricStageProps {
  visualScene: IsoSceneGraph;
  phases: PhaseTimelineBlock[];
}

/**
 * Computes CSS transform string for an animated IsoVectorPart on the 1000x1000 stage.
 */
function getPartAnimationTransform(
  part: IsoVectorPart,
  frame: number,
  activeSegmentIndex: number
): string {
  const anim = part.animation;
  if (!anim || anim.type === "none") {
    return "";
  }

  // Only animate if the current phase is in activeInPhases
  if (
    anim.activeInPhases &&
    anim.activeInPhases.length > 0 &&
    !anim.activeInPhases.includes(activeSegmentIndex)
  ) {
    return "";
  }

  const speed = anim.speed || 1;

  switch (anim.type) {
    case "translate": {
      const wave = Math.sin(frame * 0.08 * speed);
      const tx = (anim.dx || 0) * wave;
      const ty = (anim.dy || 0) * wave;
      return `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
    }

    case "rotate": {
      const degRate = anim.rotateDeg ? anim.rotateDeg / 60 : 2.5;
      const deg = (frame * degRate * speed) % 360;
      return `rotate(${deg.toFixed(2)}deg)`;
    }

    case "scale": {
      const targetFactor = anim.scaleFactor || 1.08;
      const wave = (Math.sin(frame * 0.1 * speed) + 1) * 0.5;
      const currentScale = 1 + (targetFactor - 1) * wave;
      return `scale(${currentScale.toFixed(3)})`;
    }

    case "pulse": {
      const pulseWave = 1 + 0.045 * Math.sin(frame * 0.12 * speed);
      return `scale(${pulseWave.toFixed(3)})`;
    }

    default:
      return "";
  }
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
    [prevPhase?.camera.x ?? 0, activePhase?.camera.x ?? 0]
  );
  const camY = interpolate(
    camSpring,
    [0, 1],
    [prevPhase?.camera.y ?? 0, activePhase?.camera.y ?? 0]
  );
  const camScale = interpolate(
    camSpring,
    [0, 1],
    [prevPhase?.camera.scale ?? 1, activePhase?.camera.scale ?? 1]
  );

  // Painter's order: sort parts back-to-front (layerOrder 1..100)
  const sortedParts = [...(visualScene?.parts || [])].sort(
    (a, b) => (a.layerOrder ?? 50) - (b.layerOrder ?? 50)
  );

  const activeSegmentIndex = activePhase?.segmentIndex ?? 0;

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

      {/* Main 1080x1920 SVG Viewport with Camera Transforms */}
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
            width="12"
            height="12"
            patternTransform="rotate(45 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="12"
              stroke="#1E293B"
              strokeWidth="2.5"
              opacity="0.32"
            />
          </pattern>

          {/* Shared Defs from LLM (Gradients, ClipPaths, Filters) */}
          {visualScene?.svgDefsMarkup && (
            <g
              dangerouslySetInnerHTML={{
                __html: visualScene.svgDefsMarkup,
              }}
            />
          )}
        </defs>

        {/* Studio Pedestal Base Disc beneath stage */}
        <ellipse
          cx="540"
          cy="1260"
          rx="380"
          ry="140"
          fill="#E2E8F0"
          fillOpacity={0.6}
          stroke="#CBD5E1"
          strokeWidth={2}
        />
        <ellipse
          cx="540"
          cy="1250"
          rx="350"
          ry="125"
          fill="#F1F5F9"
          fillOpacity={0.7}
        />

        {/* 
          1000x1000 Normalized Isometric Stage Canvas
          Positioned centered horizontally at x=40, vertically at y=520
        */}
        <svg
          x="40"
          y="520"
          width="1000"
          height="1000"
          viewBox="0 0 1000 1000"
          style={{ overflow: "visible" }}
        >
          {/* Render Vector Anatomy Parts in strict Layer Order */}
          {sortedParts.map((part) => {
            const isFocused =
              activePhase?.activeComponentIds?.includes(part.componentId) ??
              true;

            const animTransform = getPartAnimationTransform(
              part,
              frame,
              activeSegmentIndex
            );

            // Opacity: If cutaway wall, slightly translucent or full outline
            const partOpacity = isFocused
              ? part.isCutawayWall
                ? 0.4
                : 1
              : 0.45;

            const anchorX = part.anchorPoint?.x ?? 500;
            const anchorY = part.anchorPoint?.y ?? 500;

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

          {/* Part Anchor Socket Dots for <PopUpCallout /> Dark Pills */}
          {sortedParts.map((part) => {
            const isFocused =
              activePhase?.activeComponentIds?.includes(part.componentId) ??
              true;

            const anchorX = part.anchorPoint?.x ?? 500;
            const anchorY = part.anchorPoint?.y ?? 500;

            return (
              <g key={`socket_${part.partId}`}>
                {/* Subtle pulse ring for focused active parts */}
                {isFocused && (
                  <circle
                    cx={anchorX}
                    cy={anchorY}
                    r={11}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    opacity={0.6 + 0.35 * Math.sin(frame * 0.15)}
                  />
                )}
                <circle
                  cx={anchorX}
                  cy={anchorY}
                  r={isFocused ? 6.5 : 4.5}
                  fill="#FFFFFF"
                  stroke="#1E293B"
                  strokeWidth={2.5}
                />
              </g>
            );
          })}
        </svg>
      </svg>
    </AbsoluteFill>
  );
};
