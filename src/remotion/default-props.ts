import { buildFallbackBlueprint } from "@/services/agents/deconstructor.service";
import { buildFallbackScript } from "@/services/agents/scriptwriter.service";
import type {
  RemotionCompositionProps,
  TtsSynchronizerOutput,
  WordTimingSchema,
} from "@/schemas/video-blueprint";
import type { z } from "zod";

type WordTiming = z.infer<typeof WordTimingSchema>;

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
  const defaultTopic = "Kenapa air di dalam tumbler suhunya bisa awet";
  const blueprint = buildFallbackBlueprint(defaultTopic);
  const script = buildFallbackScript(blueprint);

  const fps = 60;
  let cursorSec = 0;
  let cursorFrames = 0;

  const ttsSegments = script.segments.map((seg) => {
    const durationInSeconds = 6.5;
    const durationInFrames = Math.ceil(durationInSeconds * fps);
    const startSec = cursorSec;
    const endSec = Number((cursorSec + durationInSeconds).toFixed(3));
    const startFrame = cursorFrames;
    const endFrame = cursorFrames + durationInFrames;
    cursorSec = endSec;
    cursorFrames = endFrame;

    return {
      segmentIndex: seg.segmentIndex,
      phaseType: seg.phaseType,
      audioUrl: "",
      filePath: "",
      durationInSeconds,
      startSec,
      endSec,
      startFrame,
      endFrame,
      durationInFrames,
      wordTimings: computeClientWordTimings(
        seg.narrationText,
        startSec,
        durationInSeconds,
        fps
      ),
    };
  });

  const tts: TtsSynchronizerOutput = {
    jobId: "demo-tumbler-job",
    fps,
    voice: "Ethan",
    language: "id-ID",
    speed: 1.1,
    engineUsed: "unlimitedtts.com (id-ID, Voice: Ethan, Speed: 1.1x)",
    totalDurationInSeconds: cursorSec,
    totalDurationInFrames: cursorFrames,
    segments: ttsSegments,
  };

  // Synchronously build choreography using deterministic helper
  const layers = blueprint.components.map((comp, idx) => {
    const strokes = ["#38BDF8", "#22D3EE", "#F59E0B", "#10B981", "#F43F5E"];
    const fills = [
      "rgba(14, 116, 144, 0.24)",
      "rgba(6, 182, 212, 0.16)",
      "rgba(217, 119, 6, 0.26)",
      "rgba(5, 150, 105, 0.24)",
      "rgba(225, 29, 72, 0.26)",
    ];
    const primitives = [
      "OUTER_SHELL_CYLINDER",
      "VACUUM_ANNULUS_CHAMBER",
      "COPPER_THERMAL_LINING",
      "INNER_CORE_CHAMBER",
      "SEAL_CAP_ASSEMBLY",
    ] as const;
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
      strokeColor: strokes[idx % strokes.length],
      fillColor: fills[idx % fills.length],
      glowColor: strokes[idx % strokes.length],
      svgPrimitiveType: primitives[idx % primitives.length],
      energyFlowPathD: "M 960 680 C 910 580, 910 460, 960 360",
      anchorScreenCoord: comp.defaultAnchor,
    };
  });

  const cameraPresets = [
    { zoom: 1.02, panX: 0, panY: 15, rotateXDeg: 60, rotateZDeg: -45, explodeFactor: 0.0, crossSectionRatio: 0.15 },
    { zoom: 1.16, panX: -25, panY: 5, rotateXDeg: 58, rotateZDeg: -42, explodeFactor: 0.25, crossSectionRatio: 0.85 },
    { zoom: 1.08, panX: 10, panY: 20, rotateXDeg: 60, rotateZDeg: -48, explodeFactor: 1.0, crossSectionRatio: 1.0 },
    { zoom: 1.22, panX: 0, panY: 55, rotateXDeg: 56, rotateZDeg: -40, explodeFactor: 0.45, crossSectionRatio: 0.9 },
    { zoom: 1.0, panX: 0, panY: 10, rotateXDeg: 60, rotateZDeg: -45, explodeFactor: 0.0, crossSectionRatio: 0.5 },
  ];

  const phases = script.segments.map((seg, i) => ({
    segmentIndex: i,
    phaseType: seg.phaseType,
    phaseTitle: seg.phaseTitle,
    onScreenHeadline: seg.onScreenHeadline,
    narrationText: seg.narrationText,
    audioUrl: "",
    startFrame: ttsSegments[i].startFrame,
    endFrame: ttsSegments[i].endFrame,
    durationInFrames: ttsSegments[i].durationInFrames,
    wordTimings: ttsSegments[i].wordTimings,
    camera: {
      startFrame: ttsSegments[i].startFrame,
      endFrame: ttsSegments[i].endFrame,
      ...cameraPresets[i],
    },
    telemetrySnapshot: seg.telemetrySnapshot,
    activeComponentIds: blueprint.phases[i].focusComponentIds,
  }));

  const callouts = script.segments.flatMap((seg, i) =>
    seg.callouts.map((c) => {
      const startFrame = ttsSegments[i].startFrame + Math.floor(ttsSegments[i].durationInFrames * c.relativeTriggerRatio);
      const endFrame = startFrame + Math.round(c.durationSeconds * fps);
      const isRight = c.cardPosition.includes("RIGHT");
      const isTop = c.cardPosition.includes("TOP");
      const elbow = {
        x: c.anchor.x + (isRight ? 75 : -75),
        y: c.anchor.y + (isTop ? -75 : 75),
      };
      const card = {
        x: isRight ? elbow.x + 95 : elbow.x - 405,
        y: elbow.y - 40,
      };
      return {
        id: c.id,
        componentId: c.componentId,
        startFrame,
        endFrame,
        label: c.label,
        value: c.value,
        formulaOrFact: c.formulaOrFact,
        subtext: c.subtext,
        accentColor: c.accentColor,
        anchor: c.anchor,
        elbowPoint: elbow,
        cardCoord: card,
        cardPosition: c.cardPosition,
      };
    })
  );

  return {
    jobId: "demo-tumbler-job",
    topic: defaultTopic,
    normalizedTitle: blueprint.normalizedTitle,
    engineeringCategory: blueprint.engineeringCategory,
    coreEquationOrLaw: blueprint.coreEquationOrLaw,
    primaryArchetype: blueprint.primaryArchetype,
    width: 1920,
    height: 1080,
    fps: 60,
    durationInFrames: cursorFrames,
    aspectRatioMode: "LANDSCAPE_16_9",
    telemetryChannels: script.telemetryChannels,
    isometricLayers: layers,
    phases,
    callouts,
  };
}
