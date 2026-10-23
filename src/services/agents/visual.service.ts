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
  type IsoPart3D,
} from "@/schemas/video-blueprint";
import {
  DEFAULT_ISO_CONFIG,
  computeCentroid3D,
  projectIso3D,
  type Point3D,
} from "@/remotion/iso-engine/iso-math";
import { UNIVERSAL_3D_CAD_VISUAL_SYSTEM_PROMPT } from "./prompts";

const ISO_SCENE_GRAPH_TEMPLATE = `{
  "subjectTitle": "<SHORT UPPERCASE SUBJECT NAME>",
  "anatomyDecomposition": {
    "outerHousingShell": "<What encloses it? e.g., Casing luar / dinding pelindung>",
    "primaryInternalMechanism": "<What moves or reacts inside? e.g., Rotor & kumparan / sel anoda-katoda>",
    "zoomInSubComponents": "<What small parts regulate or lock it? e.g., Katup pengaman / membran separator / chip BMS>",
    "physicalMediumFlow": "<What flows through it? e.g., Aliran ion / uap bertekanan / fluks magnetik>"
  },
  "parts": [
    {
      "partId": "part_outer_shell",
      "componentId": "comp_1",
      "name": "<Part 1 Name>",
      "builderType": "revolveProfile",
      "materialColor": "#E2E8F0",
      "cutaway": true,
      "opacity": 1,
      "params": {
        "center": { "x": 0, "y": 0, "z": 0 },
        "axis": "Z",
        "wallThickness": 9,
        "profilePoints": [
          { "r": 54, "z": -65 },
          { "r": 58, "z": 0 },
          { "r": 52, "z": 65 }
        ]
      },
      "animation": {
        "type": "none",
        "axis": "Z",
        "speed": 1.0,
        "amplitude": 0
      }
    },
    {
      "partId": "part_core_mechanism",
      "componentId": "comp_2",
      "name": "<Part 2 Name>",
      "builderType": "radialArray3D",
      "materialColor": "#93C5FD",
      "cutaway": false,
      "opacity": 1,
      "params": {
        "center": { "x": 0, "y": 0, "z": 8 },
        "axis": "Z",
        "radialCount": 8,
        "radialRadius": 28,
        "elementSize": { "w": 14, "d": 10, "h": 42 }
      },
      "animation": {
        "type": "rotate",
        "axis": "Z",
        "speed": 1.4,
        "amplitude": 15
      }
    },
    {
      "partId": "part_sub_1",
      "componentId": "comp_3",
      "name": "<Part 3 Name>",
      "builderType": "tubePath3D",
      "materialColor": "#FACC15",
      "cutaway": false,
      "opacity": 1,
      "params": {
        "center": { "x": 0, "y": 0, "z": -18 },
        "tubeRadius": 8,
        "path3D": [
          { "x": -34, "y": -18, "z": -38 },
          { "x": 0, "y": 0, "z": -15 },
          { "x": 34, "y": 18, "z": 18 }
        ]
      },
      "animation": {
        "type": "pulse",
        "axis": "Z",
        "speed": 1.5,
        "amplitude": 6
      }
    },
    {
      "partId": "part_sub_2",
      "componentId": "comp_4",
      "name": "<Part 4 Name>",
      "builderType": "box3D",
      "materialColor": "#F87171",
      "cutaway": false,
      "opacity": 1,
      "params": {
        "center": { "x": 0, "y": 0, "z": -48 },
        "size": { "w": 46, "d": 36, "h": 20 }
      },
      "animation": {
        "type": "oscillate",
        "axis": "Z",
        "speed": 1.2,
        "amplitude": 5
      }
    }
  ],
  "particleStreams": [
    {
      "id": "stream_1",
      "type": "ions",
      "color": "#38BDF8",
      "path3D": [
        { "x": -35, "y": -20, "z": -40 },
        { "x": 0, "y": 0, "z": 0 },
        { "x": 35, "y": 20, "z": 42 }
      ],
      "count": 12,
      "speed": 1.6,
      "size": 10,
      "activeInPhases": [0, 1, 2, 3]
    }
  ]
}`;

/**
 * Computes the representative 3D anchor coordinate of an IsoPart3D
 */
export function resolvePartAnchor3D(part: IsoPart3D): Point3D {
  if (part.params.path3D && part.params.path3D.length > 0) {
    return computeCentroid3D(part.params.path3D);
  }
  return part.params.center ?? { x: 0, y: 0, z: 0 };
}

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

  // Ask Agent 4 via Omniroute to execute the 2-Step Anatomy-to-3D CAD Prompt
  const userPrompt = `Execute the 2-Step Anatomy-to-3D CAD Process to construct a topic-accurate 3D Isometric Cutaway Scene Graph ("IsoSceneGraphSchema") for:

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

UNIVERSAL 3D BUILDER SELECTION GUIDE:
- Choose the builders that best represent the real-world physical geometry of "${blueprint.topic}":
  - Cylindrical / conical / spherical / vessel / cup / lens / pipe housing -> use "revolveProfile" with "cutaway": true and 3-6 "profilePoints" ({ r, z }).
  - Rectangular / dual-cell battery / electronic / appliance / chamber housing -> use "hollowBox3D" with "cutaway": true and "size": { w, d, h }.
  - Internal plates / electrodes / chips / blocks -> use "box3D" with "center": { x, y, z } and "size": { w, d, h }.
  - Organic / tooth / biological / custom prism shapes -> use "extrudePolygon" with "polygon": Array<{ x, y }> and "depth".
  - Coils / pipes / nerves / blood vessels / fiber cores / wires -> use "tubePath3D" with "path3D": Array<{ x, y, z }> and "tubeRadius".
  - Turbine blades / motor stator coils / rotor magnets / gears / fins -> use "radialArray3D" with "radialCount", "radialRadius", and "elementSize".
- Include 2 or 3 "particleStreams" flowing along 3D paths ("path3D") inside the cutaway.
- Return ONLY valid JSON matching this structure:
${ISO_SCENE_GRAPH_TEMPLATE}`;

  const { data: visualScene } =
    await generateStructuredOmniroute<IsoSceneGraph>({
      systemPrompt: UNIVERSAL_3D_CAD_VISUAL_SYSTEM_PROMPT,
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

    // Project the 3D part's socket coordinate to 2D SVG screen coordinates via projectIso3D()
    for (const pill of scriptSeg.pillLabels) {
      const matchedPart = visualScene.parts.find(
        (p) => p.componentId === pill.componentId
      );
      const matchedComp = blueprint.components.find(
        (c) => c.id === pill.componentId
      );
      const anchor3D: Point3D = matchedPart
        ? resolvePartAnchor3D(matchedPart)
        : matchedComp?.center3D ?? { x: 0, y: 0, z: 0 };

      const projected2D = projectIso3D(anchor3D, DEFAULT_ISO_CONFIG);
      const clampedAnchor = {
        x: Math.round(Math.max(240, Math.min(840, projected2D.sx))),
        y: Math.round(Math.max(660, Math.min(1360, projected2D.sy))),
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
