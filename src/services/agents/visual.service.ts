import {
  RemotionCompositionPropsSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
  type TtsSynchronizerOutput,
  type RemotionCompositionProps,
  type IsometricVectorLayer,
  type FrameCalloutTrigger,
  type PhaseTimelineBlock,
} from "@/schemas/video-blueprint";

const PRIMITIVE_TYPES: IsometricVectorLayer["svgPrimitiveType"][] = [
  "OUTER_SHELL_CYLINDER",
  "VACUUM_ANNULUS_CHAMBER",
  "COPPER_THERMAL_LINING",
  "INNER_CORE_CHAMBER",
  "SEAL_CAP_ASSEMBLY",
];

const LAYER_PALETTE = [
  { stroke: "#38BDF8", fill: "rgba(14, 116, 144, 0.24)", glow: "#0EA5E9" },
  { stroke: "#22D3EE", fill: "rgba(6, 182, 212, 0.16)", glow: "#22D3EE" },
  { stroke: "#F59E0B", fill: "rgba(217, 119, 6, 0.26)", glow: "#F59E0B" },
  { stroke: "#10B981", fill: "rgba(5, 150, 105, 0.24)", glow: "#10B981" },
  { stroke: "#F43F5E", fill: "rgba(225, 29, 72, 0.26)", glow: "#F43F5E" },
];

/**
 * Computes a 45-degree angled SVG leader line elbow and glassmorphism card coordinates
 */
function computeCalloutGeometry(
  anchor: { x: number; y: number },
  cardPosition: "TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT"
): {
  elbowPoint: { x: number; y: number };
  cardCoord: { x: number; y: number };
} {
  const diagOffset = 75;
  const horizRun = 95;

  switch (cardPosition) {
    case "TOP_LEFT": {
      const elbow = { x: anchor.x - diagOffset, y: anchor.y - diagOffset };
      const card = { x: Math.max(80, elbow.x - horizRun - 310), y: Math.max(150, elbow.y - 44) };
      return { elbowPoint: elbow, cardCoord: card };
    }
    case "TOP_RIGHT": {
      const elbow = { x: anchor.x + diagOffset, y: anchor.y - diagOffset };
      const card = { x: Math.min(1480, elbow.x + horizRun), y: Math.max(150, elbow.y - 44) };
      return { elbowPoint: elbow, cardCoord: card };
    }
    case "BOTTOM_LEFT": {
      const elbow = { x: anchor.x - diagOffset, y: anchor.y + diagOffset };
      const card = { x: Math.max(80, elbow.x - horizRun - 310), y: Math.min(860, elbow.y - 36) };
      return { elbowPoint: elbow, cardCoord: card };
    }
    case "BOTTOM_RIGHT":
    default: {
      const elbow = { x: anchor.x + diagOffset, y: anchor.y + diagOffset };
      const card = { x: Math.min(1480, elbow.x + horizRun), y: Math.min(860, elbow.y - 36) };
      return { elbowPoint: elbow, cardCoord: card };
    }
  }
}

export async function runVisualChoreographerAgent(params: {
  jobId: string;
  aspectRatioMode?: "LANDSCAPE_16_9" | "SHORTS_9_16";
  blueprint: DeconstructionBlueprint;
  script: ScriptArchitectOutput;
  tts: TtsSynchronizerOutput;
}): Promise<RemotionCompositionProps> {
  const { jobId, aspectRatioMode = "LANDSCAPE_16_9", blueprint, script, tts } = params;

  const isShorts = aspectRatioMode === "SHORTS_9_16";
  const width = isShorts ? 1080 : 1920;
  const height = isShorts ? 1920 : 1080;

  // Build Isometric 3D Vector Layers mapped to Blueprint Components
  const isometricLayers: IsometricVectorLayer[] = blueprint.components.map((comp, idx) => {
    const palette = LAYER_PALETTE[idx % LAYER_PALETTE.length];
    const primitive = PRIMITIVE_TYPES[idx % PRIMITIVE_TYPES.length];

    // Calculate exploded-view offsets along isometric axes
    const explodeOffsets = [
      { x: -120, y: 70, z: -65 },
      { x: -55, y: 30, z: -25 },
      { x: 35, y: -25, z: 25 },
      { x: 95, y: -55, z: 65 },
      { x: 0, y: -135, z: 125 },
    ][idx % 5];

    return {
      id: `iso_layer_${idx}`,
      componentId: comp.id,
      name: comp.name,
      zIndex: idx + 1,
      baseElevationZ: idx * 14,
      explodeOffsetZ: explodeOffsets.z,
      explodeOffsetX: explodeOffsets.x,
      explodeOffsetY: explodeOffsets.y,
      strokeColor: palette.stroke,
      fillColor: palette.fill,
      glowColor: palette.glow,
      svgPrimitiveType: primitive,
      energyFlowPathD:
        idx % 2 === 0
          ? "M 960 680 C 910 580, 910 460, 960 360"
          : "M 1020 660 C 1070 560, 1070 450, 1020 350",
      anchorScreenCoord: comp.defaultAnchor,
    };
  });

  // Camera Choreography Keyframes per Phase (Hook -> Core -> Exploded Breakdown -> Telemetry Zoom -> Summary)
  const cameraPresets = [
    { zoom: 1.02, panX: 0, panY: 15, rotateXDeg: 60, rotateZDeg: -45, explodeFactor: 0.0, crossSectionRatio: 0.15 },
    { zoom: 1.16, panX: -25, panY: 5, rotateXDeg: 58, rotateZDeg: -42, explodeFactor: 0.25, crossSectionRatio: 0.85 },
    { zoom: 1.08, panX: 10, panY: 20, rotateXDeg: 60, rotateZDeg: -48, explodeFactor: 1.0, crossSectionRatio: 1.0 },
    { zoom: 1.22, panX: 0, panY: 55, rotateXDeg: 56, rotateZDeg: -40, explodeFactor: 0.45, crossSectionRatio: 0.9 },
    { zoom: 1.0, panX: 0, panY: 10, rotateXDeg: 60, rotateZDeg: -45, explodeFactor: 0.0, crossSectionRatio: 0.5 },
  ];

  const phases: PhaseTimelineBlock[] = [];
  const callouts: FrameCalloutTrigger[] = [];

  for (let i = 0; i < 5; i++) {
    const scriptSeg = script.segments[i];
    const ttsSeg = tts.segments[i];
    const bpPhase = blueprint.phases[i];
    const camPreset = cameraPresets[i] ?? cameraPresets[0];

    phases.push({
      segmentIndex: i,
      phaseType: scriptSeg.phaseType,
      phaseTitle: scriptSeg.phaseTitle,
      onScreenHeadline: scriptSeg.onScreenHeadline,
      narrationText: scriptSeg.narrationText,
      audioUrl: ttsSeg.audioUrl,
      startFrame: ttsSeg.startFrame,
      endFrame: ttsSeg.endFrame,
      durationInFrames: ttsSeg.durationInFrames,
      wordTimings: ttsSeg.wordTimings,
      camera: {
        startFrame: ttsSeg.startFrame,
        endFrame: ttsSeg.endFrame,
        ...camPreset,
      },
      telemetrySnapshot: scriptSeg.telemetrySnapshot,
      activeComponentIds: bpPhase?.focusComponentIds ?? isometricLayers.map((l) => l.componentId),
    });

    // Map Pop-Up Callout triggers to exact frame numbers synced with Ethan 1.1x voiceover
    for (const draftCallout of scriptSeg.callouts) {
      const matchedLayer = isometricLayers.find((l) => l.componentId === draftCallout.componentId);
      const anchor = matchedLayer?.anchorScreenCoord ?? draftCallout.anchor;

      const triggerOffsetFrames = Math.floor(ttsSeg.durationInFrames * draftCallout.relativeTriggerRatio);
      const startFrame = ttsSeg.startFrame + triggerOffsetFrames;
      const calloutDurationFrames = Math.min(
        Math.round(draftCallout.durationSeconds * tts.fps),
        ttsSeg.endFrame - startFrame - 6
      );
      const endFrame = Math.max(startFrame + 90, startFrame + calloutDurationFrames);

      const { elbowPoint, cardCoord } = computeCalloutGeometry(anchor, draftCallout.cardPosition);

      callouts.push({
        id: draftCallout.id,
        componentId: draftCallout.componentId,
        startFrame,
        endFrame,
        label: draftCallout.label,
        value: draftCallout.value,
        formulaOrFact: draftCallout.formulaOrFact,
        subtext: draftCallout.subtext,
        accentColor: draftCallout.accentColor,
        anchor,
        elbowPoint,
        cardCoord,
        cardPosition: draftCallout.cardPosition,
      });
    }
  }

  const compositionProps: RemotionCompositionProps = {
    jobId,
    topic: blueprint.topic,
    normalizedTitle: blueprint.normalizedTitle,
    engineeringCategory: blueprint.engineeringCategory,
    coreEquationOrLaw: blueprint.coreEquationOrLaw,
    primaryArchetype: blueprint.primaryArchetype,
    width,
    height,
    fps: tts.fps,
    durationInFrames: tts.totalDurationInFrames,
    aspectRatioMode,
    telemetryChannels: script.telemetryChannels,
    isometricLayers,
    phases,
    callouts,
  };

  return RemotionCompositionPropsSchema.parse(compositionProps);
}
