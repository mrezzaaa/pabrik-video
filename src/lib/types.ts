import { z } from "zod";

export const CameraShotEnum = z.preprocess((val) => {
  const str = String(val).toUpperCase();
  if (str.includes("TILT")) return "3D_TILT_CARD";
  if (str.includes("PAN")) return "PAN_LEFT_TO_RIGHT";
  if (str.includes("OUT")) return "KEN_BURNS_ZOOM_OUT";
  if (str.includes("PARALLAX") || str.includes("DEPTH")) return "PARALLAX_DEPTH";
  return "KEN_BURNS_ZOOM_IN";
}, z.enum([
  "KEN_BURNS_ZOOM_IN",
  "KEN_BURNS_ZOOM_OUT",
  "PAN_LEFT_TO_RIGHT",
  "3D_TILT_CARD",
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

export const TransitionTypeEnum = z.enum([
  "HARD_CUT",
  "FLASH_CUT",
  "WHIP_PAN",
  "GLITCH_CUT",
]);

export type TransitionType = z.infer<typeof TransitionTypeEnum>;

export const SourceTypeEnum = z.enum(["SEARXNG_IMAGE", "PEXELS_VIDEO"]);
export type SourceType = z.infer<typeof SourceTypeEnum>;

export const GraphicOverlaySchema = z.object({
  type: GraphicOverlayTypeEnum,
  value: z.string().optional(),
  label: z.string().optional(),
  iconName: z.string().optional(),
});

export type GraphicOverlay = z.infer<typeof GraphicOverlaySchema>;

export const MainVisualSchema = z.object({
  sourceType: SourceTypeEnum.default("SEARXNG_IMAGE"),
  searchQuery: z.string(),
  cameraShot: CameraShotEnum,
  overlayHeadline: z.string().max(30),
  localAssetUrl: z.string().optional(),
});

export type MainVisual = z.infer<typeof MainVisualSchema>;

export const CutawaySchema = z.object({
  enabled: z.boolean().default(true),
  triggerAtProgress: z.number().min(0.2).max(0.8).default(0.5),
  sourceType: SourceTypeEnum.default("SEARXNG_IMAGE"),
  searchQuery: z.string(),
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

export const StoryboardSceneSchema = z.object({
  sceneId: z.number(),
  narration: z.string(),
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
  scenes: z.array(StoryboardSceneSchema).min(1),
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
