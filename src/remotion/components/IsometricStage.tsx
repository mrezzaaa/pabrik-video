import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  CustomSvgElement,
  ParametricSceneGraph,
  ParticleFlowSpec,
  PhaseTimelineBlock,
} from "@/schemas/video-blueprint";

interface IsometricStageProps {
  scene: ParametricSceneGraph;
  phases: PhaseTimelineBlock[];
}

function renderCustomSvgElement(el: CustomSvgElement, key: string) {
  const stroke = el.stroke || "#1E293B";
  const strokeWidth = el.strokeWidth ?? 2.5;
  const fill = el.fill || "#E2E8F0";

  switch (el.shape) {
    case "rect": {
      const rx = el.rx ?? 10;
      const x = el.x ?? 300;
      const y = el.y ?? 750;
      const w = el.width ?? 160;
      const h = el.height ?? 80;
      return (
        <g key={key} opacity={el.opacity ?? 1}>
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={rx}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={el.strokeDasharray}
          />
          {el.label && (
            <text
              x={x + w / 2}
              y={y + h / 2 + 6}
              textAnchor="middle"
              fill="#0F172A"
              fontSize={18}
              fontWeight={800}
              fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case "circle": {
      const cx = el.x ?? 540;
      const cy = el.y ?? 980;
      const r = el.r ?? 32;
      return (
        <g key={key} opacity={el.opacity ?? 1}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={el.strokeDasharray}
          />
          {el.label && (
            <text
              x={cx}
              y={cy + 6}
              textAnchor="middle"
              fill="#0F172A"
              fontSize={16}
              fontWeight={800}
              fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
            >
              {el.label}
            </text>
          )}
        </g>
      );
    }
    case "ellipse": {
      const cx = el.x ?? 540;
      const cy = el.y ?? 980;
      const rx = el.rx ?? el.width ?? 80;
      const ry = el.ry ?? el.height ?? 36;
      return (
        <ellipse
          key={key}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={el.strokeDasharray}
          opacity={el.opacity ?? 1}
        />
      );
    }
    case "line": {
      return (
        <line
          key={key}
          x1={el.x ?? 340}
          y1={el.y ?? 800}
          x2={el.x2 ?? 740}
          y2={el.y2 ?? 800}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={el.strokeDasharray}
          strokeLinecap="round"
          opacity={el.opacity ?? 1}
        />
      );
    }
    case "polygon": {
      if (!el.points) return null;
      return (
        <polygon
          key={key}
          points={el.points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={el.opacity ?? 1}
        />
      );
    }
    case "path": {
      if (!el.d) return null;
      return (
        <path
          key={key}
          d={el.d}
          fill={fill === "none" ? "none" : fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={el.strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={el.opacity ?? 1}
        />
      );
    }
    default:
      return null;
  }
}

function renderParametricOuterContainer(scene: ParametricSceneGraph) {
  const { containerType, outerBounds } = scene;
  const x = outerBounds.x ?? 220;
  const y = outerBounds.y ?? 620;
  const w = outerBounds.width ?? 640;
  const h = outerBounds.height ?? 760;
  const wall = outerBounds.wallThickness ?? 24;
  const outerFill = outerBounds.outerFill || "#E2E8F0";
  const interiorFill = outerBounds.interiorFill || "#F8FAFC";
  const cx = x + w / 2;

  switch (containerType) {
    case "cylinder-cutaway": {
      const rx = w / 2;
      const ry = 76;
      return (
        <g>
          {/* Bottom Cylinder Base */}
          <ellipse
            cx={cx}
            cy={y + h}
            rx={rx}
            ry={ry}
            fill="#CBD5E1"
            stroke="#1E293B"
            strokeWidth={3}
          />
          {/* Outer Shell */}
          <path
            d={`M ${x} ${y} L ${x} ${y + h} A ${rx} ${ry} 0 0 0 ${x + w} ${y + h} L ${x + w} ${y} Z`}
            fill={outerFill}
            stroke="#1E293B"
            strokeWidth={3}
          />
          {/* 90-Degree Cross-Section Cutaway Cavity */}
          <rect
            x={x + wall}
            y={y + wall}
            width={w - wall * 2}
            height={h - wall * 1.4}
            rx={18}
            fill={interiorFill}
            stroke="#1E293B"
            strokeWidth={2.5}
          />
          {/* Top Rim */}
          <ellipse
            cx={cx}
            cy={y}
            rx={rx}
            ry={ry}
            fill="#E2E8F0"
            stroke="#1E293B"
            strokeWidth={3}
          />
        </g>
      );
    }

    case "dual-chamber": {
      const gap = 22;
      const chamberW = (w - wall * 2 - gap) / 2;
      return (
        <g>
          {/* Isometric 3D Depth Shadow Block */}
          <rect
            x={x + 16}
            y={y + 16}
            width={w}
            height={h}
            rx={32}
            fill="#94A3B8"
            stroke="#1E293B"
            strokeWidth={3}
          />
          {/* Outer Casing */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={30}
            fill={outerFill}
            stroke="#1E293B"
            strokeWidth={3}
          />
          {/* Left Chamber Cutaway */}
          <rect
            x={x + wall}
            y={y + wall + 30}
            width={chamberW}
            height={h - wall * 2 - 45}
            rx={18}
            fill={interiorFill}
            stroke="#1E293B"
            strokeWidth={2.5}
          />
          {/* Right Chamber Cutaway */}
          <rect
            x={x + wall + chamberW + gap}
            y={y + wall + 30}
            width={chamberW}
            height={h - wall * 2 - 45}
            rx={18}
            fill={interiorFill}
            stroke="#1E293B"
            strokeWidth={2.5}
          />
          {/* Top Bridge Terminal Header */}
          <rect
            x={cx - 110}
            y={y - 26}
            width={220}
            height={38}
            rx={10}
            fill="#FACC15"
            stroke="#1E293B"
            strokeWidth={2.5}
          />
        </g>
      );
    }

    case "layered-stack": {
      return (
        <g>
          {/* 3D Isometric Extrusion Backplate */}
          <rect
            x={x + 18}
            y={y + 18}
            width={w}
            height={h}
            rx={28}
            fill="#94A3B8"
            stroke="#1E293B"
            strokeWidth={3}
          />
          {/* Outer Frame */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={26}
            fill={outerFill}
            stroke="#1E293B"
            strokeWidth={3}
          />
          {/* Cutaway Window */}
          <rect
            x={x + wall}
            y={y + wall}
            width={w - wall * 2}
            height={h - wall * 2}
            rx={16}
            fill={interiorFill}
            stroke="#1E293B"
            strokeWidth={2.5}
          />
        </g>
      );
    }

    case "circuit-board": {
      return (
        <g>
          <rect
            x={x + 14}
            y={y + 14}
            width={w}
            height={h}
            rx={24}
            fill="#1E293B"
          />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={24}
            fill="#DCFCE7"
            stroke="#1E293B"
            strokeWidth={3}
          />
          <rect
            x={x + wall}
            y={y + wall}
            width={w - wall * 2}
            height={h - wall * 2}
            rx={14}
            fill={interiorFill}
            stroke="#1E293B"
            strokeWidth={2.5}
          />
        </g>
      );
    }

    case "mechanical-housing":
    case "box-cutaway":
    default: {
      return (
        <g>
          <rect
            x={x + 16}
            y={y + 16}
            width={w}
            height={h}
            rx={28}
            fill="#94A3B8"
            stroke="#1E293B"
            strokeWidth={3}
          />
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={28}
            fill={outerFill}
            stroke="#1E293B"
            strokeWidth={3}
          />
          <rect
            x={x + wall}
            y={y + wall}
            width={w - wall * 2}
            height={h - wall * 2}
            rx={18}
            fill={interiorFill}
            stroke="#1E293B"
            strokeWidth={2.5}
          />
        </g>
      );
    }
  }
}

function renderParticleFlow(
  flow: ParticleFlowSpec,
  frame: number,
  activeSegmentIndex: number,
) {
  if (
    flow.activeInPhases &&
    flow.activeInPhases.length > 0 &&
    !flow.activeInPhases.includes(activeSegmentIndex)
  ) {
    return null;
  }

  const count = Math.min(20, Math.max(4, flow.count || 10));
  const speed = flow.speed || 1.4;
  const r = flow.size || 10;
  const dx = flow.to.x - flow.from.x;
  const dy = flow.to.y - flow.from.y;

  return (
    <g key={flow.id}>
      {/* Guide Flow Path */}
      <line
        x1={flow.from.x}
        y1={flow.from.y}
        x2={flow.to.x}
        y2={flow.to.y}
        stroke={flow.color}
        strokeWidth={3}
        strokeDasharray="8 10"
        strokeDashoffset={-(frame * speed * 2.5)}
        opacity={0.45}
      />

      {/* Animated Moving Particles */}
      {Array.from({ length: count }).map((_, idx) => {
        const phaseOffset = idx / count;
        const t = (frame * 0.014 * speed + phaseOffset) % 1;
        const wave = Math.sin(t * Math.PI * 2 + idx) * 10;
        const px =
          flow.from.x + dx * t + (Math.abs(dy) > Math.abs(dx) ? wave : 0);
        const py =
          flow.from.y + dy * t + (Math.abs(dx) >= Math.abs(dy) ? wave : 0);

        if (flow.type === "ions" || flow.type === "electrons") {
          return (
            <g
              key={`${flow.id}_p_${idx}`}
              transform={`translate(${px}, ${py})`}
            >
              <circle
                cx={0}
                cy={0}
                r={r}
                fill={flow.color}
                stroke="#1E293B"
                strokeWidth={2}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill="#0F172A"
                fontSize={12}
                fontWeight={900}
                fontFamily="monospace"
              >
                {flow.type === "ions" ? "+" : "e⁻"}
              </text>
            </g>
          );
        }

        if (flow.type === "heat-waves" || flow.type === "airflow") {
          return (
            <path
              key={`${flow.id}_p_${idx}`}
              d={`M ${px - r} ${py} Q ${px} ${py - r}, ${px + r} ${py}`}
              fill="none"
              stroke={flow.color}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          );
        }

        return (
          <circle
            key={`${flow.id}_p_${idx}`}
            cx={px}
            cy={py}
            r={r}
            fill={flow.color}
            fillOpacity={0.88}
            stroke="#1E293B"
            strokeWidth={2}
          />
        );
      })}
    </g>
  );
}

export const IsometricStage: React.FC<IsometricStageProps> = ({
  scene,
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

  const sortedLayers = [...(scene.internalLayers || [])].sort(
    (a, b) => a.zIndex - b.zIndex,
  );

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
          top: 1410,
          width: 680,
          height: 140,
          marginLeft: -340,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.14) 0%, rgba(15, 23, 42, 0.0) 72%)",
          transform: `translate(${camX * 0.5}px, ${camY * 0.5}px) scale(${camScale})`,
        }}
      />

      {/* Pure Data-Driven Parametric Cutaway SVG Composer */}
      <svg
        viewBox="0 0 1080 1920"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          transform: `translate(${camX}px, ${camY}px) scale(${camScale})`,
          transformOrigin: "540px 980px",
        }}
      >
        {/* 1. Parametric Outer Cutaway Container */}
        {renderParametricOuterContainer(scene)}

        {/* 2. Container Top Header Label */}
        {scene.containerTitle && (
          <g>
            <rect
              x={310}
              y={545}
              width={460}
              height={48}
              rx={24}
              fill="#FFFFFF"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            <text
              x={540}
              y={576}
              textAnchor="middle"
              fill="#0F172A"
              fontSize={20}
              fontWeight={800}
              fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
            >
              {scene.containerTitle.toUpperCase()}
            </text>
          </g>
        )}

        {/* 3. Dynamic Internal Anatomy Layers */}
        {sortedLayers.map((layer) => {
          const isFocused =
            activePhase?.activeComponentIds?.includes(layer.componentId) ??
            true;
          const pulseScale = isFocused ? 1 + Math.sin(frame * 0.12) * 0.012 : 1;
          const b = layer.bounds;
          const centerX = b.x + b.width / 2;
          const centerY = b.y + b.height / 2;

          return (
            <g
              key={layer.id}
              opacity={isFocused ? 1 : 0.72}
              transform={`translate(${centerX}, ${centerY}) scale(${pulseScale}) translate(${-centerX}, ${-centerY})`}
            >
              {/* Layer Cutaway Block */}
              <rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                rx={b.rx ?? 14}
                fill={layer.fillColor}
                stroke={layer.outlineColor || "#1E293B"}
                strokeWidth={isFocused ? 3.2 : layer.strokeWidth || 2.5}
              />

              {/* Layer Name & Role Tag Inside Cutaway */}
              <text
                x={b.x + 18}
                y={b.y + 32}
                fill="#0F172A"
                fontSize={21}
                fontWeight={900}
                fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
              >
                {layer.name}
              </text>
              <text
                x={b.x + 18}
                y={b.y + 56}
                fill="#334155"
                fontSize={16}
                fontWeight={700}
                fontFamily="'Plus Jakarta Sans', 'Inter', sans-serif"
              >
                {layer.everydayRole}
              </text>

              {/* Layer-Specific Custom SVG Primitives */}
              {(layer.customSvgElements || []).map((el, idx) =>
                renderCustomSvgElement(el, `${layer.id}_custom_${idx}`),
              )}

              {/* Anchor Target Dot for Pill Pointers */}
              <circle
                cx={layer.anchorScreenCoord.x}
                cy={layer.anchorScreenCoord.y}
                r={7}
                fill="#FFFFFF"
                stroke="#1E293B"
                strokeWidth={3}
              />
            </g>
          );
        })}

        {/* 4. Scene-Level Custom SVG Elements */}
        {(scene.customSvgElements || []).map((el, idx) =>
          renderCustomSvgElement(el, `scene_custom_${idx}`),
        )}

        {/* 5. Dynamic Particle & Flow Systems (ions, electrons, heat-waves, fluid, airflow) */}
        {(scene.particleFlows || []).map((flow) =>
          renderParticleFlow(flow, frame, activePhase?.segmentIndex ?? 0),
        )}
      </svg>
    </AbsoluteFill>
  );
};
