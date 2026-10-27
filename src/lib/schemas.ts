import { z } from "zod";
import { GRADIENT_PALETTES } from "./viral";

const looseNumber = z
  .union([z.number(), z.string()])
  .transform((value) => {
    const parsed = typeof value === "number" ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  });

export const researchSchema = z.object({
  facts: z.array(z.string()).default([]),
  sources: z
    .array(
      z.object({
        title: z.string().default("Sumber"),
        url: z.string().default(""),
      }),
    )
    .default([]),
  uniqueAngles: z.array(z.string()).default([]),
  viralPotential: z.string().default(""),
  controversy: z.string().optional().default(""),
  numbers: z.array(z.string()).optional().default([]),
});

export const scriptSentenceSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1),
  emphasisWords: z.array(z.string()).optional().default([]),
  emotion: z
    .enum(["shocking", "curious", "excited"])
    .optional()
    .default("curious"),
});

export const scriptSchema = z.object({
  hook: z.string().min(1),
  script: z.string().min(1),
  sentences: z.array(scriptSentenceSchema).min(2),
  durationEstimate: looseNumber.optional().default(38),
});

export const motionSchema = z.enum([
  "zoomIn",
  "zoomOut",
  "shake",
  "pan",
  "panLeft",
]);
export const textAnimationSchema = z.enum(["karaoke", "popIn", "typewriter"]);
export const sceneThemeSchema = z.enum(["danger", "warn", "info", "success"]);
export const visualTypeSchema = z.enum([
  "B_ROLL_IMAGE",
  "SVG_GAUGE",
  "SVG_BAR_CHART",
  "SVG_COUNTER",
  "SVG_WAVEFORM",
  "SVG_STAMP",
  "SVG_COMPARE",
  "SVG_CROSSSECTION",
  "SVG_TIMELINE",
]);
export const imageStyleSchema = z.enum(["fullBleed", "split", "glass"]);

export const sceneMetricSchema = z.object({
  value: looseNumber,
  suffix: z.string().optional().default(""),
  label: z.string().optional().default(""),
});

export const sceneCounterSchema = z.object({
  from: looseNumber.optional().default(0),
  to: looseNumber.optional().default(0),
  suffix: z.string().optional().default(""),
  label: z.string().optional().default(""),
});

export const sceneRangeSchema = z.object({
  from: looseNumber.optional().default(0),
  to: looseNumber.optional().default(0),
  min: looseNumber.optional().default(0),
  max: looseNumber.optional().default(0),
  unit: z.string().optional().default(""),
  label: z.string().optional().default(""),
});

export const sceneBarSchema = z.object({
  label: z.string().optional().default(""),
  value: looseNumber.optional().default(0),
  unit: z.string().optional().default(""),
  highlight: z.boolean().optional().default(false),
});

export const sceneWaveSchema = z.object({
  label: z.string().optional().default(""),
  dip: looseNumber.optional().default(0.55),
});

// Longgar di sini; divalidasi ketat oleh lib/visual-spec.ts (label 1-2 kata,
// harus ada di narasi/riset) supaya satu field rusak tidak menggagalkan plan.
export const sceneStampSchema = z.object({
  word: z.string().optional().default(""),
});

const compareSideSchema = z.object({
  title: z.string().optional().default(""),
  items: z.array(z.string()).optional().default([]),
});

export const sceneCompareSchema = z.object({
  left: compareSideSchema.optional(),
  right: compareSideSchema.optional(),
});

export const sceneLabelSchema = z.object({
  label: z.string().optional().default(""),
});

export const visualSceneSchema = z.object({
  id: z.string().optional(),
  startTime: looseNumber,
  endTime: looseNumber,
  duration: looseNumber.optional(),
  background: z
    .object({
      type: z.enum(["gradient", "solid", "video"]).default("gradient"),
      value: z.string().default(GRADIENT_PALETTES[0]),
      fallback: z.string().optional(),
      videoUrl: z.string().optional(),
    })
    .default({ type: "gradient", value: GRADIENT_PALETTES[0] }),
  motion: z
    .object({
      type: motionSchema.default("zoomIn"),
      intensity: looseNumber.default(0.2),
    })
    .default({ type: "zoomIn", intensity: 0.2 }),
  kenBurns: z.boolean().optional().default(true),
  textAnimation: z
    .object({
      type: textAnimationSchema.default("karaoke"),
    })
    .default({ type: "karaoke" }),
  visualType: visualTypeSchema.optional(),
  imageSearchQuery: z.string().optional().default(""),
  imageStyle: imageStyleSchema.optional(),
  stageLabel: z.string().optional().default(""),
  metric: sceneMetricSchema.optional(),
  counter: sceneCounterSchema.optional(),
  range: sceneRangeSchema.optional(),
  bars: z.array(sceneBarSchema).optional().default([]),
  wave: sceneWaveSchema.optional(),
  stamp: sceneStampSchema.optional(),
  compare: sceneCompareSchema.optional(),
  layers: z.array(sceneLabelSchema).optional().default([]),
  steps: z.array(sceneLabelSchema).optional().default([]),
  theme: sceneThemeSchema.optional(),
  accentColor: z.string().default("#39FF14"),
});

export const visualPlanSchema = z.object({
  vibe: z.string().optional().default(""),
  scenes: z.array(visualSceneSchema).min(1),
});

export type ResearchOutput = z.infer<typeof researchSchema>;
export type ScriptOutput = z.infer<typeof scriptSchema>;
export type VisualPlanOutput = z.infer<typeof visualPlanSchema>;
