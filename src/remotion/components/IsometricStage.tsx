import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  IsometricVectorLayer,
  PhaseTimelineBlock,
} from "@/schemas/video-blueprint";

interface IsometricStageProps {
  layers: IsometricVectorLayer[];
  phases: PhaseTimelineBlock[];
  primaryArchetype: string;
  coreEquationOrLaw: string;
}

/**
 * Helper to project 3D coordinates (x, y, z) onto 2D isometric SVG canvas
 * using standard 30-degree isometric projection math:
 * screenX = centerX + (x - y) * cos(30°)
 * screenY = centerY + (x + y) * sin(30°) - z
 */
function isoProject(
  x: number,
  y: number,
  z: number,
  centerX = 960,
  centerY = 580
): { x: number; y: number } {
  const cos30 = 0.8660254;
  const sin30 = 0.5;
  return {
    x: centerX + (x - y) * cos30,
    y: centerY + (x + y) * sin30 - z,
  };
}

export const IsometricStage: React.FC<IsometricStageProps> = ({
  layers,
  phases,
  coreEquationOrLaw,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Identify current phase and camera targets
  const activePhase =
    phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ??
    phases[phases.length - 1] ??
    phases[0];

  const phaseLocalFrame = Math.max(0, frame - (activePhase?.startFrame ?? 0));
  const phaseDuration = Math.max(1, activePhase?.durationInFrames ?? 300);

  // Spring transition for camera & exploded view factor
  const transitionSpring = spring({
    frame: phaseLocalFrame,
    fps,
    config: {
      damping: 18,
      stiffness: 85,
      mass: 0.9,
    },
  });

  const targetZoom = activePhase?.camera.zoom ?? 1;
  const targetPanX = activePhase?.camera.panX ?? 0;
  const targetPanY = activePhase?.camera.panY ?? 0;
  const targetExplode = activePhase?.camera.explodeFactor ?? 0;
  const targetCrossSection = activePhase?.camera.crossSectionRatio ?? 0.5;

  const currentZoom = interpolate(transitionSpring, [0, 1], [1.0, targetZoom]);
  const currentPanX = interpolate(transitionSpring, [0, 1], [0, targetPanX]);
  const currentPanY = interpolate(transitionSpring, [0, 1], [0, targetPanY]);
  const explodeProgress = interpolate(transitionSpring, [0, 1], [0.1, targetExplode]);
  const crossSectionReveal = interpolate(
    transitionSpring,
    [0, 1],
    [0.2, targetCrossSection]
  );

  // Continuous stroke-dashoffset animation for energy / heat / fluid vectors
  const dashOffset = -(frame * 3.2);
  const reverseDashOffset = frame * 2.6;
  const ambientPulse = interpolate(Math.sin(frame / 14), [-1, 1], [0.55, 1]);

  // Pre-build isometric floor grid lines
  const gridIndices = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
  const gridSpacing = 75;
  const gridExtent = 450;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#090D16",
        overflow: "hidden",
      }}
    >
      {/* Subtle radial atmospheric glow behind the isometric stage */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 54%, rgba(14, 165, 233, 0.14) 0%, rgba(30, 41, 59, 0.06) 45%, rgba(9, 13, 22, 0.95) 80%)",
        }}
      />

      {/* CSS 3D Isometric Engineering Floor Plane (rotateX(60deg) rotateZ(-45deg)) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "58%",
          width: 1100,
          height: 1100,
          marginLeft: -550,
          marginTop: -550,
          transform: `translate3d(${currentPanX}px, ${currentPanY}px, 0px) scale(${currentZoom}) rotateX(60deg) rotateZ(-45deg)`,
          transformStyle: "preserve-3d",
          backgroundImage: `
            linear-gradient(to right, #1E293B 1.5px, transparent 1.5px),
            linear-gradient(to bottom, #1E293B 1.5px, transparent 1.5px)
          `,
          backgroundSize: "55px 55px",
          border: "2px solid rgba(56, 189, 248, 0.25)",
          boxShadow: "0 0 90px rgba(14, 165, 233, 0.12) inset",
          opacity: 0.72,
        }}
      >
        {/* Rotating Isometric Target Reticle on the 3D Stage Floor */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 540,
            height: 540,
            marginLeft: -270,
            marginTop: -270,
            borderRadius: "50%",
            border: "2px dashed rgba(56, 189, 248, 0.35)",
            transform: `rotateZ(${frame * 0.35}deg)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 360,
            height: 360,
            marginLeft: -180,
            marginTop: -180,
            borderRadius: "50%",
            border: "1.5px solid rgba(34, 211, 238, 0.28)",
          }}
        />
      </div>

      {/* Precision SVG Isometric Projection Stage & Exploded Vector Layers */}
      <svg
        viewBox="0 0 1920 1080"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          inset: 0,
          transform: `translate(${currentPanX}px, ${currentPanY}px) scale(${currentZoom})`,
          transformOrigin: "960px 560px",
        }}
      >
        <defs>
          <filter id="isoGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <linearGradient id="thermalCoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.88" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="stainlessShellGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#334155" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="copperShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#D97706" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#B45309" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* Isometric Math Grid Lines & Coordinate Axes (#1E293B) */}
        <g opacity={0.65}>
          {gridIndices.map((idx) => {
            const p1 = isoProject(idx * gridSpacing, -gridExtent, -180);
            const p2 = isoProject(idx * gridSpacing, gridExtent, -180);
            const q1 = isoProject(-gridExtent, idx * gridSpacing, -180);
            const q2 = isoProject(gridExtent, idx * gridSpacing, -180);
            return (
              <React.Fragment key={`grid_${idx}`}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="#1E293B"
                  strokeWidth={idx === 0 ? 2 : 1}
                />
                <line
                  x1={q1.x}
                  y1={q1.y}
                  x2={q2.x}
                  y2={q2.y}
                  stroke="#1E293B"
                  strokeWidth={idx === 0 ? 2 : 1}
                />
              </React.Fragment>
            );
          })}
        </g>

        {/* Isometric X / Y / Z Engineering Reference Axes */}
        {(() => {
          const origin = isoProject(0, 0, -180);
          const xAxis = isoProject(480, 0, -180);
          const yAxis = isoProject(0, 480, -180);
          const zAxis = isoProject(0, 0, 340);
          return (
            <g opacity={0.75}>
              <line
                x1={origin.x}
                y1={origin.y}
                x2={xAxis.x}
                y2={xAxis.y}
                stroke="#38BDF8"
                strokeWidth={1.5}
                strokeDasharray="6 6"
              />
              <text
                x={xAxis.x + 12}
                y={xAxis.y + 6}
                fill="#38BDF8"
                fontSize={13}
                fontFamily="monospace"
              >
                +X (ISO-30°)
              </text>
              <line
                x1={origin.x}
                y1={origin.y}
                x2={yAxis.x}
                y2={yAxis.y}
                stroke="#22D3EE"
                strokeWidth={1.5}
                strokeDasharray="6 6"
              />
              <text
                x={yAxis.x - 95}
                y={yAxis.y + 6}
                fill="#22D3EE"
                fontSize={13}
                fontFamily="monospace"
              >
                +Y (ISO-150°)
              </text>
              <line
                x1={origin.x}
                y1={origin.y}
                x2={zAxis.x}
                y2={zAxis.y}
                stroke="#F59E0B"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
              <text
                x={zAxis.x - 42}
                y={zAxis.y - 12}
                fill="#F59E0B"
                fontSize={13}
                fontFamily="monospace"
              >
                +Z AXIS
              </text>
            </g>
          );
        })()}

        {/* Render each Isometric Vector Layer with Exploded View & Cross-Section Cutaway */}
        {layers.map((layer, index) => {
          const isFocused = activePhase?.activeComponentIds.includes(layer.componentId) ?? true;
          const layerHighlight = isFocused ? 1 : 0.48;

          const offsetX = layer.explodeOffsetX * explodeProgress;
          const offsetY = layer.explodeOffsetY * explodeProgress;
          const offsetZ = layer.explodeOffsetZ * explodeProgress;

          // Center of this layer in screen space
          const center = {
            x: 960 + offsetX,
            y: 550 + offsetY - offsetZ,
          };

          return (
            <g
              key={layer.id}
              opacity={layerHighlight}
              style={{
                transition: "opacity 0.25s ease",
              }}
            >
              {/* Layer 0: Outer Austenitic Stainless Shell (Cross-Section Cutaway Cylinder) */}
              {index === 0 && (
                <g transform={`translate(${offsetX}, ${offsetY - offsetZ})`}>
                  {/* Bottom Isometric Ellipse */}
                  <ellipse
                    cx={960}
                    cy={720}
                    rx={175}
                    ry={78}
                    fill="url(#stainlessShellGrad)"
                    stroke={layer.strokeColor}
                    strokeWidth={3}
                  />
                  {/* Left & Back Outer Wall */}
                  <path
                    d="M 785 350 L 785 720 A 175 78 0 0 0 1135 720 L 1135 350"
                    fill="url(#stainlessShellGrad)"
                    stroke={layer.strokeColor}
                    strokeWidth={3}
                  />
                  {/* Animated Cross-Section Cutaway Window */}
                  <rect
                    x={830}
                    y={380}
                    width={260 * crossSectionReveal}
                    height={310}
                    rx={12}
                    fill="#090D16"
                    fillOpacity={0.82}
                    stroke="#38BDF8"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                  />
                  {/* Top Rim Ellipse */}
                  <ellipse
                    cx={960}
                    cy={350}
                    rx={175}
                    ry={78}
                    fill="rgba(15, 23, 42, 0.72)"
                    stroke={layer.strokeColor}
                    strokeWidth={3}
                  />
                  {/* Ambient Outside Air Vectors Bouncing Off Outer Shell */}
                  <path
                    d="M 620 470 L 765 495 L 640 545"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    strokeDasharray="10 8"
                    strokeDashoffset={dashOffset}
                  />
                </g>
              )}

              {/* Layer 1: High-Vacuum Annulus Chamber (< 10^-3 Pa) */}
              {index === 1 && (
                <g transform={`translate(${offsetX}, ${offsetY - offsetZ})`}>
                  <ellipse
                    cx={960}
                    cy={700}
                    rx={148}
                    ry={64}
                    fill="rgba(6, 182, 212, 0.1)"
                    stroke="#22D3EE"
                    strokeWidth={2.2}
                    strokeDasharray="6 6"
                  />
                  <path
                    d="M 812 365 L 812 700 A 148 64 0 0 0 1108 700 L 1108 365"
                    fill="rgba(8, 145, 178, 0.12)"
                    stroke="#22D3EE"
                    strokeWidth={2.2}
                    strokeDasharray="8 6"
                    strokeDashoffset={reverseDashOffset}
                  />
                  <ellipse
                    cx={960}
                    cy={365}
                    rx={148}
                    ry={64}
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                  />
                  {/* Zero-Molecule Vacuum Zone Label Inside Cutaway */}
                  <text
                    x={960}
                    y={690}
                    textAnchor="middle"
                    fill="#22D3EE"
                    fontSize={13}
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    VACUUM ANNULUS (P &lt; 0.001 Pa)
                  </text>
                </g>
              )}

              {/* Layer 2: Electrolytic Copper Infrared Radiation Shield */}
              {index === 2 && (
                <g transform={`translate(${offsetX}, ${offsetY - offsetZ})`}>
                  <path
                    d="M 832 380 L 832 678 A 128 54 0 0 0 1088 678 L 1088 380"
                    fill="url(#copperShieldGrad)"
                    stroke="#F59E0B"
                    strokeWidth={2.8}
                  />
                  <ellipse
                    cx={960}
                    cy={380}
                    rx={128}
                    ry={54}
                    fill="rgba(217, 119, 6, 0.22)"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                  />
                  {/* Infrared Photon Reflection Vectors (Bouncing back inward) */}
                  <path
                    d="M 920 490 L 842 520 L 925 550"
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth={3}
                    strokeDasharray="8 6"
                    strokeDashoffset={dashOffset}
                    filter="url(#isoGlow)"
                  />
                  <path
                    d="M 1000 490 L 1078 520 L 995 550"
                    fill="none"
                    stroke="#FBBF24"
                    strokeWidth={3}
                    strokeDasharray="8 6"
                    strokeDashoffset={dashOffset}
                    filter="url(#isoGlow)"
                  />
                </g>
              )}

              {/* Layer 3: Inner Thermal Core Vessel & Dynamic Fluid / Energy Flow */}
              {index === 3 && (
                <g transform={`translate(${offsetX}, ${offsetY - offsetZ})`}>
                  <path
                    d="M 852 395 L 852 658 A 108 45 0 0 0 1068 658 L 1068 395"
                    fill="url(#thermalCoreGrad)"
                    stroke="#10B981"
                    strokeWidth={2.8}
                  />
                  <ellipse
                    cx={960}
                    cy={395}
                    rx={108}
                    ry={45}
                    fill="rgba(244, 63, 94, 0.65)"
                    stroke="#34D399"
                    strokeWidth={2.5}
                  />

                  {/* Dynamic Glowing Internal Convection Loop Vectors using stroke-dashoffset */}
                  <path
                    d="M 915 625 C 885 555, 885 465, 930 420 C 955 465, 955 555, 915 625"
                    fill="none"
                    stroke="#FEF08A"
                    strokeWidth={3.2}
                    strokeDasharray="12 10"
                    strokeDashoffset={dashOffset}
                    filter="url(#isoGlow)"
                  />
                  <path
                    d="M 1005 625 C 1035 555, 1035 465, 990 420 C 965 465, 965 555, 1005 625"
                    fill="none"
                    stroke="#FEF08A"
                    strokeWidth={3.2}
                    strokeDasharray="12 10"
                    strokeDashoffset={reverseDashOffset}
                    filter="url(#isoGlow)"
                  />
                </g>
              )}

              {/* Layer 4: Upper Seal Cap Assembly & Micro Heat-Bridge Vectors */}
              {index >= 4 && (
                <g transform={`translate(${offsetX}, ${offsetY - offsetZ - 35 * explodeProgress})`}>
                  <path
                    d="M 815 265 L 815 325 A 145 58 0 0 0 1105 325 L 1105 265"
                    fill="rgba(30, 41, 59, 0.92)"
                    stroke="#F43F5E"
                    strokeWidth={2.8}
                  />
                  <ellipse
                    cx={960}
                    cy={265}
                    rx={145}
                    ry={58}
                    fill="#1E293B"
                    stroke="#F43F5E"
                    strokeWidth={2.8}
                  />
                  {/* Silicone O-Ring Gasket Highlight */}
                  <ellipse
                    cx={960}
                    cy={325}
                    rx={136}
                    ry={52}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth={4}
                    strokeDasharray="14 8"
                    strokeDashoffset={dashOffset}
                  />
                </g>
              )}

              {/* Component Anchor Beacon on the Isometric Object */}
              <g>
                <circle
                  cx={layer.anchorScreenCoord.x}
                  cy={layer.anchorScreenCoord.y}
                  r={11 * ambientPulse}
                  fill="none"
                  stroke={layer.strokeColor}
                  strokeWidth={1.8}
                  opacity={0.75}
                />
                <circle
                  cx={layer.anchorScreenCoord.x}
                  cy={layer.anchorScreenCoord.y}
                  r={4.5}
                  fill={layer.strokeColor}
                />
              </g>

              {/* Exploded-view alignment guide line when exploded */}
              {explodeProgress > 0.2 && (
                <line
                  x1={960}
                  y1={540}
                  x2={center.x}
                  y2={center.y}
                  stroke={layer.strokeColor}
                  strokeWidth={1.2}
                  strokeDasharray="4 6"
                  opacity={0.5}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Bottom Engineering Formula & Karaoke Subtitle Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 34,
          left: 64,
          right: 64,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          pointerEvents: "none",
        }}
      >
        {/* Left: Core Governing Physics Equation Box */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(56, 189, 248, 0.35)",
            borderRadius: 10,
            padding: "12px 18px",
            backdropFilter: "blur(12px)",
            minWidth: 340,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: "#38BDF8",
              letterSpacing: "0.14em",
              marginBottom: 4,
            }}
          >
            GOVERNING EQUATION // MODEL MATRIKS
          </div>
          <div
            style={{
              fontSize: 16,
              fontFamily: "monospace",
              fontWeight: 700,
              color: "#F8FAFC",
            }}
          >
            {coreEquationOrLaw}
          </div>
        </div>

        {/* Center/Right: Synchronized Indonesian Narration Subtitles + Word Highlight */}
        {activePhase && (
          <div
            style={{
              maxWidth: 980,
              background: "rgba(9, 13, 22, 0.88)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderLeft: "4px solid #38BDF8",
              borderRadius: 12,
              padding: "14px 24px",
              backdropFilter: "blur(16px)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontFamily: "monospace",
                color: "#22D3EE",
                letterSpacing: "0.1em",
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              [{activePhase.phaseType}] {activePhase.onScreenHeadline}
            </div>
            <div
              style={{
                fontSize: 21,
                lineHeight: 1.45,
                color: "#E2E8F0",
                fontWeight: 500,
                display: "flex",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              {activePhase.wordTimings && activePhase.wordTimings.length > 0
                ? activePhase.wordTimings.map((wt, idx) => {
                    const isSpoken = frame >= wt.startFrame && frame <= wt.endFrame;
                    const isPast = frame > wt.endFrame;
                    return (
                      <span
                        key={`${wt.word}_${idx}`}
                        style={{
                          color: isSpoken ? "#38BDF8" : isPast ? "#F8FAFC" : "#94A3B8",
                          fontWeight: isSpoken ? 700 : 500,
                          textShadow: isSpoken ? "0 0 14px rgba(56, 189, 248, 0.55)" : "none",
                        }}
                      >
                        {wt.word}
                      </span>
                    );
                  })
                : activePhase.narrationText}
            </div>
          </div>
        )}
      </div>

      {/* Phase Progress Indicator Bar at very bottom edge */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 5,
          backgroundColor: "rgba(30, 41, 59, 0.8)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, (phaseLocalFrame / phaseDuration) * 100)}%`,
            background: "linear-gradient(90deg, #0EA5E9, #22D3EE, #10B981)",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
