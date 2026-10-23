import { z } from "zod";

/**
 * 4-Act Layman Storyboard Structure (40-50s Vertical 9:16 Explainer)
 * 1. EVERYDAY_CONTRAST_HOOK (0-7s)
 * 2. CORE_MECHANISM_CUTAWAY (7-24s)
 * 3. COMPONENT_ZOOM_INS (24-35s)
 * 4. PRACTICAL_TAKEAWAY_LOOP (35-45s)
 */
export const PhaseTypeSchema = z.enum([
  "EVERYDAY_CONTRAST_HOOK",
  "CORE_MECHANISM_CUTAWAY",
  "COMPONENT_ZOOM_INS",
  "PRACTICAL_TAKEAWAY_LOOP",
]);

export type PhaseType = z.infer<typeof PhaseTypeSchema>;

export const CutawayContainerTypeSchema = z
  .enum([
    "cylinder-cutaway",
    "box-cutaway",
    "dual-chamber",
    "layered-stack",
    "circuit-board",
    "mechanical-housing",
  ])
  .catch("layered-stack");

export type CutawayContainerType = z.infer<typeof CutawayContainerTypeSchema>;

export const ParticleFlowTypeSchema = z
  .enum([
    "ions",
    "electrons",
    "heat-waves",
    "fluid",
    "steam",
    "airflow",
  ])
  .catch("ions");

export type ParticleFlowType = z.infer<typeof ParticleFlowTypeSchema>;

/**
 * 1. AGENT 1 OUTPUT: Layman Storyboarder (`deconstructor.worker.ts`)
 */
export const DeconstructedComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  everydayRole: z.string().min(1),
  simpleCauseEffect: z.string().min(1),
  fillColor: z.string().default("#E2E8F0"),
  defaultAnchor: z.object({
    x: z.number().min(100).max(980),
    y: z.number().min(460).max(1520),
  }),
  zoomTarget: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    scale: z.number().min(1).max(2.4).default(1.6),
  }),
});

export const DeconstructedPhaseSchema = z.object({
  phaseIndex: z.number().int().min(0).max(3),
  phaseType: PhaseTypeSchema,
  title: z.string().min(1),
  everydayContrastOrHook: z.string().min(1),
  simpleExplanation: z.string().min(1),
  targetDurationSeconds: z.number().min(5).max(20),
  focusComponentIds: z.array(z.string()),
});

export const DeconstructionBlueprintSchema = z.object({
  topic: z.string().min(1),
  laymanHookTitle: z.string().min(1),
  everydayCategory: z.string().min(1),
  coreSimpleTruth: z.string().min(1),
  containerType: CutawayContainerTypeSchema,
  baselineMetricValue: z.number(),
  peakMetricValue: z.number(),
  metricUnit: z.string(),
  practicalChecklistTitle: z.string().default("CEK SEBELUM BELI:"),
  practicalChecklistItems: z.array(z.string()).min(3),
  components: z.array(DeconstructedComponentSchema).min(3),
  phases: z.array(DeconstructedPhaseSchema).length(4),
});

export type DeconstructionBlueprint = z.infer<typeof DeconstructionBlueprintSchema>;

/**
 * 2. AGENT 2 OUTPUT: Conversational Indonesian Copywriter (`scriptwriter.worker.ts`)
 */
export const PillLabelItemSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  text: z.string(), // e.g., "ANODA GRAFIT →", "← ION LITHIUM", "DUAL-CELL →"
  direction: z.enum(["LEFT", "RIGHT"]).catch("RIGHT"),
  anchor: z.object({
    x: z.number().catch(540),
    y: z.number().catch(960),
  }),
  relativeTriggerRatio: z.number().min(0.05).max(0.85).catch(0.15),
  durationSeconds: z.number().min(1.5).max(8).catch(4.0),
});

export const SfxCueSchema = z.object({
  text: z.string(), // e.g., "200 WATT!", "DUAL-CELL", "SUHU AMAN", "KEDAP!"
  variant: z
    .enum(["STEAM_YELLOW_BLUE", "RED_STAMP", "FADED_BG", "GREEN_POP"])
    .catch("STEAM_YELLOW_BLUE"),
  soundEffectFile: z
    .enum(["steam-hiss.mp3", "pop-lock.mp3", "bubble.mp3"])
    .catch("pop-lock.mp3"),
  x: z.number().catch(700),
  y: z.number().catch(640),
  rotateDeg: z.number().catch(-8),
  relativeTriggerRatio: z.number().min(0.05).max(0.9).catch(0.32),
});

export const ScriptSegmentSchema = z.object({
  segmentIndex: z.number().int().min(0).max(3),
  phaseType: PhaseTypeSchema,
  /**
   * Chapter Title with `<highlight>` tags for coral red (#EF4444) words
   */
  chapterTitle: z.string().min(3),
  /**
   * Short, punchy spoken Indonesian sentences (4-7 words per sentence)
   */
  narrationText: z.string().min(8),
  primaryMetric: z.object({
    startValue: z.number(),
    endValue: z.number(),
    unit: z.string(),
    decimals: z.number().int().min(0).max(2).catch(1),
    isHighActive: z.boolean().catch(false),
    baselineValue: z.number().catch(0),
    peakValue: z.number().catch(100),
    sparklinePoints: z.array(z.number()).min(2).catch([10, 40, 70, 100]),
  }),
  statusBadge: z.object({
    text: z.string(),
    variant: z.enum(["green", "red", "amber"]).catch("green"),
  }),
  secondaryMetric: z.string(),
  pillLabels: z.array(PillLabelItemSchema).min(1),
  sfxCue: SfxCueSchema.optional().nullable(),
  showChecklistCard: z.boolean().default(false),
});

export const ScriptArchitectOutputSchema = z.object({
  topic: z.string(),
  totalSegments: z.number().int().default(4),
  fullNarrationIndonesian: z.string(),
  practicalChecklist: z.object({
    title: z.string().default("CEK SEBELUM BELI:"),
    items: z.array(z.string()).min(3),
  }),
  segments: z.array(ScriptSegmentSchema).length(4),
});

export type ScriptArchitectOutput = z.infer<typeof ScriptArchitectOutputSchema>;
export type PillLabelItem = z.infer<typeof PillLabelItemSchema>;
export type SfxCue = z.infer<typeof SfxCueSchema>;

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

export const AudioSfxTriggerSchema = z.object({
  id: z.string(),
  soundEffectFile: z.enum(["steam-hiss.mp3", "pop-lock.mp3", "bubble.mp3"]),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive().default(90),
  visualText: z.string(),
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
  segments: z.array(AudioSegmentTimingSchema).length(4),
  sfxTriggers: z.array(AudioSfxTriggerSchema).default([]),
});

export type TtsSynchronizerOutput = z.infer<typeof TtsSynchronizerOutputSchema>;
export type WordTiming = z.infer<typeof WordTimingSchema>;
export type AudioSfxTrigger = z.infer<typeof AudioSfxTriggerSchema>;

/**
 * 4. AGENT 4 OUTPUT: Dynamic Parametric Cutaway & SVG Scene Composer (`visual.worker.ts`)
 */
export const CustomSvgElementSchema = z.object({
  id: z.string().catch("svg_el"),
  componentId: z.string().optional(),
  shape: z
    .enum(["rect", "circle", "ellipse", "path", "polygon", "line"])
    .catch("rect"),
  /**
   * Coordinates inside the 1080x1920 viewport (cutaway stage area is x: 180..900, y: 580..1460)
   */
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  rx: z.number().optional(),
  ry: z.number().optional(),
  r: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
  d: z.string().optional(),
  points: z.string().optional(),
  fill: z.string().catch("#E2E8F0"),
  stroke: z.string().catch("#1E293B"),
  strokeWidth: z.number().catch(2.5),
  strokeDasharray: z.string().optional(),
  opacity: z.number().min(0.1).max(1).optional().catch(1),
  label: z.string().optional(),
});

export const InternalCutawayLayerSchema = z.object({
  id: z.string().catch("layer_id"),
  componentId: z.string(),
  name: z.string(),
  everydayRole: z.string().catch(""),
  zIndex: z.number().int().catch(1),
  fillColor: z.string().catch("#E2E8F0"),
  outlineColor: z.string().catch("#1E293B"),
  strokeWidth: z.number().catch(2.5),
  bounds: z.object({
    x: z.number().catch(260),
    y: z.number().catch(700),
    width: z.number().catch(240),
    height: z.number().catch(320),
    rx: z.number().catch(14),
  }),
  anchorScreenCoord: z.object({
    x: z.number().catch(420),
    y: z.number().catch(900),
  }),
  customSvgElements: z.array(CustomSvgElementSchema).catch([]),
});

export const ParticleFlowSpecSchema = z.object({
  id: z.string().catch("flow_id"),
  type: ParticleFlowTypeSchema,
  color: z.string().catch("#FACC15"),
  from: z.object({
    x: z.number().catch(360),
    y: z.number().catch(860),
  }),
  to: z.object({
    x: z.number().catch(720),
    y: z.number().catch(860),
  }),
  count: z.number().int().min(3).max(24).catch(10),
  speed: z.number().min(0.4).max(4).catch(1.4),
  size: z.number().min(4).max(22).catch(10),
  activeInPhases: z.array(z.number().int()).catch([0, 1, 2, 3]),
});

export const ParametricSceneGraphSchema = z.object({
  containerType: CutawayContainerTypeSchema,
  containerTitle: z.string(),
  containerSubtitle: z.string().optional(),
  outerBounds: z.object({
    x: z.number().default(220),
    y: z.number().default(620),
    width: z.number().default(640),
    height: z.number().default(760),
    wallThickness: z.number().default(26),
    outerFill: z.string().default("#E2E8F0"),
    interiorFill: z.string().default("#F8FAFC"),
  }),
  internalLayers: z.array(InternalCutawayLayerSchema).min(3),
  customSvgElements: z.array(CustomSvgElementSchema).default([]),
  particleFlows: z.array(ParticleFlowSpecSchema).min(1),
});

export const CameraZoomKeyframeSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  x: z.number().min(-450).max(450).default(0),
  y: z.number().min(-550).max(550).default(0),
  scale: z.number().min(0.9).max(2.4).default(1.0),
});

export const FramePillCalloutSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  text: z.string(),
  direction: z.enum(["LEFT", "RIGHT"]),
  anchor: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const FrameSfxOverlaySchema = z.object({
  id: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  text: z.string(),
  variant: z.enum(["STEAM_YELLOW_BLUE", "RED_STAMP", "FADED_BG", "GREEN_POP"]),
  x: z.number(),
  y: z.number(),
  rotateDeg: z.number().default(-8),
});

export const PhaseTimelineBlockSchema = z.object({
  segmentIndex: z.number().int().nonnegative(),
  phaseType: PhaseTypeSchema,
  chapterTitle: z.string(),
  narrationText: z.string(),
  audioUrl: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  durationInFrames: z.number().int().positive(),
  wordTimings: z.array(WordTimingSchema),
  camera: CameraZoomKeyframeSchema,
  primaryMetric: ScriptSegmentSchema.shape.primaryMetric,
  statusBadge: ScriptSegmentSchema.shape.statusBadge,
  secondaryMetric: z.string(),
  activeComponentIds: z.array(z.string()),
  showChecklistCard: z.boolean().default(false),
});

export const RemotionCompositionPropsSchema = z.object({
  jobId: z.string(),
  topic: z.string(),
  laymanHookTitle: z.string(),
  everydayCategory: z.string(),
  coreSimpleTruth: z.string(),
  width: z.number().int().default(1080),
  height: z.number().int().default(1920),
  fps: z.number().int().default(60),
  durationInFrames: z.number().int().positive(),
  aspectRatioMode: z.enum(["SHORTS_9_16", "LANDSCAPE_16_9"]).default("SHORTS_9_16"),
  practicalChecklist: z.object({
    title: z.string(),
    items: z.array(z.string()),
  }),
  scene: ParametricSceneGraphSchema,
  phases: z.array(PhaseTimelineBlockSchema).length(4),
  pillCallouts: z.array(FramePillCalloutSchema),
  sfxOverlays: z.array(FrameSfxOverlaySchema),
  sfxTriggers: z.array(AudioSfxTriggerSchema).default([]),
});

export type RemotionCompositionProps = z.infer<typeof RemotionCompositionPropsSchema>;
export type ParametricSceneGraph = z.infer<typeof ParametricSceneGraphSchema>;
export type InternalCutawayLayer = z.infer<typeof InternalCutawayLayerSchema>;
export type CustomSvgElement = z.infer<typeof CustomSvgElementSchema>;
export type ParticleFlowSpec = z.infer<typeof ParticleFlowSpecSchema>;
export type FramePillCallout = z.infer<typeof FramePillCalloutSchema>;
export type FrameSfxOverlay = z.infer<typeof FrameSfxOverlaySchema>;
export type PhaseTimelineBlock = z.infer<typeof PhaseTimelineBlockSchema>;
export type CameraZoomKeyframe = z.infer<typeof CameraZoomKeyframeSchema>;

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
  aspectRatioMode: z.enum(["SHORTS_9_16", "LANDSCAPE_16_9"]).default("SHORTS_9_16"),
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
