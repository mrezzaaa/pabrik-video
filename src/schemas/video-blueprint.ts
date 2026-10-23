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

export const VisualArchetypeSchema = z.enum([
  "PRESTO_PRESSURE_COOKER",
  "THERMAL_TUMBLER",
  "COOLING_AC_SYSTEM",
  "BATTERY_FAST_CHARGE",
  "EVERYDAY_MECHANICAL",
]);

export type VisualArchetype = z.infer<typeof VisualArchetypeSchema>;

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
    x: z.number().min(120).max(960),
    y: z.number().min(480).max(1520),
  }),
  zoomTarget: z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    scale: z.number().min(1).max(2.4).default(1.65),
  }),
});

export const DeconstructedPhaseSchema = z.object({
  phaseIndex: z.number().int().min(0).max(3),
  phaseType: PhaseTypeSchema,
  title: z.string().min(1),
  everydayContrastOrHook: z.string().min(1),
  simpleExplanation: z.string().min(1),
  visualArchetype: VisualArchetypeSchema,
  targetDurationSeconds: z.number().min(5).max(20),
  focusComponentIds: z.array(z.string()),
});

export const DeconstructionBlueprintSchema = z.object({
  topic: z.string().min(1),
  laymanHookTitle: z.string().min(1),
  everydayCategory: z.string().min(1),
  coreSimpleTruth: z.string().min(1),
  primaryArchetype: VisualArchetypeSchema,
  baselineMetricValue: z.number().default(100),
  peakMetricValue: z.number().default(120.5),
  metricUnit: z.string().default("°C"),
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
  text: z.string(), // e.g., "DURI KERAS →", "← UAP TERKURUNG", "PEMBERAT →"
  direction: z.enum(["LEFT", "RIGHT"]).default("RIGHT"),
  anchor: z.object({
    x: z.number(),
    y: z.number(),
  }),
  relativeTriggerRatio: z.number().min(0.05).max(0.85).default(0.15),
  durationSeconds: z.number().min(1.5).max(8).default(4.0),
});

export const SfxCueSchema = z.object({
  text: z.string(), // e.g., "PSSST!", "TERKUNCI", "BERJAM-JAM", "MAMPET!"
  variant: z.enum(["STEAM_YELLOW_BLUE", "RED_STAMP", "FADED_BG", "GREEN_POP"]).default("STEAM_YELLOW_BLUE"),
  soundEffectFile: z.enum(["steam-hiss.mp3", "pop-lock.mp3", "bubble.mp3"]).default("steam-hiss.mp3"),
  x: z.number().default(740),
  y: z.number().default(680),
  rotateDeg: z.number().default(-8),
  relativeTriggerRatio: z.number().min(0.05).max(0.9).default(0.35),
});

export const ScriptSegmentSchema = z.object({
  segmentIndex: z.number().int().min(0).max(3),
  phaseType: PhaseTypeSchema,
  /**
   * Chapter Title with `<highlight>` tags for coral red (#EF4444) words
   * e.g., "Kenapa duri bandeng presto <highlight>bisa lunak?</highlight>"
   * or "Uap dikurung, <highlight>titik didih naik</highlight>"
   */
  chapterTitle: z.string().min(3),
  /**
   * Short, punchy spoken Indonesian sentences (4-7 words per sentence)
   */
  narrationText: z.string().min(8),
  primaryMetric: z.object({
    startValue: z.number(),
    endValue: z.number(),
    unit: z.string().default("°C"),
    decimals: z.number().int().min(0).max(2).default(1),
    isHighActive: z.boolean().default(false),
    baselineValue: z.number().default(100),
    peakValue: z.number().default(120),
    sparklinePoints: z.array(z.number()).min(4),
  }),
  statusBadge: z.object({
    text: z.string(), // e.g., "MENDIDIH", "AMAN", "BERTEKANAN", "TERKUNCI", "MAMPET!"
    variant: z.enum(["green", "red", "amber"]).default("green"),
  }),
  secondaryMetric: z.string(), // e.g., "terbuka", "0,6 kg/cm²", "+69 menit"
  pillLabels: z.array(PillLabelItemSchema).min(1),
  sfxCue: SfxCueSchema.optional(),
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
 * 4. AGENT 4 OUTPUT & REMOTION PROPS: Cutaway & Camera Choreographer (`visual.worker.ts`)
 */
export const CameraZoomKeyframeSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  x: z.number().min(-450).max(450).default(0),
  y: z.number().min(-550).max(550).default(0),
  scale: z.number().min(0.9).max(2.4).default(1.0),
  cutawayOpenRatio: z.number().min(0).max(1).default(1.0),
  steamIntensity: z.number().min(0).max(1.5).default(0.5),
  bubbleIntensity: z.number().min(0).max(1.5).default(0.6),
});

export const CutawayVectorLayerSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  name: z.string(),
  everydayRole: z.string(),
  zIndex: z.number().int(),
  outlineColor: z.string().default("#1E293B"),
  strokeWidth: z.number().default(2.5),
  fillColor: z.string(), // Warm palette: #E2E8F0, #FACC15, #86EFAC, #F87171, #93C5FD
  partType: z.enum([
    "POT_BODY_CUTAWAY",
    "BOILING_WATER_FLUID",
    "CORE_SUBJECT_ITEM",
    "PRESSURE_WEIGHT_VALVE",
    "LID_SAFETY_LOCK",
  ]),
  anchorScreenCoord: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const FramePillCalloutSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  text: z.string(), // e.g. "DURI KERAS →", "← UAP TERKURUNG", "PEMBERAT →"
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
  text: z.string(), // "PSSST!", "TERKUNCI", "BERJAM-JAM", "MAMPET!"
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
  primaryArchetype: VisualArchetypeSchema,
  width: z.number().int().default(1080),
  height: z.number().int().default(1920),
  fps: z.number().int().default(60),
  durationInFrames: z.number().int().positive(),
  aspectRatioMode: z.enum(["SHORTS_9_16", "LANDSCAPE_16_9"]).default("SHORTS_9_16"),
  practicalChecklist: z.object({
    title: z.string(),
    items: z.array(z.string()),
  }),
  cutawayLayers: z.array(CutawayVectorLayerSchema),
  phases: z.array(PhaseTimelineBlockSchema).length(4),
  pillCallouts: z.array(FramePillCalloutSchema),
  sfxOverlays: z.array(FrameSfxOverlaySchema),
  sfxTriggers: z.array(AudioSfxTriggerSchema).default([]),
});

export type RemotionCompositionProps = z.infer<typeof RemotionCompositionPropsSchema>;
export type CutawayVectorLayer = z.infer<typeof CutawayVectorLayerSchema>;
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
