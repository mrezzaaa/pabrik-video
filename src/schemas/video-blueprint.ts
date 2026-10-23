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

export const Point3DSchema = z.object({
  x: z.number().catch(0),
  y: z.number().catch(0),
  z: z.number().catch(0),
});
export type Point3D = z.infer<typeof Point3DSchema>;

/**
 * 1. AGENT 1 OUTPUT: Layman Storyboarder (`deconstructor.worker.ts`)
 */
export const DeconstructedComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  everydayRole: z.string().min(1),
  simpleCauseEffect: z.string().min(1),
  fillColor: z.string().catch("#E2E8F0"),
  /**
   * Reference center coordinate in normalized world space
   */
  center3D: Point3DSchema.default({ x: 0, y: 0, z: 0 }),
  zoomTarget: z.object({
    x: z.number().catch(0),
    y: z.number().catch(0),
    scale: z.number().min(1).max(2.4).catch(1.6),
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
  baselineMetricValue: z.number(),
  peakMetricValue: z.number(),
  metricUnit: z.string(),
  practicalChecklistTitle: z.string().catch("CEK SEBELUM PAKAI / BELI:"),
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
  text: z.string(), // e.g., "← ROTOR MAGNET", "KUMPARAN STATOR →"
  direction: z.enum(["LEFT", "RIGHT"]).catch("RIGHT"),
  relativeTriggerRatio: z.number().min(0.05).max(0.85).catch(0.15),
  durationSeconds: z.number().min(1.5).max(8).catch(4.2),
});

export const SfxCueSchema = z.object({
  text: z.string(), // e.g., "PSSST!", "200 WATT!", "TERKUNCI"
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
  chapterTitle: z.string().min(3),
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
  showChecklistCard: z.boolean().catch(false),
});

export const ScriptJuryEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  spokenFlowScore: z.number().min(0).max(100), // Natural conversational cadence and sentence length variation
  beatTransitionScore: z.number().min(0).max(100), // Cohesive transitions between beats (nah, di sinilah, dll.)
  pacingScore: z.number().min(0).max(100), // Conversational tempo: 2.3-2.8 words/sec, no dense clutter
  singleIdeaPerBeatScore: z.number().min(0).max(100), // Exactly 1 main idea per beat
  critique: z.string(),
  improvementSuggestions: z.array(z.string()).default([]),
});

export type ScriptJuryEvaluation = z.infer<typeof ScriptJuryEvaluationSchema>;

export const ScriptArchitectOutputSchema = z.object({
  topic: z.string(),
  totalSegments: z.number().int().catch(4),
  fullNarrationIndonesian: z.string(),
  practicalChecklist: z.object({
    title: z.string().catch("CEK SEBELUM PAKAI / BELI:"),
    items: z.array(z.string()).min(3),
  }),
  segments: z.array(ScriptSegmentSchema).length(4),
  juryEvaluation: ScriptJuryEvaluationSchema.optional(),
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
  endFrame: z.number().int().nonnegative(),
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

export const ShapeSpecSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("box"),
    dx: z.number().positive(),
    dy: z.number().positive(),
    dz: z.number().positive(),
  }),
  z.object({
    type: z.literal("sheet"),
    dx: z.number().positive(),
    dy: z.number().positive(),
    thickness: z.number().positive().default(0.2),
  }),
  z.object({
    type: z.literal("wedge"),
    dx: z.number().positive(),
    dy: z.number().positive(),
    dz: z.number().positive(),
    slopeAxis: z.enum(["x", "y"]).default("x"),
  }),
  z.object({
    type: z.literal("cylinder"),
    radius: z.number().positive(),
    height: z.number().positive(),
  }),
  z.object({
    type: z.literal("cutawayCylinder"),
    radius: z.number().positive(),
    height: z.number().positive(),
    wall: z.number().positive().optional(),
    cut: z.literal("front").default("front"),
  }),
  z.object({
    type: z.literal("cutawayBox"),
    dx: z.number().positive(),
    dy: z.number().positive(),
    dz: z.number().positive(),
    cutRatioX: z.number().min(0.2).max(0.8).default(0.5),
    cutRatioY: z.number().min(0.2).max(0.8).default(0.5),
    floor: z.number().min(0).default(0.4),
  }),
  z.object({
    type: z.literal("extrudePolygon"),
    footprint: z.array(z.object({ x: z.number(), y: z.number() })).min(3),
    dz: z.number().positive(),
  }),
  z.object({
    type: z.literal("pipe"),
    points: z.array(Point3DSchema).min(2),
    radius: z.number().positive().default(0.3),
  }),
  z.object({
    type: z.literal("waveSurface"),
    dx: z.number().positive(),
    dy: z.number().positive(),
    amplitude: z.number().default(0.4),
    wavelength: z.number().default(3.0),
  }),
  z.object({
    type: z.literal("sphere"),
    radius: z.number().positive(),
  }),
]);

export const PartAnimation3DSchema = z.object({
  type: z.enum(["none", "translate3D", "rotate3D", "pulse", "flow"]).catch("none"),
  axis: z.enum(["x", "y", "z"]).default("z"),
  amplitude: z.number().catch(0),
  speed: z.number().catch(1),
  activeInPhases: z.array(z.number().int()).default([0, 1, 2, 3]),
  pivot: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const PartPhaseStateSchema = z.object({
  phase: z.number().int().min(0).max(3),
  visible: z.boolean().default(true),
  offset3D: Point3DSchema.default({ x: 0, y: 0, z: 0 }),
  emphasis: z.enum(["normal", "focus", "dim"]).default("normal"),
});

export const SemanticIsoPartSchema = z.object({
  partId: z.string(),
  componentId: z.string(),
  name: z.string(),
  shape: ShapeSpecSchema,
  position: Point3DSchema, // grid unit coordinates (snap to 0.5)
  rotationZ: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).catch(0),
  color: z.enum(["shell", "water", "hot", "metal", "accent", "leaf", "purple", "cut"]),
  material: z.enum(["solid", "glass", "cut"]).default("solid"),
  animation: PartAnimation3DSchema.default({
    type: "none",
    axis: "z",
    amplitude: 0,
    speed: 1,
    activeInPhases: [0, 1, 2, 3],
  }),
  states: z.array(PartPhaseStateSchema).default([]),
  layerBias: z.number().optional(),
});

export const AnatomyDecompositionSchema = z
  .object({
    outerStructure: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v.join(", ") : v))
      .catch("Outer protective casing"),
    cutawayCrossSection: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v.join(", ") : v))
      .catch("Cross-section cutaway"),
    coreInternalParts: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v.join(", ") : v))
      .catch("Internal core parts"),
    movingMechanism: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v.join(", ") : v))
      .catch("Moving mechanism"),
  })
  .catch({
    outerStructure: "Outer protective casing",
    cutawayCrossSection: "Cross-section cutaway",
    coreInternalParts: "Internal core parts",
    movingMechanism: "Moving mechanism",
  });

export const SemanticIsoSceneRawSchema = z.object({
  subjectTitle: z.string().catch("ISOMETRIC CUTAWAY ASSEMBLY"),
  objectFormFactor: z.string().catch("Technical 3D Cutaway"),
  anatomyDecomposition: AnatomyDecompositionSchema.default({
    outerStructure: "Outer protective casing",
    cutawayCrossSection: "Cross-section cutaway",
    coreInternalParts: "Internal core parts",
    movingMechanism: "Moving mechanism",
  }),
  parts: z.array(SemanticIsoPartSchema).min(4).max(8),
});

export const SemanticIsoSceneSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (!obj.parts) {
      if (obj.visualScene && typeof obj.visualScene === "object") return obj.visualScene;
      if (obj.isoSceneGraph && typeof obj.isoSceneGraph === "object") return obj.isoSceneGraph;
      if (obj.scene && typeof obj.scene === "object") return obj.scene;
      if (obj.data && typeof obj.data === "object") return obj.data;
    }
  }
  return val;
}, SemanticIsoSceneRawSchema);

export const IsoSceneGraphSchema = SemanticIsoSceneSchema;
export const FreeformIsoAnatomySceneSchema = SemanticIsoSceneSchema;

export type ShapeSpec = z.infer<typeof ShapeSpecSchema>;
export type PartAnimation3D = z.infer<typeof PartAnimation3DSchema>;
export type PartPhaseState = z.infer<typeof PartPhaseStateSchema>;
export type SemanticIsoPart = z.infer<typeof SemanticIsoPartSchema>;
export type SemanticIsoScene = z.infer<typeof SemanticIsoSceneSchema>;
export type IsoSceneGraph = SemanticIsoScene;
export type IsoVectorPart = SemanticIsoPart; // Alias for backward compatibility
export type SvgAnimationTransform = PartAnimation3D;

export const CameraZoomKeyframeSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  x: z.number().min(-450).max(450).catch(0),
  y: z.number().min(-550).max(550).catch(0),
  scale: z.number().min(0.9).max(2.4).catch(1.0),
});

export const FramePillCalloutSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  text: z.string(),
  direction: z.enum(["LEFT", "RIGHT"]),
  /**
   * 2D screen anchor automatically projected from the 3D part center via projectIso3D()
   */
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
  visualScene: IsoSceneGraphSchema,
  phases: z.array(PhaseTimelineBlockSchema).length(4),
  pillCallouts: z.array(FramePillCalloutSchema),
  sfxOverlays: z.array(FrameSfxOverlaySchema),
  sfxTriggers: z.array(AudioSfxTriggerSchema).default([]),
});

export type RemotionCompositionProps = z.infer<typeof RemotionCompositionPropsSchema>;
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
