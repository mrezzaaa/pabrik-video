import { z } from "zod";

export const CameraShotEnum = z.preprocess((val) => {
  const str = String(val).toUpperCase();
  if (str.includes("XRAY") || str.includes("SCAN")) return "XRAY_WIREFRAME_SCAN";
  if (str.includes("BLUEPRINT") || str.includes("CALLOUT")) return "BLUEPRINT_CAD_CALLOUT";
  if (str.includes("TILT")) return "3D_TILT_CARD";
  if (str.includes("PAN")) return "PAN_LEFT_TO_RIGHT";
  if (str.includes("OUT")) return "KEN_BURNS_ZOOM_OUT";
  if (str.includes("PARALLAX") || str.includes("DEPTH")) return "PARALLAX_DEPTH";
  return "XRAY_WIREFRAME_SCAN";
}, z.enum([
  "XRAY_WIREFRAME_SCAN",
  "BLUEPRINT_CAD_CALLOUT",
  "3D_TILT_CARD",
  "KEN_BURNS_ZOOM_IN",
  "KEN_BURNS_ZOOM_OUT",
  "PAN_LEFT_TO_RIGHT",
  "PARALLAX_DEPTH",
]));

export type CameraShot = z.infer<typeof CameraShotEnum>;

export const GraphicOverlayTypeEnum = z.enum([
  "NONE",
  "STAT_COUNTER",
  "COMPARISON_BADGE",
  "BULLET_HIGHLIGHT",
  "WARNING_BANNER",
]);

export type GraphicOverlayType = z.infer<typeof GraphicOverlayTypeEnum>;

export const TransitionTypeEnum = z.preprocess((val) => {
  const str = String(val).toUpperCase();
  if (str.includes("FLASH")) return "FLASH_CUT";
  if (str.includes("WHIP") || str.includes("PAN")) return "WHIP_PAN";
  if (str.includes("GLITCH")) return "GLITCH_CUT";
  return "HARD_CUT";
}, z.enum([
  "HARD_CUT",
  "FLASH_CUT",
  "WHIP_PAN",
  "GLITCH_CUT",
]));

export type TransitionType = z.infer<typeof TransitionTypeEnum>;

export const SourceTypeEnum = z.preprocess((val) => {
  const str = String(val).toUpperCase();
  if (str.includes("PEXELS") || str.includes("VIDEO")) return "PEXELS_VIDEO";
  return "SEARXNG_IMAGE";
}, z.enum(["SEARXNG_IMAGE", "PEXELS_VIDEO"]));

export type SourceType = z.infer<typeof SourceTypeEnum>;

export const GraphicOverlaySchema = z.object({
  type: GraphicOverlayTypeEnum,
  value: z.string().optional(),
  label: z.string().optional(),
  iconName: z.string().optional(),
});

export type GraphicOverlay = z.infer<typeof GraphicOverlaySchema>;

export const CalloutSchema = z.object({
  label: z.string(),
  detail: z.string(),
  x: z.number().min(0).max(100).default(50),
  y: z.number().min(0).max(100).default(50),
});

export type Callout = z.infer<typeof CalloutSchema>;

export const MainVisualSchema = z.object({
  sourceType: SourceTypeEnum.default("SEARXNG_IMAGE"),
  searchQuery: z.string().default("technology"),
  cameraShot: CameraShotEnum,
  overlayHeadline: z.string().max(40).default("OVERVIEW"),
  callouts: z.array(CalloutSchema).default([]),
  localAssetUrl: z.string().optional(),
});

export type MainVisual = z.infer<typeof MainVisualSchema>;

export const CutawaySchema = z.object({
  enabled: z.boolean().default(true),
  triggerAtProgress: z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) || num < 0.1 || num > 0.9 ? 0.5 : num;
  }, z.number().default(0.5)),
  sourceType: SourceTypeEnum.default("SEARXNG_IMAGE"),
  searchQuery: z.string().default("action b-roll"),
  cameraShot: CameraShotEnum.default("KEN_BURNS_ZOOM_IN"),
  graphicOverlay: GraphicOverlaySchema.optional(),
  localAssetUrl: z.string().optional(),
});

export type Cutaway = z.infer<typeof CutawaySchema>;

export const WordTimestampSchema = z.object({
  word: z.string(),
  startMs: z.number(),
  endMs: z.number(),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

export const ChartTypeEnum = z.preprocess((val) => {
  const str = String(val).toUpperCase();
  if (str.includes("BAR")) return "BAR_SURGE";
  if (str.includes("GAUGE") || str.includes("METER")) return "GAUGE_METER";
  return "LINE_SPIKE";
}, z.enum(["LINE_SPIKE", "BAR_SURGE", "GAUGE_METER"]));

export type ChartType = z.infer<typeof ChartTypeEnum>;

export const TelemetrySchema = z.object({
  objectName: z.string().default("KOMPONEN UTAMA"),
  categoryTag: z.string().default("SUBSYS // CORE_TELEMETRY"),
  label: z.string().default("PARAMETER TERUKUR"),
  startValue: z.number().default(0),
  endValue: z.number().default(100),
  unit: z.string().default(""),
  trendLabel: z.string().default("● NOMINAL"),
  chartType: ChartTypeEnum.default("LINE_SPIKE"),
  dataPoints: z.array(z.number()).default([20, 35, 50, 65, 80, 100]),
});

export type TelemetryData = z.infer<typeof TelemetrySchema>;

export const StoryboardSceneSchema = z.object({
  sceneId: z.number(),
  narration: z.string(),
  telemetry: TelemetrySchema.optional(),
  mainVisual: MainVisualSchema,
  cutaway: CutawaySchema,
  transitionToNext: TransitionTypeEnum.default("FLASH_CUT"),
  // Computed runtime fields
  audioUrl: z.string().optional(),
  durationMs: z.number().optional(),
  durationInFrames: z.number().optional(),
  wordTimestamps: z.array(WordTimestampSchema).optional(),
});

export type StoryboardScene = z.infer<typeof StoryboardSceneSchema>;

export const StoryboardSchema = z.object({
  videoTitle: z.string(),
  themeColor: z.string().default("#38BDF8"),
  scenes: z.array(StoryboardSceneSchema).min(6, "Storyboard must have at least 6 to 10 scenes to meet 30-60 second target duration"),
});

export type Storyboard = z.infer<typeof StoryboardSchema>;

export const VideoPropsSchema = z.object({
  videoTitle: z.string(),
  themeColor: z.string(),
  totalDurationInFrames: z.number(),
  fps: z.number().default(30),
  width: z.number().default(1080),
  height: z.number().default(1920),
  scenes: z.array(StoryboardSceneSchema),
});

export type VideoProps = z.infer<typeof VideoPropsSchema>;
