import { buildFallbackBlueprint } from "@/services/agents/deconstructor.service";
import { buildFallbackScript } from "@/services/agents/scriptwriter.service";
import type {
  CutawayVectorLayer,
  FramePillCallout,
  FrameSfxOverlay,
  PhaseTimelineBlock,
  RemotionCompositionProps,
  WordTiming,
} from "@/schemas/video-blueprint";

function computeClientWordTimings(
  narrationText: string,
  segmentStartSec: number,
  segmentDurationSec: number,
  fps = 60
): WordTiming[] {
  const words = narrationText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return [];

  const weights = words.map((w) => {
    const baseLen = Math.max(w.replace(/[^a-zA-Z0-9]/g, "").length, 2);
    const commaPause = /[,;:]/.test(w) ? 2.5 : 0;
    const periodPause = /[.!?]/.test(w) ? 4.0 : 0;
    return baseLen + commaPause + periodPause;
  });

  const totalWeight = weights.reduce((acc, v) => acc + v, 0) || 1;
  let cursorSec = segmentStartSec;

  return words.map((word, idx) => {
    const sliceDuration = (weights[idx] / totalWeight) * segmentDurationSec;
    const startSec = Number(cursorSec.toFixed(3));
    const endSec = Number(
      (idx === words.length - 1
        ? segmentStartSec + segmentDurationSec
        : cursorSec + sliceDuration
      ).toFixed(3)
    );
    cursorSec = endSec;

    return {
      word,
      startSec,
      endSec,
      startFrame: Math.floor(startSec * fps),
      endFrame: Math.max(Math.ceil(endSec * fps), Math.floor(startSec * fps) + 1),
    };
  });
}

export function buildDefaultCompositionProps(): RemotionCompositionProps {
  const defaultTopic = "Kenapa duri bandeng presto bisa lunak?";
  const blueprint = buildFallbackBlueprint(defaultTopic);
  const script = buildFallbackScript(blueprint);

  const fps = 60;
  let cursorSec = 0;
  let cursorFrames = 0;

  const partTypes: CutawayVectorLayer["partType"][] = [
    "POT_BODY_CUTAWAY",
    "BOILING_WATER_FLUID",
    "CORE_SUBJECT_ITEM",
    "PRESSURE_WEIGHT_VALVE",
    "LID_SAFETY_LOCK",
  ];

  const cutawayLayers: CutawayVectorLayer[] = blueprint.components.map(
    (comp, idx) => ({
      id: `cutaway_layer_${idx}`,
      componentId: comp.id,
      name: comp.name,
      everydayRole: comp.everydayRole,
      zIndex: idx + 1,
      outlineColor: "#1E293B",
      strokeWidth: 2.5,
      fillColor: comp.fillColor,
      partType: partTypes[idx % partTypes.length],
      anchorScreenCoord: comp.defaultAnchor,
    })
  );

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

  script.segments.forEach((seg, i) => {
    const durationInSeconds = blueprint.phases[i]?.targetDurationSeconds ?? 9.5;
    const durationInFrames = Math.ceil(durationInSeconds * fps);
    const startSec = cursorSec;
    const endSec = Number((cursorSec + durationInSeconds).toFixed(3));
    const startFrame = cursorFrames;
    const endFrame = cursorFrames + durationInFrames;
    cursorSec = endSec;
    cursorFrames = endFrame;

    const wordTimings = computeClientWordTimings(
      seg.narrationText,
      startSec,
      durationInSeconds,
      fps
    );

    phases.push({
      segmentIndex: i,
      phaseType: seg.phaseType,
      chapterTitle: seg.chapterTitle,
      narrationText: seg.narrationText,
      audioUrl: "",
      startFrame,
      endFrame,
      durationInFrames,
      wordTimings,
      camera: {
        startFrame,
        endFrame,
        ...(cameraPresets[i] ?? cameraPresets[0]),
      },
      primaryMetric: seg.primaryMetric,
      statusBadge: seg.statusBadge,
      secondaryMetric: seg.secondaryMetric,
      activeComponentIds:
        blueprint.phases[i]?.focusComponentIds ??
        cutawayLayers.map((l) => l.componentId),
      showChecklistCard: seg.showChecklistCard ?? i === 3,
    });

    for (const pill of seg.pillLabels) {
      const pStart =
        startFrame +
        Math.floor(durationInFrames * (pill.relativeTriggerRatio ?? 0.15));
      const pEnd = Math.min(
        endFrame - 6,
        pStart + Math.round((pill.durationSeconds ?? 4.5) * fps)
      );
      pillCallouts.push({
        id: pill.id,
        componentId: pill.componentId,
        startFrame: pStart,
        endFrame: pEnd,
        text: pill.text,
        direction: pill.direction,
        anchor: pill.anchor,
      });
    }

    if (seg.sfxCue) {
      const sStart =
        startFrame +
        Math.floor(
          durationInFrames * (seg.sfxCue.relativeTriggerRatio ?? 0.3)
        );
      sfxOverlays.push({
        id: `sfx_${i}`,
        startFrame: sStart,
        endFrame: Math.min(endFrame - 6, sStart + 135),
        text: seg.sfxCue.text,
        variant: seg.sfxCue.variant,
        x: seg.sfxCue.x,
        y: seg.sfxCue.y,
        rotateDeg: seg.sfxCue.rotateDeg,
      });
    }
  });

  return {
    jobId: "demo-presto-job",
    topic: defaultTopic,
    laymanHookTitle: blueprint.laymanHookTitle,
    everydayCategory: blueprint.everydayCategory,
    coreSimpleTruth: blueprint.coreSimpleTruth,
    primaryArchetype: blueprint.primaryArchetype,
    width: 1080,
    height: 1920,
    fps: 60,
    durationInFrames: cursorFrames,
    aspectRatioMode: "SHORTS_9_16",
    practicalChecklist: script.practicalChecklist,
    cutawayLayers,
    phases,
    pillCallouts,
    sfxOverlays,
    sfxTriggers: [],
  };
}
