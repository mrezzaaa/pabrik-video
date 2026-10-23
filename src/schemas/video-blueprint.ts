import { z } from "zod";

/**
 * Phase types for engineering/scientific deconstruction ("kitabedah.id" style)
 */
export const PhaseTypeSchema = z.enum([
  "HOOK",
  "CORE_MECHANISM",
  "COMPONENT_BREAKDOWN",
  "TELEMETRY_DATA",
  "SUMMARY",
]);

export type PhaseType = z.infer<typeof PhaseTypeSchema>;

/**
 * 1. AGENT 1 OUTPUT: Topic Deconstructor Blueprint (`deconstructor.worker.ts`)
 */
export const DeconstructedComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  materialOrSpec: z.string(),
  roleInMechanism: z.string(),
  physicsPrinciple: z.string(),
  defaultAnchor: z.object({
    x: z.number().min(100).max(1820),
    y: z.number().min(180).max(950),
  }),
});

export const DeconstructedPhaseSchema = z.object({
  phaseIndex: z.number().int().min(0).max(4),
  phaseType: PhaseTypeSchema,
  title: z.string().min(1),
  scientificPrinciple: z.string().min(1),
  keyMechanismSummary: z.string().min(1),
  visualArchetype: z.enum([
    "THERMAL_VESSEL",
    "COOLING_COMPRESSOR",
    "MECHANICAL_TURBINE",
    "BATTERY_ELECTROCHEMICAL",
    "AERODYNAMIC_FLOW",
    "MICROCHIP_ARCHITECTURE",
  ]),
  targetDurationSeconds: z.number().min(3).max(20),
  focusComponentIds: z.array(z.string()),
});

export const DeconstructionBlueprintSchema = z.object({
  topic: z.string().min(1),
  normalizedTitle: z.string().min(1),
  engineeringCategory: z.string().min(1),
  coreEquationOrLaw: z.string().min(1),
  primaryArchetype: z.enum([
    "THERMAL_VESSEL",
    "COOLING_COMPRESSOR",
    "MECHANICAL_TURBINE",
    "BATTERY_ELECTROCHEMICAL",
    "AERODYNAMIC_FLOW",
    "MICROCHIP_ARCHITECTURE",
  ]),
  components: z.array(DeconstructedComponentSchema).min(3),
  phases: z.array(DeconstructedPhaseSchema).length(5),
});

export type DeconstructionBlueprint = z.infer<typeof DeconstructionBlueprintSchema>;

/**
 * 2. AGENT 2 OUTPUT: Script & Telemetry Architect (`scriptwriter.worker.ts`)
 */
export const TelemetryChannelSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.string(),
  minVal: z.number(),
  maxVal: z.number(),
  warnThreshold: z.number().optional(),
  dangerThreshold: z.number().optional(),
  decimals: z.number().int().min(0).max(3).default(1),
  colorHex: z.string().default("#38BDF8"),
});

export const TelemetryDatapointSchema = z.object({
  channelId: z.string(),
  startValue: z.number(),
  endValue: z.number(),
  sparklineHistory: z.array(z.number()).min(4),
  status: z.enum(["NOMINAL", "OPTIMAL", "WARNING", "CRITICAL"]),
});

export const PopUpCalloutDraftSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  relativeTriggerRatio: z.number().min(0.05).max(0.9),
  durationSeconds: z.number().min(2).max(8).default(4),
  label: z.string(),
  value: z.string(),
  formulaOrFact: z.string(),
  subtext: z.string(),
  accentColor: z.string().default("#38BDF8"),
  anchor: z.object({
    x: z.number(),
    y: z.number(),
  }),
  cardPosition: z.enum(["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"]),
});

export const ScriptSegmentSchema = z.object({
  segmentIndex: z.number().int().min(0),
  phaseType: PhaseTypeSchema,
  phaseTitle: z.string(),
  narrationText: z.string().min(10),
  onScreenHeadline: z.string().min(2),
  telemetrySnapshot: z.array(TelemetryDatapointSchema).min(3),
  callouts: z.array(PopUpCalloutDraftSchema).min(1),
});

export const ScriptArchitectOutputSchema = z.object({
  topic: z.string(),
  totalSegments: z.number().int().positive(),
  fullNarrationIndonesian: z.string(),
  telemetryChannels: z.array(TelemetryChannelSchema).min(3).max(5),
  segments: z.array(ScriptSegmentSchema).length(5),
});

export type ScriptArchitectOutput = z.infer<typeof ScriptArchitectOutputSchema>;

/**
 * 3. AGENT 3 OUTPUT: TTS & Audio Timing Synchronizer (`tts.worker.ts`)
 */
export const WordTimingSchema = z.object({
  word: z.string(),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().nonnegative(),
});

export const AudioSegmentTimingSchema = z.object({
  segmentIndex: z.number().int().nonnegative(),
  phaseType: PhaseTypeSchema,
  audioUrl: z.string(),
  filePath: z.string(),
  durationInSeconds: z.number().positive(),
  startSec: z.number().nonnegative(),
  endSec: z.number().positive(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  wordTimings: z.array(WordTimingSchema),
});

export const TtsSynchronizerOutputSchema = z.object({
  jobId: z.string(),
  fps: z.number().int().default(60),
  voice: z.string().default("Ethan"),
  language: z.string().default("id-ID"),
  speed: z.number().default(1.1),
  engineUsed: z.string(),
  totalDurationInSeconds: z.number().positive(),
  totalDurationInFrames: z.number().int().positive(),
  masterAudioUrl: z.string().optional(),
  segments: z.array(AudioSegmentTimingSchema).length(5),
});

export type TtsSynchronizerOutput = z.infer<typeof TtsSynchronizerOutputSchema>;

/**
 * 4. AGENT 4 OUTPUT & REMOTION PROPS: Isometric 3D Vector & Scene Choreographer (`visual.worker.ts`)
 */
export const IsometricCameraKeyframeSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  zoom: z.number().min(0.6).max(2.2).default(1),
  panX: z.number().min(-400).max(400).default(0),
  panY: z.number().min(-300).max(300).default(0),
  rotateXDeg: z.number().default(60),
  rotateZDeg: z.number().default(-45),
  explodeFactor: z.number().min(0).max(1.5).default(0),
  crossSectionRatio: z.number().min(0).max(1).default(0),
});

export const IsometricVectorLayerSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  name: z.string(),
  zIndex: z.number().int(),
  baseElevationZ: z.number(),
  explodeOffsetZ: z.number(),
  explodeOffsetX: z.number().default(0),
  explodeOffsetY: z.number().default(0),
  strokeColor: z.string(),
  fillColor: z.string(),
  glowColor: z.string(),
  svgPrimitiveType: z.enum([
    "OUTER_SHELL_CYLINDER",
    "VACUUM_ANNULUS_CHAMBER",
    "COPPER_THERMAL_LINING",
    "INNER_CORE_CHAMBER",
    "SEAL_CAP_ASSEMBLY",
    "HEAT_FLUX_VECTORS",
    "COMPRESSOR_COIL_MATRIX",
    "TURBINE_ROTOR_STACK",
  ]),
  energyFlowPathD: z.string(),
  anchorScreenCoord: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const FrameCalloutTriggerSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  label: z.string(),
  value: z.string(),
  formulaOrFact: z.string(),
  subtext: z.string(),
  accentColor: z.string(),
  anchor: z.object({
    x: z.number(),
    y: z.number(),
  }),
  elbowPoint: z.object({
    x: z.number(),
    y: z.number(),
  }),
  cardCoord: z.object({
    x: z.number(),
    y: z.number(),
  }),
  cardPosition: z.enum(["TOP_LEFT", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_RIGHT"]),
});

export const PhaseTimelineBlockSchema = z.object({
  segmentIndex: z.number().int().nonnegative(),
  phaseType: PhaseTypeSchema,
  phaseTitle: z.string(),
  onScreenHeadline: z.string(),
  narrationText: z.string(),
  audioUrl: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  wordTimings: z.array(WordTimingSchema),
  camera: IsometricCameraKeyframeSchema,
  telemetrySnapshot: z.array(TelemetryDatapointSchema),
  activeComponentIds: z.array(z.string()),
});

export const RemotionCompositionPropsSchema = z.object({
  jobId: z.string(),
  topic: z.string(),
  normalizedTitle: z.string(),
  engineeringCategory: z.string(),
  coreEquationOrLaw: z.string(),
  primaryArchetype: z.enum([
    "THERMAL_VESSEL",
    "COOLING_COMPRESSOR",
    "MECHANICAL_TURBINE",
    "BATTERY_ELECTROCHEMICAL",
    "AERODYNAMIC_FLOW",
    "MICROCHIP_ARCHITECTURE",
  ]),
  width: z.number().int().default(1920),
  height: z.number().int().default(1080),
  fps: z.number().int().default(60),
  durationInFrames: z.number().int().positive(),
  aspectRatioMode: z.enum(["LANDSCAPE_16_9", "SHORTS_9_16"]).default("LANDSCAPE_16_9"),
  telemetryChannels: z.array(TelemetryChannelSchema),
  isometricLayers: z.array(IsometricVectorLayerSchema),
  phases: z.array(PhaseTimelineBlockSchema).length(5),
  callouts: z.array(FrameCalloutTriggerSchema),
});

export type RemotionCompositionProps = z.infer<typeof RemotionCompositionPropsSchema>;
export type IsometricVectorLayer = z.infer<typeof IsometricVectorLayerSchema>;
export type FrameCalloutTrigger = z.infer<typeof FrameCalloutTriggerSchema>;
export type PhaseTimelineBlock = z.infer<typeof PhaseTimelineBlockSchema>;
export type TelemetryChannel = z.infer<typeof TelemetryChannelSchema>;

/**
 * Job Pipeline Tracking Schema (Stored in Redis & streamed via SSE)
 */
export const AgentStepStatusSchema = z.enum(["PENDING", "ACTIVE", "COMPLETED", "FAILED"]);

export const PipelineLogEntrySchema = z.object({
  timestamp: z.string(),
  agent: z.string(),
  level: z.enum(["INFO", "SUCCESS", "WARN", "ERROR"]),
  message: z.string(),
});

export const VideoJobStateSchema = z.object({
  jobId: z.string(),
  topic: z.string(),
  aspectRatioMode: z.enum(["LANDSCAPE_16_9", "SHORTS_9_16"]).default("LANDSCAPE_16_9"),
  status: z.enum([
    "QUEUED",
    "DECONSTRUCTING",
    "SCRIPTING",
    "SYNTHESIZING_TTS",
    "CHOREOGRAPHING_VISUALS",
    "READY_FOR_PREVIEW",
    "RENDERING_MP4",
    "COMPLETED",
    "FAILED",
  ]),
  progressPercent: z.number().min(0).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
  error: z.string().optional(),
  steps: z.object({
    deconstructor: AgentStepStatusSchema,
    scriptwriter: AgentStepStatusSchema,
    tts: AgentStepStatusSchema,
    visual: AgentStepStatusSchema,
    renderer: AgentStepStatusSchema,
  }),
  blueprint: DeconstructionBlueprintSchema.optional(),
  script: ScriptArchitectOutputSchema.optional(),
  tts: TtsSynchronizerOutputSchema.optional(),
  compositionProps: RemotionCompositionPropsSchema.optional(),
  outputMp4Url: z.string().optional(),
  logs: z.array(PipelineLogEntrySchema),
});

export type VideoJobState = z.infer<typeof VideoJobStateSchema>;
export type PipelineLogEntry = z.infer<typeof PipelineLogEntrySchema>;
