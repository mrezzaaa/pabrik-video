import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  IsoSceneGraphSchema,
  RemotionCompositionPropsSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
  type TtsSynchronizerOutput,
  type RemotionCompositionProps,
  type FramePillCallout,
  type FrameSfxOverlay,
  type PhaseTimelineBlock,
  type IsoSceneGraph,
  type IsoVectorPart,
} from "@/schemas/video-blueprint";
import { FREEFORM_ISOMETRIC_SVG_VISUAL_SYSTEM_PROMPT } from "./prompts";

const ISO_SCENE_GRAPH_TEMPLATE = `{
  "subjectTitle": "<SHORT UPPERCASE SUBJECT NAME>",
  "objectFormFactor": "<e.g., Dual-Cell Lithium-Ion Fast Charging Cutaway>",
  "anatomyDecomposition": {
    "outerStructure": "<What encloses or forms the chassis/shell?>",
    "cutawayCrossSection": "<What internal anatomy is revealed by the 90-degree cutaway?>",
    "coreInternalParts": "<What core mechanisms or electrodes/gears are inside?>",
    "movingMechanism": "<What physical action or flow takes place?>"
  },
  "svgDefsMarkup": "<linearGradient id=\\"grad_core\\" x1=\\"0%\\" y1=\\"0%\\" x2=\\"100%\\" y2=\\"100%\\"><stop offset=\\"0%\\" stop-color=\\"#93C5FD\\"/><stop offset=\\"100%\\" stop-color=\\"#3B82F6\\"/></linearGradient>",
  "parts": [
    {
      "partId": "part_outer_shell",
      "componentId": "comp_1",
      "name": "<Part 1 Name>",
      "layerOrder": 10,
      "isCutawayWall": true,
      "anchorPoint": { "x": 320, "y": 380 },
      "svgMarkup": "<path d=\\"M 220 300 L 500 140 L 780 300 L 780 640 L 500 800 L 220 640 Z\\" fill=\\"#E2E8F0\\" stroke=\\"#1E293B\\" stroke-width=\\"2.5\\" stroke-linejoin=\\"round\\" fill-opacity=\\"0.3\\" stroke-dasharray=\\"6 4\\" />",
      "animation": {
        "type": "none",
        "dx": 0,
        "dy": 0,
        "rotateDeg": 0,
        "scaleFactor": 1,
        "speed": 1,
        "activeInPhases": [0, 1, 2, 3]
      }
    },
    {
      "partId": "part_core_mechanism",
      "componentId": "comp_2",
      "name": "<Part 2 Name>",
      "layerOrder": 20,
      "isCutawayWall": false,
      "anchorPoint": { "x": 480, "y": 480 },
      "svgMarkup": "<path d=\\"M 360 420 L 500 340 L 640 420 L 640 600 L 500 680 L 360 600 Z\\" fill=\\"url(#grad_core)\\" stroke=\\"#1E293B\\" stroke-width=\\"2.5\\" stroke-linejoin=\\"round\\" />",
      "animation": {
        "type": "pulse",
        "dx": 0,
        "dy": 0,
        "rotateDeg": 0,
        "scaleFactor": 1.05,
        "speed": 1.2,
        "activeInPhases": [0, 1, 2, 3]
      }
    },
    {
      "partId": "part_sub_1",
      "componentId": "comp_3",
      "name": "<Part 3 Name>",
      "layerOrder": 30,
      "isCutawayWall": false,
      "anchorPoint": { "x": 420, "y": 620 },
      "svgMarkup": "<path d=\\"M 380 560 L 500 490 L 500 670 L 380 740 Z\\" fill=\\"#FACC15\\" stroke=\\"#1E293B\\" stroke-width=\\"2.5\\" stroke-linejoin=\\"round\\" />",
      "animation": {
        "type": "translate",
        "dx": 0,
        "dy": 6,
        "rotateDeg": 0,
        "scaleFactor": 1,
        "speed": 1,
        "activeInPhases": [1, 2, 3]
      }
    },
    {
      "partId": "part_sub_2",
      "componentId": "comp_4",
      "name": "<Part 4 Name>",
      "layerOrder": 40,
      "isCutawayWall": false,
      "anchorPoint": { "x": 580, "y": 620 },
      "svgMarkup": "<polygon points=\\"500,490 620,560 620,740 500,670\\" fill=\\"#86EFAC\\" stroke=\\"#1E293B\\" stroke-width=\\"2.5\\" stroke-linejoin=\\"round\\" />",
      "animation": {
        "type": "rotate",
        "dx": 0,
        "dy": 0,
        "rotateDeg": 360,
        "scaleFactor": 1,
        "speed": 1.2,
        "activeInPhases": [0, 1, 2, 3]
      }
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

  // Ask Agent 4 via Omniroute to generate freeform multi-layer isometric vector cutaway
  const userPrompt = `Illustrate a topic-authentic, multi-layered Freeform Isometric Cutaway Vector Scene ("IsoSceneGraphSchema") for:

TOPIC: "${blueprint.topic}"
CATEGORY: "${blueprint.everydayCategory}"
CORE MECHANISM: "${blueprint.coreSimpleTruth}"

COMPONENTS FROM AGENT 1 (every componentId below MUST be represented in "parts"):
${JSON.stringify(blueprint.components, null, 2)}

SCRIPT SEGMENTS & PILL POINTERS:
${JSON.stringify(
  script.segments.map((s) => ({
    segmentIndex: s.segmentIndex,
    chapterTitle: s.chapterTitle,
    pillLabels: s.pillLabels,
  })),
  null,
  2
)}

ILLUSTRATION REQUIREMENTS (viewBox="0 0 1000 1000"):
1. Create 4 to 6 clean, topic-accurate vector parts drawn in classic 30-degree isometric projection.
2. Sliced Cutaway: Make the outer housing/casing have "isCutawayWall": true so the internal mechanism is clearly visible inside!
3. Layer Order: Order parts by "layerOrder" (1 to 100) from backmost to frontmost.
4. Cel-shaded style: Use warm colors (#E2E8F0, #93C5FD, #FACC15, #86EFAC, #F87171, #FDBA74) with crisp stroke="#1E293B" stroke-width="2.5".
5. NO <text> tags and NO floating particle circles allowed!
6. Provide an "anchorPoint" { x: 180..820, y: 200..800 } on the 1000x1000 stage for each part where the dark pill callout arrow will point.
7. Return ONLY valid JSON matching this schema structure:
${ISO_SCENE_GRAPH_TEMPLATE}`;

  const { data: visualScene } =
    await generateStructuredOmniroute<IsoSceneGraph>({
      systemPrompt: FREEFORM_ISOMETRIC_SVG_VISUAL_SYSTEM_PROMPT,
      userPrompt,
      schema: IsoSceneGraphSchema,
      preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
      temperature: 0.25,
    });

  // Camera Choreography per Act driven by blueprint component zoomTargets
  const c2Zoom = blueprint.components[2]?.zoomTarget ?? {
    x: 0,
    y: 90,
    scale: 1.6,
  };
  const cameraPresets = [
    { x: 0, y: 0, scale: 1.0 },
    { x: 0, y: -30, scale: 1.18 },
    {
      x: c2Zoom.x,
      y: c2Zoom.y,
      scale: Math.min(1.85, Math.max(1.35, c2Zoom.scale)),
    },
    { x: 0, y: 12, scale: 1.02 },
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
        visualScene.parts.map((p) => p.componentId),
      showChecklistCard: scriptSeg.showChecklistCard ?? i === 3,
    });

    // Compute pill callout anchor from part's 2D anchorPoint on the 1000x1000 stage
    for (const pill of scriptSeg.pillLabels) {
      const matchedPart = visualScene.parts.find(
        (p) => p.componentId === pill.componentId
      );
      // Normalized 1000x1000 stage is positioned centered at (40, 520) in 1080x1920
      const stageX = matchedPart?.anchorPoint?.x ?? 500;
      const stageY = matchedPart?.anchorPoint?.y ?? 500;
      const clampedAnchor = {
        x: Math.round(Math.max(200, Math.min(880, 40 + stageX))),
        y: Math.round(Math.max(620, Math.min(1420, 520 + stageY))),
      };

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
        anchor: clampedAnchor,
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
    visualScene,
    phases,
    pillCallouts,
    sfxOverlays,
    sfxTriggers: tts.sfxTriggers ?? [],
  };

  return RemotionCompositionPropsSchema.parse(compositionProps);
}
