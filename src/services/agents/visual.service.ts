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
  type ThreeNode,
} from "@/schemas/video-blueprint";
import { THREEJS_CUTAWAY_VISUAL_SYSTEM_PROMPT } from "./prompts";
import { loadAgentSkill } from "@/lib/skill-loader";
import { project3DTo2D } from "@/remotion/projection";

const ISO_SCENE_TEMPLATE = `{
  "subjectTitle": "<Subject Cutaway Title>",
  "objectFormFactor": "<Description of form factor, e.g., Cylindrical Pressure Cooker Assembly>",
  "anatomyDecomposition": {
    "outerHousingShell": "<Outer shell name and cutaway description>",
    "primaryInternalMechanism": "<Internal chamber and primary mechanism>",
    "zoomInSubComponents": "<Key subcomponents zoomed in>",
    "physicalStateChange": "<Core physical state change>"
  },
  "cameraPreset": {
    "basePosition": [8, 6.5, 8],
    "baseZoom": 170
  },
  "enableSteamWisps": false,
  "nodes": [
    {
      "nodeId": "node_outer_shell",
      "componentId": "comp_1",
      "name": "<Outer Housing / Casing>",
      "geometryType": "hollow-cylinder",
      "position": [0, 0, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "color": "#E2E8F0",
      "materialType": "toon",
      "opacity": 1.0,
      "enableCutawayClip": true,
      "showEdgesOutline": true,
      "geometryArgs": {
        "radiusTop": 1.25,
        "radiusBottom": 1.25,
        "height": 2.4,
        "wallThickness": 0.16,
        "arcAngleDeg": 270
      },
      "animation": {
        "type": "none",
        "axis": "y",
        "speed": 1.0,
        "amplitude": 0,
        "activeInPhases": [0, 1, 2, 3]
      }
    },
    {
      "nodeId": "node_internal_cavity",
      "componentId": "comp_2",
      "name": "<Internal Chamber / Fluid Reservoir>",
      "geometryType": "cylinder",
      "position": [0, -0.2, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "color": "#93C5FD",
      "materialType": "liquid",
      "opacity": 0.85,
      "enableCutawayClip": false,
      "showEdgesOutline": true,
      "geometryArgs": {
        "radiusTop": 1.0,
        "radiusBottom": 1.0,
        "height": 1.6
      },
      "animation": {
        "type": "fluid-level",
        "axis": "y",
        "speed": 1.2,
        "amplitude": 0.1,
        "activeInPhases": [1, 2]
      }
    },
    {
      "nodeId": "node_core_mechanism",
      "componentId": "comp_3",
      "name": "<Primary Active Mechanism>",
      "geometryType": "lathe",
      "position": [0, -0.6, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "color": "#FACC15",
      "materialType": "metallic",
      "opacity": 1.0,
      "enableCutawayClip": false,
      "showEdgesOutline": true,
      "geometryArgs": {
        "radiusTop": 0.7,
        "height": 1.2,
        "lathePoints": [[0.1, -0.6], [0.6, -0.3], [0.7, 0.2], [0.4, 0.6]]
      },
      "animation": {
        "type": "rotate",
        "axis": "y",
        "speed": 1.5,
        "amplitude": 0.2,
        "activeInPhases": [1, 2, 3]
      }
    },
    {
      "nodeId": "node_safety_valve",
      "componentId": "comp_4",
      "name": "<Precision Valve / Zoom Sub-Part>",
      "geometryType": "capsule",
      "position": [0, 1.35, 0],
      "rotation": [0, 0, 0],
      "scale": [1, 1, 1],
      "color": "#F87171",
      "materialType": "metallic",
      "opacity": 1.0,
      "enableCutawayClip": false,
      "showEdgesOutline": true,
      "geometryArgs": {
        "radiusTop": 0.25,
        "height": 0.6
      },
      "animation": {
        "type": "oscillate-position",
        "axis": "y",
        "speed": 2.2,
        "amplitude": 0.18,
        "activeInPhases": [1, 2]
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

  // Dynamically load the anatomy skill instructions
  const anatomySkill = await loadAgentSkill(".agents/skill/anatomy");

  const systemPrompt = `${THREEJS_CUTAWAY_VISUAL_SYSTEM_PROMPT}

--- AGENT SKILL PLAYBOOK (.agents/skill/anatomy) ---
${anatomySkill}
---------------------------------------------------`;

  const userPrompt = `Design a high-fidelity Three.js 3D Isometric Cutaway Scene ("IsoSceneGraphSchema") for:

TOPIC: "${blueprint.topic}"
CATEGORY: "${blueprint.everydayCategory}"
CORE MECHANISM: "${blueprint.coreSimpleTruth}"

BLUEPRINT COMPONENTS TO ASSEMBLE:
${JSON.stringify(blueprint.components, null, 2)}

SCRIPT STORYBOARD (4 BEATS):
${JSON.stringify(
  script.segments.map((s) => ({
    segmentIndex: s.segmentIndex,
    chapterTitle: s.chapterTitle,
    pillLabels: s.pillLabels,
  })),
  null,
  2
)}

GEOMETRY & SCENE SPECIFICATIONS:
1. Provide 4 to 8 Three.js nodes in normalized metric space [-2.5..2.5].
2. Outer housing/shell MUST have enableCutawayClip: true or geometryType: "hollow-cylinder" with arcAngleDeg: 270 so interior mechanisms are visible.
3. Coaxially nest internal chambers and core mechanisms cleanly inside the outer shell.
4. Set enableSteamWisps to true ONLY if topic involves boiling, steaming, exhaust fumes, or vapor release.
5. Return ONLY valid JSON conforming to this schema structure:
${ISO_SCENE_TEMPLATE}`;

  const response = await generateStructuredOmniroute<IsoSceneGraph>({
    systemPrompt,
    userPrompt,
    schema: IsoSceneGraphSchema,
    preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
    temperature: 0.2,
  });

  const visualScene: IsoSceneGraph = response.data;

  // Build Camera Keyframes per beat
  const baseCamPos = visualScene.cameraPreset?.basePosition ?? [8, 6.5, 8];
  const baseZoom = visualScene.cameraPreset?.baseZoom ?? 170;

  // Focus target for Act 3 (Component Zoom-In)
  const c3TargetComp = blueprint.components[2] ?? blueprint.components[1];
  const c3Focus: [number, number, number] = c3TargetComp?.zoomTarget?.focusPosition3D ?? [0, 0.4, 0];
  const c3Multiplier = c3TargetComp?.zoomTarget?.zoomMultiplier ?? 1.55;

  const cameraPresets: {
    focusTarget3D: [number, number, number];
    scale: number;
  }[] = [
    { focusTarget3D: [0, 0, 0], scale: 1.0 },
    { focusTarget3D: [0, -0.15, 0], scale: 1.15 },
    { focusTarget3D: c3Focus, scale: Math.min(2.0, Math.max(1.35, c3Multiplier)) },
    { focusTarget3D: [0, 0.1, 0], scale: 1.02 },
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
        focusTarget3D: camPreset.focusTarget3D,
        x: 0,
        y: 0,
        scale: camPreset.scale,
      },
      primaryMetric: scriptSeg.primaryMetric,
      statusBadge: scriptSeg.statusBadge,
      secondaryMetric: scriptSeg.secondaryMetric,
      activeComponentIds:
        bpPhase?.focusComponentIds ??
        visualScene.nodes.map((n) => n.componentId),
      showChecklistCard: scriptSeg.showChecklistCard ?? i === 3,
    });

    // Compute pill callout anchors using Three.js 3D-to-2D projection
    const phasePills: { pill: FramePillCallout; anchorY: number }[] = [];

    for (const pill of scriptSeg.pillLabels) {
      const matchedNode = visualScene.nodes.find(
        (n) => n.componentId === pill.componentId
      );

      const nodePos3D: [number, number, number] = matchedNode
        ? matchedNode.position
        : [0, 0, 0];

      const rawAnchor = project3DTo2D(
        nodePos3D,
        baseCamPos,
        camPreset.focusTarget3D,
        baseZoom * camPreset.scale,
        width,
        height
      );

      // Clamp anchor into readable viewport margins
      let anchorX = Math.round(Math.max(160, Math.min(width - 160, rawAnchor.x)));
      let anchorY = Math.round(Math.max(340, Math.min(height - 380, rawAnchor.y)));

      // Collision avoidance with previous pill in the same phase
      for (const prev of phasePills) {
        if (Math.abs(anchorY - prev.anchorY) < 76) {
          if (anchorY + 80 <= height - 380) {
            anchorY += 80;
          } else {
            anchorY -= 80;
          }
        }
      }

      // Timing anticipation from narration
      const cleanPillTerms = pill.text
        .replace(/[→←\-><]/g, "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);

      const matchedWord = ttsSeg.wordTimings.find((wt) => {
        const cleanW = wt.word.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanPillTerms.some(
          (term) => cleanW.includes(term) || term.includes(cleanW)
        );
      });

      const anticipationFrames = Math.round(0.2 * tts.fps);
      const baseTriggerFrame = matchedWord
        ? Math.max(ttsSeg.startFrame, matchedWord.startFrame - anticipationFrames)
        : ttsSeg.startFrame + Math.min(30, Math.floor(ttsSeg.durationInFrames * 0.15));

      const startFrame = baseTriggerFrame;
      const pillDurationFrames = Math.min(
        Math.round((pill.durationSeconds ?? 4.0) * tts.fps),
        Math.max(90, ttsSeg.endFrame - startFrame - 6)
      );
      const endFrame = Math.max(startFrame + 75, startFrame + pillDurationFrames);

      const callout: FramePillCallout = {
        id: pill.id,
        componentId: pill.componentId,
        startFrame,
        endFrame,
        text: pill.text,
        direction: pill.direction,
        anchor: { x: anchorX, y: anchorY },
      };

      phasePills.push({ pill: callout, anchorY });
      pillCallouts.push(callout);
    }

    if (scriptSeg.sfxCue) {
      const cleanSfx = scriptSeg.sfxCue.text.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchedSfxWord = ttsSeg.wordTimings.find((wt) => {
        const w = wt.word.toLowerCase().replace(/[^a-z0-9]/g, "");
        return w.includes(cleanSfx) || cleanSfx.includes(w);
      });

      const sfxStartFrame = matchedSfxWord
        ? Math.max(ttsSeg.startFrame, matchedSfxWord.startFrame - Math.round(0.12 * tts.fps))
        : ttsSeg.startFrame + Math.floor(ttsSeg.durationInFrames * (scriptSeg.sfxCue.relativeTriggerRatio ?? 0.25));

      const sfxEndFrame = Math.min(ttsSeg.endFrame - 6, sfxStartFrame + 120);

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
