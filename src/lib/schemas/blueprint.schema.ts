import { z } from "zod";

/**
 * UNIVERSAL X-RAY HOLOGRAM BLUEPRINT CONTRACT
 * ---------------------------------------------------------------------------
 * No topic enums. Every field is free text or a rendering primitive, so any
 * topic ("jalan tol", "turbo", "laptop", "kecap", "cat landing", ...) can be
 * deconstructed without ever failing an enum validation.
 *
 * Hard rules encoded here:
 * - geometryType is limited to the primitives the Three.js factory can draw.
 * - style is limited to the x-ray / wireframe material kit.
 * - camera + explode + duration values are clamped (LLM cannot go wild).
 * - unknown / missing values fall back instead of throwing.
 */

/* -------------------------------------------------------------------------- */
/* Enums that the renderer actually understands                                */
/* -------------------------------------------------------------------------- */

export const ThreeGeometryType = z.enum([
  "cylinder",
  "box",
  "sphere",
  "torus",
  "cone",
  "plane",
  "fan",
  "road",
  "pillar",
  "quad",
]);

export type ThreeGeometryTypeValue = z.infer<typeof ThreeGeometryType>;

export const VisualStyle = z.enum([
  "xray-blue",
  "xray-blue-dark",
  "xray-blue-light",
  "xray-orange",
  "wireframe-green",
  "wireframe-blue",
]);

export type VisualStyleValue = z.infer<typeof VisualStyle>;

export const ShotTypeSchema = z.enum([
  "WIDE",
  "MEDIUM",
  "CLOSE",
  "MACRO",
  "XRAY_SIDE",
]);

export const BehaviorTypeSchema = z.enum([
  "static",
  "rotate",
  "explode",
  "cutaway",
]);

export const AssemblyCategorySchema = z.enum([
  "shell",
  "core",
  "rotor",
  "structure",
  "thermal",
  "electronics",
]);

export const ParametricPrimitiveTypeSchema = z.enum([
  "box_housing",
  "battery_pack_grid",
  "cylinder_motor_stator",
  "wheel_axle_assembly",
  "turbine_rotor_stage",
  "contoured_shell_body",
  "structural_frame_chassis",
  "pcb_stack_module",
  "high_voltage_cables",
  "stratified_layer_slab",
]);

/* -------------------------------------------------------------------------- */
/* Small numeric helpers (clamp instead of reject)                             */
/* -------------------------------------------------------------------------- */

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** A finite number that clamps into [min, max] and never throws. */
function clamped(min: number, max: number, fallback: number) {
  return z
    .number()
    .catch(fallback)
    .transform((v) => clampNumber(Number.isFinite(v) ? v : fallback, min, max));
}

/* -------------------------------------------------------------------------- */
/* Subject archetype (free text, NOT an enum)                                  */
/* -------------------------------------------------------------------------- */

export const SubjectArchetypeSchema = z
  .string()
  .default("UNIVERSAL_CUTAWAY")
  .describe(
    "Free text archetype like TOLL_ROAD, TURBOCHARGER, LAPTOP_XRAY, JET_TURBOFAN, CAR_XRAY, F16_HOLOGRAM, TUMBLER_VACUUM, etc - any topic"
  );

/* -------------------------------------------------------------------------- */
/* Components: the universal Lego bricks                                       */
/* -------------------------------------------------------------------------- */

/**
 * Isometric scene units (the camera rig sits ~9 units away). Values outside
 * [-24, 24] would put a component outside the frame, so they are clamped.
 */
export const Position3DSchema = z
  .array(z.number())
  .length(3)
  .catch([0, 0, 0])
  .transform(
    (arr) =>
      arr.map((v) => clampNumber(Number.isFinite(v) ? v : 0, -24, 24)) as [
        number,
        number,
        number
      ]
  );

export const Rotation3DSchema = z
  .array(z.number())
  .length(3)
  .transform(
    (arr) =>
      arr.map((v) => clampNumber(Number.isFinite(v) ? v : 0, -Math.PI * 2, Math.PI * 2)) as [
        number,
        number,
        number
      ]
  );

export const BlueprintComponentSchema = z.object({
  id: z.string().min(1).describe("Stable UPPER_SNAKE id, e.g. ROAD, PILLAR_1, TURBINE"),
  name: z.string().optional(),
  geometryType: ThreeGeometryType
    .catch("box")
    .default("box")
    .describe("One of the universal primitives"),
  params: z.record(z.string(), z.any()).default({}),
  style: VisualStyle.catch("xray-blue").default("xray-blue"),
  position3D: Position3DSchema.default([0, 0, 0]),
  rotation3D: Rotation3DSchema.optional().catch(undefined),
  behavior: BehaviorTypeSchema.catch("static").default("static"),
  axis: z.enum(["x", "y", "z"]).optional().catch(undefined),
});

/* -------------------------------------------------------------------------- */
/* Phase contract                                                              */
/* -------------------------------------------------------------------------- */

export const TelemetryChannelSchema = z.object({
  name: z.string().min(1).catch("METRIC"),
  value: z.union([z.string(), z.number()]).catch("-"),
  unit: z.string().optional().catch(""),
  startValue: z.union([z.string(), z.number()]).optional().catch(undefined),
  endValue: z.union([z.string(), z.number()]).optional().catch(undefined),
});

export const CameraDirectionSchema = z
  .object({
    shotType: ShotTypeSchema.catch("MEDIUM").default("MEDIUM"),
    focusComponentIds: z.array(z.string()).default([]),
    // Spec: 1.0 - 2.4
    zoomMultiplier: clamped(1.0, 2.4, 1.0),
    // Spec: 0 - 1
    explodeFactor: clamped(0.0, 1.0, 0.0),
  })
  .default({
    shotType: "MEDIUM",
    focusComponentIds: [],
    zoomMultiplier: 1.0,
    explodeFactor: 0.0,
  });

export const ObjectStateSchema = z
  .object({
    visibleComponentIds: z.array(z.string()).default([]),
    exploded: z.boolean().default(false),
    cutawayEnabled: z.boolean().default(false),
  })
  .default({
    visibleComponentIds: [],
    exploded: false,
    cutawayEnabled: false,
  });

export const BlueprintPhaseSchema = z.object({
  phaseId: z.union([z.number(), z.string()]),
  title: z
    .string()
    .min(1)
    .describe("Judul spesifik per topik, BUKAN generic"),
  label: z.string().optional(),
  duration: clamped(3, 9, 5),
  activeStationCode: z.string().optional(),
  activeComponentIds: z.array(z.string()).default([]),
  cameraDirection: CameraDirectionSchema,
  objectState: ObjectStateSchema,
  telemetryChannels: z.array(TelemetryChannelSchema).default([]),
});

/* -------------------------------------------------------------------------- */
/* CAD composable assemblies (optional, used by the cutaway renderer)          */
/* -------------------------------------------------------------------------- */

export const CustomAssemblySchema = z.object({
  id: z.string(),
  label: z.string(),
  stationCode: z.string(),
  category: AssemblyCategorySchema,
  metrics: z.string().optional(),
  explodeOffset: z.array(z.number()).length(3).optional(),
});

export const ComposableAssemblySchema = z.object({
  id: z.string(),
  stationCode: z.string().default("STA-01"),
  label: z.string(),
  metrics: z.string().optional().default(""),
  category: AssemblyCategorySchema.catch("core").default("core"),
  primitiveType: ParametricPrimitiveTypeSchema,
  dimensions: z.array(z.number()).length(3).optional().catch(undefined),
  basePosition: z.array(z.number()).length(3).default([0, 0, 0]),
  baseRotation: z.array(z.number()).length(3).optional().catch(undefined),
  explodeOffset: z.array(z.number()).length(3).default([0, 0, 0]),
  rotationAxis: z.enum(["x", "y", "z"]).optional().catch(undefined),
  rotationSpeed: z.number().optional().catch(undefined),
  bladeOrCellCount: z.number().optional().catch(undefined),
  isShell: z.boolean().optional(),
});

/* -------------------------------------------------------------------------- */
/* Root blueprint                                                              */
/* -------------------------------------------------------------------------- */

export const BlueprintSchema = z.object({
  videoTitle: z.string().min(1).catch("ANALISIS TEKNIS"),
  subtitle: z.string().optional().catch(""),
  subjectArchetype: SubjectArchetypeSchema,
  cadArchetype: z.string().optional().catch(undefined),
  visualStyle: z.string().default("blueprint"),
  params: z.record(z.string(), z.any()).default({}),
  components: z.array(BlueprintComponentSchema).default([]),
  assemblies: z.array(ComposableAssemblySchema).optional().catch(undefined),
  parts: z.array(ComposableAssemblySchema).optional().catch(undefined),
  customAssemblies: z.array(CustomAssemblySchema).optional().catch(undefined),
  phases: z.array(BlueprintPhaseSchema).min(3),
});

export type BlueprintComponentInput = z.input<typeof BlueprintComponentSchema>;
export type BlueprintPhaseInput = z.input<typeof BlueprintPhaseSchema>;
export type BlueprintOutput = z.infer<typeof BlueprintSchema>;

/* -------------------------------------------------------------------------- */
/* Content guards shared by deconstructor + scriptwriter                       */
/* -------------------------------------------------------------------------- */

/** Titles that must never survive: either camera jargon or the old hardcode. */
export const FORBIDDEN_PHASE_TITLES = [
  "solusi vakum",
  "peran lapisan",
  "segel silikon",
  "potongan melintang",
  "tampilan meledak",
  "sintesis keseluruhan",
  "mari kita lihat blueprint",
  "geometri & struktur primer",
  "arsitektur komponen internal",
  "dekomposisi subsistem penggerak",
  "animasi ini",
] as const;

export function isForbiddenPhaseTitle(title: string): boolean {
  const t = String(title || "")
    .trim()
    .toLowerCase();
  if (!t) return true;
  if (/^fase\s*\d+$/i.test(t)) return true;
  if (/^phase\s*\d+$/i.test(t)) return true;
  return FORBIDDEN_PHASE_TITLES.some((bad) => t === bad || t.includes(bad));
}
