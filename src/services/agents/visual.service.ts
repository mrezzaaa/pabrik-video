import {
  RemotionCompositionPropsSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
  type TtsSynchronizerOutput,
  type RemotionCompositionProps,
  type CutawayVectorLayer,
  type FramePillCallout,
  type FrameSfxOverlay,
  type PhaseTimelineBlock,
} from "@/schemas/video-blueprint";

const PART_TYPES: CutawayVectorLayer["partType"][] = [
  "POT_BODY_CUTAWAY",
  "BOILING_WATER_FLUID",
  "CORE_SUBJECT_ITEM",
  "PRESSURE_WEIGHT_VALVE",
  "LID_SAFETY_LOCK",
];

const WARM_FILL_PALETTE = [
  "#E2E8F0", // Silver pot/body
  "#93C5FD", // Water blue
  "#F87171", // Coral red
  "#FACC15", // Warm yellow
  "#86EFAC", // Soft green
];

export async function runVisualChoreographerAgent(params: {
  jobId: string;
  aspectRatioMode?: "SHORTS_9_16" | "LANDSCAPE_16_9";
  blueprint: DeconstructionBlueprint;
  script: ScriptArchitectOutput;
  tts: TtsSynchronizerOutput;
}): Promise<RemotionCompositionProps> {
  const {
    jobId,
    aspectRatioMode = "SHORTS_9_16",
    blueprint,
    script,
    tts,
  } = params;

  const isLandscape = aspectRatioMode === "LANDSCAPE_16_9";
  const width = isLandscape ? 1920 : 1080;
  const height = isLandscape ? 1080 : 1920;

  // Build 2.5D Cel-Shaded Isometric Cutaway Layers with dark outlines (#1E293B, 2.5px)
  const cutawayLayers: CutawayVectorLayer[] = blueprint.components.map(
    (comp, idx) => ({
      id: `cutaway_layer_${idx}`,
      componentId: comp.id,
      name: comp.name,
      everydayRole: comp.everydayRole,
      zIndex: idx + 1,
      outlineColor: "#1E293B",
      strokeWidth: 2.5,
      fillColor: comp.fillColor || WARM_FILL_PALETTE[idx % WARM_FILL_PALETTE.length],
      partType: PART_TYPES[idx % PART_TYPES.length],
      anchorScreenCoord: comp.defaultAnchor,
    })
  );

  // Camera Choreography per Act (Full Cutaway -> Core Cutaway Zoom -> Valve/Lock Zoom-In -> Full Summary)
  const cameraPresets = [
    {
      x: 0,
      y: 0,
      scale: 1.0,
      cutawayOpenRatio: 0.65,
      steamIntensity: 0.4,
      bubbleIntensity: 0.5,
    },
    {
      x: 0,
      y: -45,
      scale: 1.22,
      cutawayOpenRatio: 1.0,
      steamIntensity: 1.1,
      bubbleIntensity: 1.2,
    },
    {
      x: -20,
      y: 230,
      scale: 1.82,
      cutawayOpenRatio: 1.0,
      steamIntensity: 1.35,
      bubbleIntensity: 0.9,
    },
    {
      x: 0,
      y: 20,
      scale: 1.04,
      cutawayOpenRatio: 1.0,
      steamIntensity: 0.6,
      bubbleIntensity: 0.6,
    },
  ];

  const phases: PhaseTimelineBlock[] = [];
  const pillCallouts: FramePillCallout[] = [];
  const sfxOverlays: FrameSfxOverlay[] = [];

  for (let i = 0; i < 4; i++) {
    const scriptSeg = script.segments[i];
    const ttsSeg = tts.segments[i];
    const bpPhase = blueprint.phases[i];
    const camPreset = cameraPresets[i] ?? cameraPresets[0];

    phases.push({
      segmentIndex: i,
      phaseType: scriptSeg.phaseType,
      chapterTitle: scriptSeg.chapterTitle,
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
      primaryMetric: scriptSeg.primaryMetric,
      statusBadge: scriptSeg.statusBadge,
      secondaryMetric: scriptSeg.secondaryMetric,
      activeComponentIds:
        bpPhase?.focusComponentIds ?? cutawayLayers.map((l) => l.componentId),
      showChecklistCard: scriptSeg.showChecklistCard ?? i === 3,
    });

    // Dark Pill Component Pointers
    for (const pill of scriptSeg.pillLabels) {
      const triggerOffset = Math.floor(
        ttsSeg.durationInFrames * (pill.relativeTriggerRatio ?? 0.15)
      );
      const startFrame = ttsSeg.startFrame + triggerOffset;
      const pillDurationFrames = Math.min(
        Math.round((pill.durationSeconds ?? 4.2) * tts.fps),
        ttsSeg.endFrame - startFrame - 4
      );
      const endFrame = Math.max(startFrame + 75, startFrame + pillDurationFrames);

      pillCallouts.push({
        id: pill.id,
        componentId: pill.componentId,
        startFrame,
        endFrame,
        text: pill.text,
        direction: pill.direction,
        anchor: pill.anchor,
      });
    }

    // Comic SFX Floating Text ("PSSST!", "TERKUNCI", "BERJAM-JAM")
    if (scriptSeg.sfxCue) {
      const sfxStartFrame =
        ttsSeg.startFrame +
        Math.floor(
          ttsSeg.durationInFrames * (scriptSeg.sfxCue.relativeTriggerRatio ?? 0.3)
        );
      const sfxEndFrame = Math.min(ttsSeg.endFrame - 6, sfxStartFrame + 135);

      sfxOverlays.push({
        id: `sfx_overlay_${i}`,
        startFrame: sfxStartFrame,
        endFrame: Math.max(sfxStartFrame + 60, sfxEndFrame),
        text: scriptSeg.sfxCue.text,
        variant: scriptSeg.sfxCue.variant,
        x: scriptSeg.sfxCue.x,
        y: scriptSeg.sfxCue.y,
        rotateDeg: scriptSeg.sfxCue.rotateDeg,
      });
    }
  }

  const compositionProps: RemotionCompositionProps = {
    jobId,
    topic: blueprint.topic,
    laymanHookTitle: blueprint.laymanHookTitle,
    everydayCategory: blueprint.everydayCategory,
    coreSimpleTruth: blueprint.coreSimpleTruth,
    primaryArchetype: blueprint.primaryArchetype,
    width,
    height,
    fps: tts.fps,
    durationInFrames: tts.totalDurationInFrames,
    aspectRatioMode,
    practicalChecklist: script.practicalChecklist,
    cutawayLayers,
    phases,
    pillCallouts,
    sfxOverlays,
    sfxTriggers: tts.sfxTriggers ?? [],
  };

  return RemotionCompositionPropsSchema.parse(compositionProps);
}
