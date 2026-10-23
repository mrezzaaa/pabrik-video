import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  CutawayVectorLayer,
  PhaseTimelineBlock,
  VisualArchetype,
} from "@/schemas/video-blueprint";

interface IsometricStageProps {
  layers: CutawayVectorLayer[];
  phases: PhaseTimelineBlock[];
  primaryArchetype: VisualArchetype;
}

export const IsometricStage: React.FC<IsometricStageProps> = ({
  phases,
  primaryArchetype,
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

  // Smooth spring camera zoom & pan (damping: 18, stiffness: 120 as specified)
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

  const isPressurized =
    activePhase?.statusBadge.variant === "red" ||
    activePhase?.primaryMetric.isHighActive;
  const isSoftBones = (activePhase?.segmentIndex ?? 0) >= 1;

  // Physics micro-animations: rising bubbles, steam wisps, jiggling weight valve
  const bubbleRise1 = (frame * 3.4) % 180;
  const bubbleRise2 = ((frame + 45) * 3.8) % 180;
  const bubbleRise3 = ((frame + 95) * 3.1) % 180;

  const valveJiggleDeg = isPressurized ? Math.sin(frame * 0.65) * 6 : 0;
  const valveLiftY = isPressurized
    ? interpolate(Math.sin(frame * 0.45), [-1, 1], [-8, 0])
    : 0;
  const safetyPinLiftY = isPressurized ? -16 : 0;

  const steamDashOffset = -(frame * 4.2);
  const isTumbler = primaryArchetype === "THERMAL_TUMBLER";

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
          top: 1380,
          width: 680,
          height: 150,
          marginLeft: -340,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.14) 0%, rgba(15, 23, 42, 0.0) 72%)",
          transform: `translate(${camX * 0.5}px, ${camY * 0.5}px) scale(${camScale})`,
        }}
      />

      {/* Main Cel-Shaded Isometric 90-Degree Cutaway SVG Viewport */}
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
        {isTumbler ? (
          /* =================================================================
             ARCHETYPE B: CEL-SHADED ISOMETRIC TUMBLER 90° CUTAWAY
             ================================================================= */
          <g>
            {/* Outer Stainless Body (#E2E8F0 with #1E293B 2.5px outline) */}
            <ellipse
              cx={540}
              cy={1380}
              rx={195}
              ry={72}
              fill="#CBD5E1"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            <path
              d="M 345 720 L 345 1380 A 195 72 0 0 0 735 1380 L 735 720 Z"
              fill="#E2E8F0"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* 90-Degree Cutaway Window Revealing Vacuum Gap & Copper Lining */}
            <rect
              x={385}
              y={770}
              width={310}
              height={560}
              rx={18}
              fill="#1E293B"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Warm Yellow Vacuum / Copper Shield Layer (#FACC15) */}
            <rect
              x={408}
              y={792}
              width={264}
              height={515}
              rx={14}
              fill="#FACC15"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Inner Beverage Chamber (#93C5FD / #F87171 hot liquid) */}
            <rect
              x={430}
              y={815}
              width={220}
              height={470}
              rx={10}
              fill="#F87171"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            <ellipse
              cx={540}
              cy={845}
              rx={110}
              ry={34}
              fill="#FCA5A5"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Heat Reflection Arrows Bouncing Back Inside */}
            <path
              d="M 480 980 L 436 1015 L 485 1050"
              fill="none"
              stroke="#FEF08A"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 600 980 L 644 1015 L 595 1050"
              fill="none"
              stroke="#FEF08A"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Top Lid & Silicone O-Ring Seal */}
            <path
              d="M 355 645 L 355 720 A 185 64 0 0 0 725 720 L 725 645 Z"
              fill="#334155"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            <ellipse
              cx={540}
              cy={645}
              rx={185}
              ry={64}
              fill="#475569"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            {/* Silicone Seal Band (#86EFAC) */}
            <rect
              x={365}
              y={704}
              width={350}
              height={22}
              rx={10}
              fill="#86EFAC"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
          </g>
        ) : (
          /* =================================================================
             ARCHETYPE A: CEL-SHADED ISOMETRIC PRESTO 90° CUTAWAY (REFERENCE)
             ================================================================= */
          <g>
            {/* Left & Right Bakelite Side Handles */}
            <path
              d="M 250 960 L 165 960 C 145 960, 145 1015, 165 1015 L 250 1015 Z"
              fill="#334155"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            <path
              d="M 830 960 L 915 960 C 935 960, 935 1015, 915 1015 L 830 1015 Z"
              fill="#334155"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Pot Bottom Base Shadow & Lower Rim */}
            <ellipse
              cx={540}
              cy={1340}
              rx={285}
              ry={105}
              fill="#CBD5E1"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Outer Aluminum Pot Cylinder (#E2E8F0 with #1E293B 2.5px outline) */}
            <path
              d="M 255 830 L 255 1340 A 285 105 0 0 0 825 1340 L 825 830 Z"
              fill="#E2E8F0"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* 90-Degree Cross-Section Cutaway Interior Cavity */}
            <path
              d="M 290 850 L 290 1315 A 250 88 0 0 0 790 1315 L 790 850 Z"
              fill="#F1F5F9"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Cutaway Wall Thickness Faces (Left & Right Cross-Section Edges) */}
            <rect
              x={255}
              y={830}
              width={35}
              height={485}
              fill="#94A3B8"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            <rect
              x={790}
              y={830}
              width={35}
              height={485}
              fill="#94A3B8"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Trapped Pressurized Steam Zone (Top Half of Pot Interior) */}
            <path
              d="M 290 850 L 290 1055 L 790 1055 L 790 850 Z"
              fill={
                isPressurized
                  ? "rgba(250, 204, 21, 0.28)"
                  : "rgba(226, 232, 240, 0.4)"
              }
            />

            {/* Boiling Water Layer (#93C5FD water blue) */}
            <path
              d="M 290 1045 L 290 1315 A 250 88 0 0 0 790 1315 L 790 1045 Z"
              fill="#93C5FD"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            {/* Isometric Water Surface Ellipse */}
            <ellipse
              cx={540}
              cy={1045}
              rx={250}
              ry={72}
              fill="#BFDBFE"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Bandeng Fish Cross-Section & Spine Bones Inside Boiling Water */}
            <g transform="translate(540, 1185)">
              {/* Fish Body Silhouette */}
              <path
                d="M -175 0 C -120 -68, 85 -68, 165 0 C 85 68, -120 68, -175 0 Z"
                fill={isSoftBones ? "#86EFAC" : "#F87171"}
                stroke="#1E293B"
                strokeWidth={2.5}
              />
              {/* Fish Tail */}
              <path
                d="M 155 0 L 210 -42 L 198 0 L 210 42 Z"
                fill={isSoftBones ? "#86EFAC" : "#F87171"}
                stroke="#1E293B"
                strokeWidth={2.5}
              />
              {/* Fish Skeleton / Rib Bones (Duri Bandeng) */}
              <line
                x1={-115}
                y1={0}
                x2={125}
                y2={0}
                stroke="#1E293B"
                strokeWidth={3.5}
              />
              {[-85, -45, -5, 35, 75, 105].map((ribX, idx) => (
                <g key={idx}>
                  <line
                    x1={ribX}
                    y1={-34}
                    x2={ribX - 12}
                    y2={34}
                    stroke="#1E293B"
                    strokeWidth={2.5}
                    strokeDasharray={isSoftBones ? "5 4" : undefined}
                  />
                </g>
              ))}
              {/* Fish Eye */}
              <circle
                cx={-120}
                cy={-10}
                r={10}
                fill="#FFFFFF"
                stroke="#1E293B"
                strokeWidth={2.5}
              />
              <circle cx={-120} cy={-10} r={4.5} fill="#1E293B" />
            </g>

            {/* Rising Boiling Water Bubbles */}
            {[
              { cx: 380, base: 1260, offset: bubbleRise1, r: 12 },
              { cx: 465, base: 1280, offset: bubbleRise2, r: 16 },
              { cx: 615, base: 1270, offset: bubbleRise3, r: 14 },
              { cx: 705, base: 1250, offset: bubbleRise1 * 0.9, r: 11 },
              { cx: 535, base: 1290, offset: bubbleRise2 * 0.85, r: 15 },
            ].map((b, i) => (
              <circle
                key={i}
                cx={b.cx + Math.sin((frame + i * 20) * 0.12) * 8}
                cy={b.base - b.offset}
                r={b.r}
                fill="#FFFFFF"
                fillOpacity={0.85}
                stroke="#1E293B"
                strokeWidth={2}
              />
            ))}

            {/* Circulating Trapped Steam Arrows Inside Top Cavity */}
            <path
              d="M 410 995 C 390 925, 435 885, 495 910"
              fill="none"
              stroke={isPressurized ? "#EF4444" : "#64748B"}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray="10 8"
              strokeDashoffset={steamDashOffset}
            />
            <path
              d="M 670 995 C 690 925, 645 885, 585 910"
              fill="none"
              stroke={isPressurized ? "#EF4444" : "#64748B"}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray="10 8"
              strokeDashoffset={steamDashOffset}
            />

            {/* Isometric Sealed Lid Assembly */}
            <path
              d="M 245 775 L 245 835 A 295 96 0 0 0 835 835 L 835 775 Z"
              fill="#CBD5E1"
              stroke="#1E293B"
              strokeWidth={2.5}
            />
            <ellipse
              cx={540}
              cy={775}
              rx={295}
              ry={96}
              fill="#E2E8F0"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* Red Silicone Sealing Gasket Ring Inside Lid Rim */}
            <rect
              x={255}
              y={822}
              width={570}
              height={16}
              rx={8}
              fill="#F87171"
              stroke="#1E293B"
              strokeWidth={2.5}
            />

            {/* COMPONENT 1: Center Pressure Regulator Weight ("Pemberat" - #FACC15) */}
            <g
              transform={`translate(540, ${735 + valveLiftY}) rotate(${valveJiggleDeg})`}
            >
              {/* Valve Stem */}
              <rect
                x={-14}
                y={0}
                width={28}
                height={42}
                fill="#94A3B8"
                stroke="#1E293B"
                strokeWidth={2.5}
              />
              {/* Heavy Regulator Weight Cylinder */}
              <rect
                x={-44}
                y={-68}
                width={88}
                height={72}
                rx={16}
                fill="#FACC15"
                stroke="#1E293B"
                strokeWidth={2.5}
              />
              <ellipse
                cx={0}
                cy={-68}
                rx={44}
                ry={16}
                fill="#FDE047"
                stroke="#1E293B"
                strokeWidth={2.5}
              />
              {/* Steam Jets Shooting Out When Pressurized */}
              {isPressurized && (
                <g>
                  <path
                    d="M -48 -45 C -95 -75, -135 -115, -165 -165"
                    fill="none"
                    stroke="#93C5FD"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray="12 10"
                    strokeDashoffset={steamDashOffset}
                  />
                  <path
                    d="M 48 -45 C 95 -75, 135 -115, 165 -165"
                    fill="none"
                    stroke="#93C5FD"
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeDasharray="12 10"
                    strokeDashoffset={steamDashOffset}
                  />
                </g>
              )}
            </g>

            {/* COMPONENT 2: Red Safety Valve ("Katup Pengaman" - #F87171) */}
            <g transform={`translate(390, ${755 + safetyPinLiftY * 0.5})`}>
              <rect
                x={-22}
                y={-32}
                width={44}
                height={38}
                rx={8}
                fill="#F87171"
                stroke="#1E293B"
                strokeWidth={2.5}
              />
              <circle
                cx={0}
                cy={-38}
                r={12}
                fill="#EF4444"
                stroke="#1E293B"
                strokeWidth={2.5}
              />
            </g>

            {/* COMPONENT 3: Lid Safety Lock Pin ("Pengunci Tutup" - #86EFAC) */}
            <g transform={`translate(715, ${765 + safetyPinLiftY})`}>
              <rect
                x={-26}
                y={-36}
                width={52}
                height={44}
                rx={10}
                fill="#86EFAC"
                stroke="#1E293B"
                strokeWidth={2.5}
              />
              <rect
                x={-10}
                y={-54}
                width={20}
                height={22}
                rx={4}
                fill="#16A34A"
                stroke="#1E293B"
                strokeWidth={2.5}
              />
            </g>

            {/* Bottom Stove Flame Under the Pot */}
            <g transform="translate(540, 1455)">
              {[-140, -70, 0, 70, 140].map((fx, idx) => (
                <path
                  key={idx}
                  d={`M ${fx - 22} 20 C ${fx - 10} -28, ${fx + 10} -28, ${fx + 22} 20 Z`}
                  fill={idx % 2 === 0 ? "#FACC15" : "#F87171"}
                  stroke="#1E293B"
                  strokeWidth={2.5}
                />
              ))}
            </g>
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
