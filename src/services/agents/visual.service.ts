import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  ParametricSceneGraphSchema,
  RemotionCompositionPropsSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
  type TtsSynchronizerOutput,
  type RemotionCompositionProps,
  type FramePillCallout,
  type FrameSfxOverlay,
  type PhaseTimelineBlock,
  type ParametricSceneGraph,
} from "@/schemas/video-blueprint";
import { PARAMETRIC_VISUAL_SYSTEM_PROMPT } from "./prompts";

const SCENE_GRAPH_TEMPLATE = `{
  "containerType": "dual-chamber",
  "containerTitle": "<Short uppercase diagram header>",
  "containerSubtitle": "<Short subtitle, e.g., ARSITEKTUR BELAHAN MELINTANG>",
  "outerBounds": {
    "x": 220,
    "y": 620,
    "width": 640,
    "height": 760,
    "wallThickness": 24,
    "outerFill": "#E2E8F0",
    "interiorFill": "#F8FAFC"
  },
  "internalLayers": [
    {
      "id": "layer_1",
      "componentId": "comp_1",
      "name": "<Part Name>",
      "everydayRole": "<Short role label>",
      "zIndex": 1,
      "fillColor": "#93C5FD",
      "outlineColor": "#1E293B",
      "strokeWidth": 2.5,
      "bounds": { "x": 260, "y": 680, "width": 250, "height": 420, "rx": 16 },
      "anchorScreenCoord": { "x": 385, "y": 890 },
      "customSvgElements": [
        {
          "id": "el_1",
          "shape": "rect",
          "x": 280,
          "y": 710,
          "width": 210,
          "height": 60,
          "rx": 8,
          "fill": "#FACC15",
          "stroke": "#1E293B",
          "strokeWidth": 2.5,
          "label": "TERMINAL"
        }
      ]
    }
  ],
  "customSvgElements": [],
  "particleFlows": [
    {
      "id": "flow_1",
      "type": "ions",
      "color": "#38BDF8",
      "from": { "x": 380, "y": 890 },
      "to": { "x": 700, "y": 890 },
      "count": 12,
      "speed": 1.6,
      "size": 11,
      "activeInPhases": [0, 1, 2, 3]
    }
  ]
}`;

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

  // Ask Agent 4 via Omniroute to generate the topic-specific Parametric Cutaway Scene Graph
  const userPrompt = `Generate a topic-specific Parametric Cutaway & SVG Scene Graph ("ParametricSceneGraphSchema") for:
TOPIC: "${blueprint.topic}"
CONTAINER TYPE: "${blueprint.containerType}"

COMPONENTS TO MAP (use these exact componentId values in internalLayers):
${JSON.stringify(blueprint.components, null, 2)}

SCRIPT SEGMENTS & PILL LABELS:
${JSON.stringify(
  script.segments.map((s) => ({
    segmentIndex: s.segmentIndex,
    chapterTitle: s.chapterTitle,
    pillLabels: s.pillLabels,
  })),
  null,
  2
)}

REQUIREMENTS:
1. Create 1 "internalLayers" entry for each component in blueprint.components (minimum 3-4 layers), positioned cleanly inside x: 250..830, y: 660..1340 so they form a clear cross-section diagram of "${blueprint.topic}".
2. Include "customSvgElements" (rect, circle, ellipse, path, line) with stroke "#1E293B" and warm cel-shaded fills (#E2E8F0, #93C5FD, #FACC15, #86EFAC, #F87171, #C084FC) to show internal structures specific to "${blueprint.topic}".
3. Include 2 or 3 "particleFlows" (type: "ions" | "electrons" | "heat-waves" | "fluid" | "steam" | "airflow") animating between coordinates inside the cutaway.
4. Return ONLY valid JSON matching this structure:
${SCENE_GRAPH_TEMPLATE}`;

  const { data: sceneGraph } =
    await generateStructuredOmniroute<ParametricSceneGraph>({
      systemPrompt: PARAMETRIC_VISUAL_SYSTEM_PROMPT,
      userPrompt,
      schema: ParametricSceneGraphSchema,
      preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
      temperature: 0.25,
    });

  // Camera Choreography per Act driven by blueprint component zoomTargets
  const c2Zoom = blueprint.components[2]?.zoomTarget ?? {
    x: 0,
    y: 120,
    scale: 1.65,
  };
  const cameraPresets = [
    { x: 0, y: 0, scale: 1.0 },
    { x: 0, y: -35, scale: 1.18 },
    { x: c2Zoom.x, y: c2Zoom.y, scale: Math.min(1.85, Math.max(1.35, c2Zoom.scale)) },
    { x: 0, y: 15, scale: 1.02 },
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
        bpPhase?.focusComponentIds ??
        sceneGraph.internalLayers.map((l) => l.componentId),
      showChecklistCard: scriptSeg.showChecklistCard ?? i === 3,
    });

    // Attach pillLabels to the exact (x, y) coordinates of the generated internal layers
    for (const pill of scriptSeg.pillLabels) {
      const matchedLayer = sceneGraph.internalLayers.find(
        (l) => l.componentId === pill.componentId
      );
      const matchedComp = blueprint.components.find(
        (c) => c.id === pill.componentId
      );
      const resolvedAnchor =
        matchedLayer?.anchorScreenCoord ??
        matchedComp?.defaultAnchor ??
        pill.anchor;

      const triggerOffset = Math.floor(
        ttsSeg.durationInFrames * (pill.relativeTriggerRatio ?? 0.15)
      );
      const startFrame = ttsSeg.startFrame + triggerOffset;
      const pillDurationFrames = Math.min(
        Math.round((pill.durationSeconds ?? 4.2) * tts.fps),
        ttsSeg.endFrame - startFrame - 4
      );
      const endFrame = Math.max(
        startFrame + 75,
        startFrame + pillDurationFrames
      );

      pillCallouts.push({
        id: pill.id,
        componentId: pill.componentId,
        startFrame,
        endFrame,
        text: pill.text,
        direction: pill.direction,
        anchor: resolvedAnchor,
      });
    }

    if (scriptSeg.sfxCue) {
      const sfxStartFrame =
        ttsSeg.startFrame +
        Math.floor(
          ttsSeg.durationInFrames *
            (scriptSeg.sfxCue.relativeTriggerRatio ?? 0.3)
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
    width,
    height,
    fps: tts.fps,
    durationInFrames: tts.totalDurationInFrames,
    aspectRatioMode,
    practicalChecklist: script.practicalChecklist,
    scene: sceneGraph,
    phases,
    pillCallouts,
    sfxOverlays,
    sfxTriggers: tts.sfxTriggers ?? [],
  };

  return RemotionCompositionPropsSchema.parse(compositionProps);
}
