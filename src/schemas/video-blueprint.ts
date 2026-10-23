import { z } from "zod";

export const PhaseTypeSchema = z.enum([
  "EVERYDAY_CONTRAST_HOOK",
  "CORE_MECHANISM_CUTAWAY",
  "COMPONENT_ZOOM_INS",
  "PRACTICAL_TAKEAWAY_LOOP",
]);

export type PhaseType = z.infer<typeof PhaseTypeSchema>;

export const Vec3TupleSchema = z
  .tuple([z.coerce.number().catch(0), z.coerce.number().catch(0), z.coerce.number().catch(0)])
  .catch([0, 0, 0]);

export const SubjectArchetypeSchema = z
  .enum([
    "AERODYNAMIC_DRONE",       // Quadcopters, UAVs, fixed-wing planes, rockets
    "ROTARY_PNEUMATIC_ENGINE", // AC compressors, combustion engines, pistons, pumps, turbines
    "ELECTROCHEMICAL_BATTERY", // Lithium batteries, powerbanks, energy storage cells
    "ELECTRONIC_COMPUTING",    // Servers, motherboards, CPUs, chips, cloud infrastructure
    "PHOTOVOLTAIC_ENERGY",     // Solar panels, photovoltaic cells, inverters
    "ANATOMICAL_ORGAN",        // Human body, heart, kidney, eyes, lungs, biology
    "UNIVERSAL_CUTAWAY",       // General tools, household appliances, industrial machines
  ])
  .catch("UNIVERSAL_CUTAWAY");

export type SubjectArchetype = z.infer<typeof SubjectArchetypeSchema>;

export const ThreeGeometryTypeSchema = z
  .enum([
    "gltf-asset",       // Loads .glb/.gltf model from /public/assets/models/ or URL
    "hollow-cylinder",  // Smooth 3D vessel/housing with configurable arcAngleDeg (e.g., 270° cutaway)
    "cylinder",         // Solid 3D cylinder / shaft / disk / core
    "sphere",           // 3D sphere / dome / organic bulb (supports phiLength cutaway)
    "box",              // 3D cuboid / plate / block / chassis
    "hollow-box",       // 3D cutaway box / chassis / housing with open side or cutaway
    "torus",            // 3D ring / seal / coil / tire / valve seat
    "cone",             // 3D nozzle / funnel / tip / beam
    "capsule",          // 3D tank / biological cell / chamber
    "lathe",            // Custom 2D profile points [r, y] revolved in 3D (bottles, bells, contours)
    "tube",             // 3D curved pipe / channel / wire / vessel along 3D spline path
    "radial-array",     // Repeated 3D sub-elements (turbine blades, fan blades, stator coils, gears)
    "drone-assembly",   // Complete 3D drone quadcopter with 4 arms, motors, spinning rotors & cutaway fuselage
    "battery-assembly", // Complete 3D cutaway battery pack with internal cells, busbars, BMS board & terminals
    "piston-assembly",  // Complete 3D cutaway engine/compressor cylinder with reciprocating piston, rod & valves
    "turbine-assembly", // Complete 3D cutaway jet/turbine nacelle with spinning front fan, shaft & compressor discs
    "circuit-board",    // Complete 3D electronic PCB with central chip, micro-components, capacitors & bus traces
    "solar-assembly",   // Complete 3D photovoltaic solar panel with aluminum frame & silicon cell grid
  ])
  .catch("cylinder");

export const ThreeMaterialTypeSchema = z
  .enum(["toon", "standard-matte", "metallic", "glass-translucent", "emissive-glow", "liquid"])
  .catch("toon");

export const ThreeAnimationSchema = z.object({
  type: z
    .enum(["none", "rotate", "oscillate-position", "pulse-scale", "explode", "fluid-level"])
    .catch("none"),
  axis: z.enum(["x", "y", "z"]).catch("y"),
  speed: z.coerce.number().catch(1.0),
  amplitude: z.coerce.number().catch(0.25),
  activeInPhases: z.array(z.coerce.number().int()).default([0, 1, 2, 3]),
});

/**
 * 1. AGENT 1 OUTPUT: Deconstructor (`deconstructor.worker.ts`)
 */
export const DeconstructedComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1), // Max 2-3 words in layman Indonesian
  anatomicalLayer: z
    .enum(["OUTER_CUTAWAY_SHELL", "INTERNAL_CHAMBER", "CORE_MECHANISM", "ZOOM_SUBPART"])
    .catch("CORE_MECHANISM"),
  everydayRole: z.string().min(1),
  simpleCauseEffect: z.string().min(1),
  fillColor: z.string().catch("#E2E8F0"),
  position3D: Vec3TupleSchema,
  recommendedGeometryType: ThreeGeometryTypeSchema.optional(),
  zoomTarget: z.object({
    focusPosition3D: Vec3TupleSchema,
    zoomMultiplier: z.coerce.number().min(1).max(2.4).catch(1.6),
  }),
});

export const DeconstructedPhaseSchema = z.object({
  phaseIndex: z.number().int().min(0).max(3),
  phaseType: PhaseTypeSchema,
  title: z.string().min(1),
  everydayContrastOrHook: z.string().min(1),
  simpleExplanation: z.string().min(1),
  targetDurationSeconds: z.coerce.number().min(5).max(16).catch(8),
  focusComponentIds: z.array(z.string()),
});

export const DeconstructionBlueprintSchema = z.object({
  topic: z.string().min(1),
  suggestedArchetype: SubjectArchetypeSchema.default("UNIVERSAL_CUTAWAY"),
  laymanHookTitle: z.string().min(1),
  everydayCategory: z.string().min(1),
  coreSimpleTruth: z.string().min(1),
  baselineMetricValue: z.coerce.number().catch(0),
  peakMetricValue: z.coerce.number().catch(100),
  metricUnit: z.string(),
  practicalChecklistTitle: z.string().catch("CEK SEBELUM BELI / PAKAI:"),
  practicalChecklistItems: z.array(z.string()).min(3).max(3),
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
  text: z.string(), // Max 2-3 words directly naming the specific component with arrow, e.g. "Bilah Rotor →" or "← Sel Katoda"
  direction: z.enum(["LEFT", "RIGHT"]).catch("RIGHT"),
  relativeTriggerRatio: z.coerce.number().min(0.05).max(0.85).catch(0.15),
  durationSeconds: z.coerce.number().min(1.5).max(8).catch(4.0),
});

export const SfxCueSchema = z.object({
  text: z.string(), // e.g., "PSSST!", "TERKUNCI", "BERJAM-JAM"
  variant: z
    .enum(["STEAM_YELLOW_BLUE", "RED_STAMP", "FADED_BG", "GREEN_POP"])
    .catch("STEAM_YELLOW_BLUE"),
  soundEffectFile: z
    .enum(["steam-hiss.mp3", "pop-lock.mp3", "bubble.mp3"])
    .catch("pop-lock.mp3"),
  x: z.coerce.number().catch(680),
  y: z.coerce.number().catch(640),
  rotateDeg: z.coerce.number().catch(-8),
  relativeTriggerRatio: z.coerce.number().min(0.05).max(0.9).catch(0.3),
});

export const ScriptSegmentSchema = z.object({
  segmentIndex: z.number().int().min(0).max(3),
  phaseType: PhaseTypeSchema,
  chapterTitle: z.string().min(3), // Supports <highlight>word</highlight> for coral red text
  narrationText: z.string().min(90, "narrationText must be at least 18 spoken words (~90 chars) to hit 8+ seconds of TTS audio"),
  primaryMetric: z.object({
    startValue: z.coerce.number().catch(0),
    endValue: z.coerce.number().catch(100),
    unit: z.string(),
    decimals: z.coerce.number().int().min(0).max(2).catch(1),
    isHighActive: z.boolean().catch(false),
    baselineValue: z.coerce.number().catch(0),
    peakValue: z.coerce.number().catch(100),
    sparklinePoints: z.array(z.coerce.number()).min(2).catch([0, 20, 60, 100]),
  }),
  statusBadge: z.object({
    text: z.string(),
    variant: z.enum(["green", "red", "amber"]).catch("green"),
  }),
  secondaryMetric: z.string(),
  pillLabels: z.array(PillLabelItemSchema).min(1).max(2),
  sfxCue: SfxCueSchema.optional().nullable(),
  showChecklistCard: z.boolean().catch(false),
});

export const ScriptArchitectOutputSchema = z.object({
  topic: z.string(),
  totalSegments: z.number().int().catch(4),
  fullNarrationIndonesian: z.string(),
  practicalChecklist: z.object({
    title: z.string().catch("CEK SEBELUM BELI / PAKAI:"),
    items: z.array(z.string()).min(3).max(3),
  }),
  segments: z.array(ScriptSegmentSchema).length(4),
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

/**
 * 4. AGENT 4 OUTPUT: Three.js 3D Cutaway Scene Graph (`visual.worker.ts`)
 */
export const ThreeGeometryArgsSchema = z.object({
  radiusTop: z.coerce.number().optional(),
  radiusBottom: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  wallThickness: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  depth: z.coerce.number().optional(),
  tubeRadius: z.coerce.number().optional(),
  arcAngleDeg: z.coerce.number().min(90).max(360).optional(), // 270 = 90-degree front cutaway
  radialCount: z.coerce.number().int().min(2).max(32).optional(),
  lathePoints: z.array(z.tuple([z.coerce.number(), z.coerce.number()])).optional(), // [radius, y]
  tubePath: z.array(Vec3TupleSchema).optional(),
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  bladeLength: z.coerce.number().optional(),
  bladeWidth: z.coerce.number().optional(),
  pitchDeg: z.coerce.number().optional(),
});

export const ThreeNodeSchema = z.object({
  nodeId: z.string(),
  componentId: z.string(),
  name: z.string(),
  geometryType: ThreeGeometryTypeSchema,
  assetUrl: z.string().optional(), // Optional .glb/.gltf path from /assets/models/
  position: Vec3TupleSchema,
  rotation: Vec3TupleSchema,
  scale: z.tuple([z.coerce.number().catch(1), z.coerce.number().catch(1), z.coerce.number().catch(1)]).catch([1, 1, 1]),
  color: z.string().catch("#E2E8F0"),
  materialType: ThreeMaterialTypeSchema,
  opacity: z.coerce.number().min(0).max(1).catch(1),
  enableCutawayClip: z.boolean().catch(false),
  showEdgesOutline: z.boolean().catch(true),
  geometryArgs: ThreeGeometryArgsSchema.default({}),
  animation: ThreeAnimationSchema.default({
    type: "none",
    axis: "y",
    speed: 1,
    amplitude: 0.25,
    activeInPhases: [0, 1, 2, 3],
  }),
});

export const IsoSceneGraphRawSchema = z.object({
  subjectTitle: z.string().catch("3D CUTAWAY SCENE"),
  objectFormFactor: z.string().catch("Cutaway Assembly"),
  anatomyDecomposition: z
    .object({
      outerHousingShell: z.string().catch("Outer Shell"),
      primaryInternalMechanism: z.string().catch("Internal Mechanism"),
      zoomInSubComponents: z.string().catch("Sub-components"),
      physicalStateChange: z.string().catch("Physical State Change"),
    })
    .default({
      outerHousingShell: "Outer Shell",
      primaryInternalMechanism: "Internal Mechanism",
      zoomInSubComponents: "Sub-components",
      physicalStateChange: "Physical State Change",
    }),
  cameraPreset: z
    .object({
      basePosition: Vec3TupleSchema.default([8, 6.5, 8]),
      baseZoom: z.number().default(170),
    })
    .default({ basePosition: [8, 6.5, 8], baseZoom: 170 }),
  enableSteamWisps: z.boolean().catch(false), // Subtle rising SVG steam lines ONLY when boiling/steaming
  nodes: z.array(ThreeNodeSchema).default([]),
});

export const IsoSceneGraphSchema = z.preprocess((val) => {
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    if (!obj.nodes && Array.isArray((obj as any).parts)) {
      return {
        ...obj,
        nodes: (obj as any).parts.map((p: any, idx: number) => ({
          nodeId: p.partId || `node_${idx}`,
          componentId: p.componentId || `comp_${idx + 1}`,
          name: p.name || `Component ${idx + 1}`,
          geometryType: "cylinder",
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
          color: "#E2E8F0",
          materialType: "toon",
          opacity: 1,
          enableCutawayClip: false,
          showEdgesOutline: true,
          geometryArgs: {},
          animation: {
            type: "none",
            axis: "y",
            speed: 1,
            amplitude: 0.25,
            activeInPhases: [0, 1, 2, 3],
          },
        })),
      };
    }
  }
  return val;
}, IsoSceneGraphRawSchema);

export type IsoSceneGraph = z.infer<typeof IsoSceneGraphSchema>;
export type ThreeNode = z.infer<typeof ThreeNodeSchema>;

export const CameraZoomKeyframeSchema = z.object({
  startFrame: z.number().int().nonnegative(),
  endFrame: z.number().int().positive(),
  focusTarget3D: Vec3TupleSchema.default([0, 0, 0]),
  x: z.number().catch(0),
  y: z.number().catch(0),
  scale: z.number().min(0.9).max(2.4).catch(1.0),
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