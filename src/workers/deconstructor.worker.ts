import { omniroute, resolveContentModel } from "../lib/omniroute";
import { VideoBlueprint } from "../lib/scene/types";
import { resolveCADArchetype } from "../lib/cad/router";
import {
  BlueprintSchema,
  BlueprintComponentSchema,
  BlueprintPhaseSchema,
  ComposableAssemblySchema,
  CustomAssemblySchema,
  SubjectArchetypeSchema,
  ThreeGeometryType,
  VisualStyle,
  BehaviorTypeSchema,
  ParametricPrimitiveTypeSchema,
  AssemblyCategorySchema,
  isForbiddenPhaseTitle,
  type ThreeGeometryTypeValue,
  type VisualStyleValue,
} from "../lib/schemas/blueprint.schema";

/**
 * Backward-compatible re-exports (schema lives in lib/schemas/blueprint.schema.ts)
 */
export {
  SubjectArchetypeSchema,
  BlueprintSchema,
  BlueprintComponentSchema,
  BlueprintPhaseSchema,
  ComposableAssemblySchema,
  CustomAssemblySchema,
  ThreeGeometryType,
  VisualStyle,
};

const DECONSTRUCTOR_MAX_TOKENS = 8000;
const MAX_SCENE_EXTENT = 8; // scene units: the camera rig sits ~9 units away

/* -------------------------------------------------------------------------- */
/* Geometry / style tolerance                                                  */
/* -------------------------------------------------------------------------- */

const GEOMETRY_ALIASES: Array<[RegExp, ThreeGeometryTypeValue]> = [
  [/road|highway|toll|jalan|deck|asphalt|jalur/i, "road"],
  [/pillar|column|pier|tiang|pylon|leg|stanchion/i, "pillar"],
  [/fan|blade|rotor|impeller|turbine|propeller|kipas|baling/i, "fan"],
  [/torus|ring|seal|coil|donut|o-ring|gasket/i, "torus"],
  [/sphere|ball|droplet|bubble|atom|nucleus|gelembung/i, "sphere"],
  [/cone|nozzle|diffuser|corong|funnel|inlet/i, "cone"],
  [/plane|grid|terrain|ground|floor|tanah|landscape|substrate/i, "plane"],
  [/quad|panel|sheet|slab|screen|display|pcb|plate|papan/i, "quad"],
  [/cylinder|tube|pipe|shaft|piston|rod|drum|tank|tangki|bearing/i, "cylinder"],
  [/box|block|chassis|housing|case|body|cube|chip|cpu|battery|keyboard|gedung/i, "box"],
];

export function normalizeGeometryType(raw: unknown): ThreeGeometryTypeValue {
  const value = String(raw ?? "").trim().toLowerCase();
  const exact = ThreeGeometryType.safeParse(value);
  if (exact.success) return exact.data;

  // Accept the CAD primitive names as well (box_housing -> box, ...)
  const primitiveAliases: Record<string, ThreeGeometryTypeValue> = {
    box_housing: "box",
    battery_pack_grid: "box",
    cylinder_motor_stator: "cylinder",
    wheel_axle_assembly: "cylinder",
    turbine_rotor_stage: "fan",
    contoured_shell_body: "box",
    structural_frame_chassis: "box",
    pcb_stack_module: "quad",
    high_voltage_cables: "cylinder",
    stratified_layer_slab: "plane",
  };
  if (primitiveAliases[value]) return primitiveAliases[value];

  for (const [pattern, geometry] of GEOMETRY_ALIASES) {
    if (pattern.test(value)) return geometry;
  }
  return "box";
}

export function normalizeVisualStyle(raw: unknown): VisualStyleValue {
  const value = String(raw ?? "").trim().toLowerCase();
  const exact = VisualStyle.safeParse(value);
  if (exact.success) return exact.data;

  if (/green|terrain|wire-green/.test(value)) return "wireframe-green";
  if (/wire.*blue|wireframe/.test(value)) return "wireframe-blue";
  if (/orange|amber|thermal|hot|exhaust/.test(value)) return "xray-orange";
  if (/dark|deep|shadow/.test(value)) return "xray-blue-dark";
  if (/light|bright|glow/.test(value)) return "xray-blue-light";
  return "xray-blue";
}

/** Sensible params per primitive so an LLM that omits params still renders. */
const GEOMETRY_PARAM_DEFAULTS: Record<ThreeGeometryTypeValue, Record<string, unknown>> = {
  cylinder: { radius: 0.55, height: 2.2, segments: 48, axis: "y" },
  box: { width: 1.6, height: 0.7, depth: 1.6 },
  sphere: { radius: 0.55, segments: 32 },
  torus: { radius: 0.9, tube: 0.22, axis: "z" },
  cone: { radius: 0.7, height: 1.4, axis: "y" },
  plane: { width: 12, height: 12, segmentsX: 24, segmentsY: 24 },
  fan: { blades: 14, radius: 1.1, thickness: 0.32, hubRadius: 0.36 },
  road: { length: 9, width: 2.6, thickness: 0.18, lanes: 4, hasCars: true },
  pillar: { height: 3.2, radius: 0.32, hasFooting: true },
  quad: { width: 1.4, height: 0.9 },
};

/* -------------------------------------------------------------------------- */
/* Small utilities                                                             */
/* -------------------------------------------------------------------------- */

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function uniqueId(rawId: unknown, fallback: string, used: Set<string>): string {
  const base =
    String(rawId ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback;
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}_${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function humanizeId(id: string): string {
  return String(id || "")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function titleCaseTopic(topic: string): string {
  const cleaned = String(topic || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned) return "Objek Teknis";
  return cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
}

function topicToken(topic: string): string {
  return (
    String(topic || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "SYSTEM"
  );
}

function normalizeVec3(raw: unknown, fallback: [number, number, number]): [number, number, number] {
  if (!Array.isArray(raw) || raw.length !== 3) return fallback;
  return [asNumber(raw[0]), asNumber(raw[1]), asNumber(raw[2])];
}

/* -------------------------------------------------------------------------- */
/* Draft normalisation: tolerant LLM output -> schema-valid blueprint          */
/* -------------------------------------------------------------------------- */

function normalizeComponents(rawBlueprint: Record<string, any>): any[] {
  const rawComponents = Array.isArray(rawBlueprint.components)
    ? rawBlueprint.components
    : Array.isArray(rawBlueprint.parts) && !rawBlueprint.assemblies
      ? rawBlueprint.parts
      : [];

  const used = new Set<string>();
  const components = rawComponents
    .filter((raw: unknown) => raw && typeof raw === "object")
    .map((raw: any, index: number) => {
      const geometryType = normalizeGeometryType(
        raw.geometryType ?? raw.geometry ?? raw.primitiveType ?? raw.primitive ?? raw.type
      );
      const params = {
        ...GEOMETRY_PARAM_DEFAULTS[geometryType],
        ...asRecord(raw.params),
      };
      return {
        id: uniqueId(raw.id ?? raw.name, `PART_${index + 1}`, used),
        name: typeof raw.name === "string" ? raw.name : undefined,
        geometryType,
        params,
        style: normalizeVisualStyle(raw.style),
        position3D: normalizeVec3(raw.position3D ?? raw.position ?? raw.basePosition, [0, 0, 0]),
        rotation3D:
          Array.isArray(raw.rotation3D) && raw.rotation3D.length === 3
            ? normalizeVec3(raw.rotation3D, [0, 0, 0])
            : Array.isArray(raw.rotation) && raw.rotation.length === 3
              ? normalizeVec3(raw.rotation, [0, 0, 0])
              : undefined,
        behavior: BehaviorTypeSchema.safeParse(raw.behavior).success
          ? raw.behavior
          : geometryType === "fan"
            ? "rotate"
            : "static",
        axis: ["x", "y", "z"].includes(raw.axis) ? raw.axis : geometryType === "fan" ? "z" : undefined,
      };
    });

  return fitComponentsToScene(components);
}

/**
 * LLMs often borrow millimetre-like numbers ([0, 200, 0], [-300, 50, 0]).
 * Rescale the whole layout (never per part) so it fits the camera frustum.
 */
function fitComponentsToScene(components: any[]): any[] {
  const extent = components.reduce((max, comp) => {
    const [x, y, z] = comp.position3D as [number, number, number];
    return Math.max(max, Math.abs(x), Math.abs(y), Math.abs(z));
  }, 0);

  const factor = extent > MAX_SCENE_EXTENT ? MAX_SCENE_EXTENT / extent : 1;

  return components.map((comp) => {
    const [x, y, z] = comp.position3D as [number, number, number];
    let nextY = y * factor;
    // A ground plane must sit below the machine, never above it.
    if (comp.geometryType === "plane" && nextY > -1) nextY = -3;
    return {
      ...comp,
      position3D: [
        Number((x * factor).toFixed(3)),
        Number(nextY.toFixed(3)),
        Number((z * factor).toFixed(3)),
      ],
    };
  });
}

/** Derive Lego components when the model only produced CAD assemblies. */
function componentsFromAssemblies(assemblies: any[], used: Set<string>): any[] {
  const categoryStyle: Record<string, VisualStyleValue> = {
    shell: "xray-blue",
    core: "xray-orange",
    rotor: "xray-orange",
    structure: "xray-blue-dark",
    thermal: "xray-orange",
    electronics: "xray-blue-light",
  };

  return assemblies.map((assembly, index) => {
    const geometryType = normalizeGeometryType(assembly.primitiveType);
    const dimensions = normalizeVec3(assembly.dimensions, [1.6, 0.9, 1.6]);
    return {
      id: uniqueId(assembly.id, `PART_${index + 1}`, used),
      name: typeof assembly.label === "string" ? assembly.label : undefined,
      geometryType,
      style: categoryStyle[assembly.category] || "xray-blue",
      params: {
        ...GEOMETRY_PARAM_DEFAULTS[geometryType],
        ...(geometryType === "box"
          ? { width: dimensions[0], height: dimensions[1], depth: dimensions[2] }
          : geometryType === "cylinder"
            ? { radius: Math.max(0.1, dimensions[0] / 2), height: dimensions[1] }
            : {}),
      },
      position3D: normalizeVec3(assembly.basePosition, [0, 0, 0]),
      behavior: geometryType === "fan" ? "rotate" : "static",
      axis: geometryType === "fan" ? "z" : undefined,
    };
  });
}

function normalizeTelemetry(rawChannels: unknown, phaseIndex: number, components: any[], topic: string): any[] {
  const channels = (Array.isArray(rawChannels) ? rawChannels : [])
    .filter((channel) => channel && typeof channel === "object")
    .map((channel: any) => {
      const start = channel.startValue ?? channel.from;
      const end = channel.endValue ?? channel.to;
      return {
        name: String(channel.name ?? channel.label ?? channel.metric ?? "").trim() || "METRIC",
        value: channel.value ?? (end !== undefined ? end : start) ?? "-",
        unit: typeof channel.unit === "string" ? channel.unit : "",
        startValue: start,
        endValue: end,
      };
    });

  // The contract asks for 3 live channels. Pad from the phase's own components.
  let cursor = 0;
  while (channels.length < 3) {
    const component = components[(phaseIndex + cursor) % Math.max(1, components.length)];
    const paramValue = component
      ? asNumber(component.params?.height ?? component.params?.radius ?? component.params?.length ?? 0, 0)
      : 0;
    channels.push({
      name: component ? `${component.id}_METRIC` : `${topicToken(topic)}_METRIC_${channels.length + 1}`,
      value: paramValue > 0 ? Number(paramValue.toFixed(2)) : "NOMINAL",
      unit: paramValue > 0 ? "m" : "",
      startValue: undefined,
      endValue: undefined,
    });
    cursor += 1;
    if (!component && cursor > 6) break;
  }

  return channels.slice(0, 4);
}

function normalizePhases(rawBlueprint: Record<string, any>, topic: string, components: any[]): any[] {
  const componentIds = components.map((c) => c.id);
  const rawPhases = Array.isArray(rawBlueprint.phases)
    ? rawBlueprint.phases
    : Array.isArray(rawBlueprint.scenes)
      ? rawBlueprint.scenes
      : [];

  const fallbackTitle = (index: number) => {
    const component = components[index % Math.max(1, components.length)];
    const label = component?.name || (component ? humanizeId(component.id) : `Sistem ${index + 1}`);
    return `${titleCaseTopic(topic)} · ${label}`;
  };

  const phases = rawPhases
    .filter((raw: unknown) => raw && typeof raw === "object")
    .map((raw: any, index: number) => {
      const cameraRaw = asRecord(raw.cameraDirection ?? raw.camera);
      const objectState = asRecord(raw.objectState ?? raw.state);

      const requestedIds = (Array.isArray(raw.activeComponentIds)
        ? raw.activeComponentIds
        : Array.isArray(raw.components)
          ? raw.components
          : []
      )
        .map((id: unknown) => String(id || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_"))
        .filter((id: string) => componentIds.includes(id));

      const primaryIds = requestedIds.length
        ? requestedIds
        : componentIds.length
          ? [componentIds[index % componentIds.length], componentIds[0]].filter(
              (id, i, arr) => arr.indexOf(id) === i
            )
          : [];

      let title = String(raw.title ?? raw.name ?? "").trim();
      if (isForbiddenPhaseTitle(title)) {
        title = fallbackTitle(index);
      }

      return {
        phaseId: raw.phaseId ?? index + 1,
        title,
        label: typeof raw.label === "string" && raw.label.trim() ? raw.label.trim() : undefined,
        duration: asNumber(raw.duration ?? raw.durationSec, 5),
        activeStationCode:
          typeof raw.activeStationCode === "string" && raw.activeStationCode.trim()
            ? raw.activeStationCode
            : `STA-${String(index + 1).padStart(2, "0")}`,
        activeComponentIds: primaryIds,
        cameraDirection: {
          shotType: typeof cameraRaw.shotType === "string" ? cameraRaw.shotType : "MEDIUM",
          focusComponentIds: (Array.isArray(cameraRaw.focusComponentIds)
            ? cameraRaw.focusComponentIds
            : primaryIds
          )
            .map((id: unknown) => String(id || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_"))
            .filter((id: string) => componentIds.includes(id)),
          zoomMultiplier: asNumber(cameraRaw.zoomMultiplier ?? cameraRaw.zoom, 1.0),
          explodeFactor: asNumber(cameraRaw.explodeFactor ?? cameraRaw.explode, 0.0),
        },
        objectState: {
          visibleComponentIds: (Array.isArray(objectState.visibleComponentIds)
            ? objectState.visibleComponentIds
            : primaryIds
          )
            .map((id: unknown) => String(id || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_"))
            .filter((id: string) => componentIds.includes(id)),
          exploded: Boolean(objectState.exploded),
          cutawayEnabled: Boolean(objectState.cutawayEnabled),
        },
        telemetryChannels: normalizeTelemetry(
          raw.telemetryChannels ?? raw.telemetry,
          index,
          components,
          topic
        ),
      };
    });

  // Never ship fewer than 3 phases (schema guarantee, generic filler impossible).
  const fillerLabels = ["Struktur Inti", "Mekanisme Kerja", "Sistem Pendukung", "Integrasi Akhir"];
  let fillIndex = 0;
  while (phases.length < 3) {
    const index = phases.length;
    const label = fillerLabels[Math.min(fillIndex, fillerLabels.length - 1)];
    fillIndex += 1;
    phases.push({
      phaseId: index + 1,
      title: `${titleCaseTopic(topic)} · ${label}`,
      label: undefined,
      duration: 5,
      activeStationCode: `STA-${String(index + 1).padStart(2, "0")}`,
      activeComponentIds: componentIds.slice(0, 2),
      cameraDirection: {
        shotType: "MEDIUM",
        focusComponentIds: componentIds.slice(0, 1),
        zoomMultiplier: 1.0,
        explodeFactor: 0.0,
      },
      objectState: {
        visibleComponentIds: componentIds,
        exploded: false,
        cutawayEnabled: false,
      },
      telemetryChannels: normalizeTelemetry([], index, components, topic),
    });
  }

  // De-duplicate titles ("Compressor" twice would read as a bug).
  const seenTitles = new Set<string>();
  phases.forEach((phase, index) => {
    const key = phase.title.toLowerCase();
    if (seenTitles.has(key)) phase.title = `${phase.title} ${index + 1}`;
    seenTitles.add(phase.title.toLowerCase());
  });

  return phases;
}

const PRIMITIVE_SYNONYMS: Record<string, string> = {
  box: "box_housing",
  housing: "box_housing",
  enclosure: "box_housing",
  battery: "battery_pack_grid",
  battery_pack: "battery_pack_grid",
  cells: "battery_pack_grid",
  motor: "cylinder_motor_stator",
  stator: "cylinder_motor_stator",
  cylinder: "cylinder_motor_stator",
  wheel: "wheel_axle_assembly",
  axle: "wheel_axle_assembly",
  wheel_axle: "wheel_axle_assembly",
  turbine: "turbine_rotor_stage",
  rotor: "turbine_rotor_stage",
  fan: "turbine_rotor_stage",
  compressor: "turbine_rotor_stage",
  shell: "contoured_shell_body",
  body: "contoured_shell_body",
  chassis: "structural_frame_chassis",
  frame: "structural_frame_chassis",
  truss: "structural_frame_chassis",
  pcb: "pcb_stack_module",
  board: "pcb_stack_module",
  electronics: "pcb_stack_module",
  cable: "high_voltage_cables",
  cables: "high_voltage_cables",
  wiring: "high_voltage_cables",
  slab: "stratified_layer_slab",
  road: "stratified_layer_slab",
  layer: "stratified_layer_slab",
  foundation: "stratified_layer_slab",
};

function normalizeAssemblies(rawBlueprint: Record<string, any>): any[] | undefined {
  const raw = rawBlueprint.assemblies ?? rawBlueprint.parts;
  if (!Array.isArray(raw)) return undefined;

  const used = new Set<string>();
  const assemblies = raw
    .filter((entry: unknown) => entry && typeof entry === "object")
    .map((entry: any, index: number) => {
      const rawPrimitive = String(entry.primitiveType ?? entry.primitive ?? entry.type ?? "")
        .trim()
        .toLowerCase();
      const primitive =
        ParametricPrimitiveTypeSchema.safeParse(rawPrimitive).success
          ? rawPrimitive
          : PRIMITIVE_SYNONYMS[rawPrimitive] ||
            PRIMITIVE_SYNONYMS[rawPrimitive.replace(/[^a-z_]/g, "_")] ||
            null;
      if (!primitive) return null;

      const category = AssemblyCategorySchema.safeParse(String(entry.category ?? "").toLowerCase())
        .success
        ? String(entry.category).toLowerCase()
        : "core";

      return {
        id: uniqueId(entry.id, `ASM_${index + 1}`, used),
        stationCode:
          typeof entry.stationCode === "string" && entry.stationCode.trim()
            ? entry.stationCode
            : `STA-${String(index + 1).padStart(2, "0")}`,
        label: String(entry.label ?? entry.name ?? humanizeId(String(entry.id ?? primitive))),
        metrics: typeof entry.metrics === "string" ? entry.metrics : "",
        category,
        primitiveType: primitive,
        dimensions:
          Array.isArray(entry.dimensions) && entry.dimensions.length === 3
            ? normalizeVec3(entry.dimensions, [1.8, 1.2, 1.8])
            : undefined,
        basePosition: normalizeVec3(entry.basePosition ?? entry.position3D, [0, 0, 0]),
        baseRotation:
          Array.isArray(entry.baseRotation) && entry.baseRotation.length === 3
            ? normalizeVec3(entry.baseRotation, [0, 0, 0])
            : undefined,
        explodeOffset: normalizeVec3(entry.explodeOffset, [0, 0.8, 0]),
        rotationAxis: ["x", "y", "z"].includes(entry.rotationAxis) ? entry.rotationAxis : undefined,
        rotationSpeed: Number.isFinite(Number(entry.rotationSpeed)) ? Number(entry.rotationSpeed) : undefined,
        bladeOrCellCount: Number.isFinite(Number(entry.bladeOrCellCount))
          ? Number(entry.bladeOrCellCount)
          : undefined,
        isShell: Boolean(entry.isShell),
      };
    })
    .filter(Boolean);

  return assemblies.length ? assemblies : undefined;
}

function normalizeBlueprintDraft(rawBlueprint: unknown, topic: string): Record<string, any> {
  const raw = asRecord(rawBlueprint);

  const assemblies = normalizeAssemblies(raw);
  const usedIds = new Set<string>();
  let components = normalizeComponents(raw);

  if (components.length === 0 && assemblies) {
    components = fitComponentsToScene(componentsFromAssemblies(assemblies, usedIds));
  }

  const phases = normalizePhases(raw, topic, components);
  const archetypeRaw = String(raw.subjectArchetype ?? raw.archetype ?? "").trim();

  const title =
    String(raw.videoTitle ?? raw.title ?? "").trim() ||
    `CARA KERJA ${topicToken(topic).replace(/_/g, " ")}`;

  return {
    videoTitle: title,
    subtitle:
      String(raw.subtitle ?? "").trim() || `ANALISIS ANATOMI ${topicToken(topic).replace(/_/g, " ")}`,
    subjectArchetype: archetypeRaw || topicToken(topic),
    cadArchetype: raw.cadArchetype,
    visualStyle: "blueprint",
    params: asRecord(raw.params),
    components,
    assemblies,
    customAssemblies: Array.isArray(raw.customAssemblies) ? raw.customAssemblies : undefined,
    phases,
  };
}

/* -------------------------------------------------------------------------- */
/* System prompt                                                               */
/* -------------------------------------------------------------------------- */

export const DECONSTRUCTOR_SYSTEM_PROMPT = `You are the universal blueprint generator for vertical 9:16 X-ray hologram videos (1080x1920, pure black background #000000, cyan #00D4FF x-ray material).

INPUT: one free-text topic, Indonesian or English: "jalan tol", "turbo", "laptop", "kenapa air di tumbler awet", "kecap", "cat landing", ...
OUTPUT: exactly ONE raw JSON object that matches the contract below. No markdown fence, no comment, no explanation.

=== RULES ===

1) phases — 4 to 6 phases, ordered like a good explanation.
   title MUST name a real sub-system of THIS topic (2-4 words), never a camera term.
   Examples:
     jalan tol -> ["Pondasi Pilar", "Gerbang Tol", "Alur Kendaraan", "Struktur Elevated"]
     turbo     -> ["Compressor Housing", "Shaft & Bearing", "Turbine Wheel", "Wastegate & Boost"]
     laptop    -> ["Motherboard & CPU", "Sistem Pendingin Heatpipe", "Baterai & Keyboard", "Engsel & Casing"]
     kecap     -> ["Fermentasi Kedelai", "Filtrasi & Pasteurisasi", "Botol & Segel"]
   NEVER use: "Solusi Vakum", "Peran Lapisan", "Segel Silikon", "Potongan Melintang", "Tampilan Meledak", "Sintesis Keseluruhan", "Fase 1".
   label = one short clause on what happens inside that sub-system.
   activeComponentIds MUST reference ids declared in components.
   telemetryChannels: EXACTLY 3 real measurements for THIS topic, numeric with unit:
     jalan tol -> LANE_WIDTH 3.6 m, PILLAR_HEIGHT 24 m, TRAFFIC_FLOW 4200 vehicles/hour
     turbo     -> BOOST_PRESSURE 1.2 bar, SHAFT_SPEED 180000 RPM, EXHAUST_TEMP 850 C
     laptop    -> CPU_TEMP 78 C, FAN_RPM 3200 RPM, BATTERY_DRAIN 12 W
     Never reuse filler such as "DURI KERAS".
   duration 4-8 (seconds). cameraDirection: shotType WIDE|MEDIUM|CLOSE|MACRO|XRAY_SIDE, focusComponentIds (existing ids), zoomMultiplier 1.0-2.4, explodeFactor 0-1.
   objectState: visibleComponentIds (existing ids), exploded (bool), cutawayEnabled (bool).

2) components — 5 to 9 physical parts of the object, the Lego bricks that render it.
   geometryType: cylinder | box | sphere | torus | cone | plane | fan | road | pillar | quad
     fan = turbine/impeller/propeller; road = deck/highway; pillar = pier/column;
     plane = terrain/ground wireframe; quad = flat panel/PCB/screen; torus = ring/casing.
   style: xray-blue (default 0.18 opacity), xray-blue-dark, xray-blue-light, xray-orange (engine/hot core highlight), wireframe-green (terrain), wireframe-blue.
   position3D = [x, y, z] isometric SCENE UNITS: keep the whole machine inside x,z in -6..6, y from -3 (ground) to +4.
   params are merged with safe defaults; supply the real dimensions:
     cylinder {radius,height,axis}; box {width,height,depth}; sphere {radius}; torus {radius,tube};
     cone {radius,height}; plane {width,height,segmentsX,segmentsY}; fan {blades,radius,thickness};
     road {length,width,lanes,hasCars}; pillar {height,radius,hasFooting}; quad {width,height}.
   behavior: "rotate" for spinning parts (fan, shaft), "explode" only for parts that must separate, otherwise "static". axis "z" for spinning.
   Example topic "jalan tol" (yours MUST be for the given topic):
     TERRAIN  plane  wireframe-green [-0, -3, 0]   {width:12,height:12}
     ROAD     road   xray-blue       [0, 1.2, 0]   {length:9,width:2.6,lanes:4,hasCars:true}
     PILLAR_1 pillar xray-blue       [-2.6, -0.6, 0] {height:3.4,radius:0.34}
     PILLAR_2 pillar xray-blue       [2.6, -0.6, 0]  {height:3.4,radius:0.34}
     CAR_1    box    xray-blue-light [-0.6, 1.55, -1.2] {width:0.5,height:0.28,depth:1.1}
   Example topic "turbo": COMPRESSOR torus/xray-blue, SHAFT cylinder/xray-blue-dark (rotate, axis x), TURBINE fan/xray-orange (rotate), HOUSING cylinder/xray-blue-light.
   Example topic "laptop": DISPLAY quad/xray-blue, MOTHERBOARD quad/xray-blue-dark {width:2.2,height:1.4}, HEATPIPE cylinder/xray-orange (axis z), FAN fan/xray-blue-light, BATTERY box/xray-blue-dark, KEYBOARD quad/xray-blue.

3) subjectArchetype — free UPPER_SNAKE text describing the class of object: TOLL_ROAD, TURBOCHARGER, LAPTOP_XRAY, JET_TURBOFAN, CAR_XRAY, TUMBLER_VACUUM, FERMENTED_SOY_SAUCE. Never empty, never an enum from a fixed list.

4) videoTitle: short UPPERCASE Indonesian hook. subtitle: UPPERCASE technical line.

5) assemblies — OPTIONAL cutaway-layer entries. Only use these primitiveType values:
   box_housing, battery_pack_grid, cylinder_motor_stator, wheel_axle_assembly, turbine_rotor_stage,
   contoured_shell_body, structural_frame_chassis, pcb_stack_module, high_voltage_cables, stratified_layer_slab.
   Fields: id, stationCode "STA-01", label, metrics, category shell|core|rotor|structure|thermal|electronics, primitiveType, dimensions [w,h,d], basePosition [x,y,z] (scene units), explodeOffset [x,y,z], rotationAxis, rotationSpeed, isShell.
   Omit assemblies entirely if the topic does not map cleanly. Never invent enum values.

=== OUTPUT SHAPE (values shown are an EXAMPLE, replace them with the real topic) ===
{
  "videoTitle": "KENAPA JALAN TOL BISA MELENGKUNG DI ATAS KOTA",
  "subtitle": "ANATOMI STRUKTUR ELEVATED & ALUR KENDARAAN",
  "subjectArchetype": "TOLL_ROAD",
  "visualStyle": "blueprint",
  "components": [
    { "id": "TERRAIN", "name": "Terrain Wireframe", "geometryType": "plane", "style": "wireframe-green", "position3D": [0, -3, 0], "params": { "width": 12, "height": 12, "segmentsX": 24, "segmentsY": 24 }, "behavior": "static" },
    { "id": "ROAD", "name": "Elevated Deck", "geometryType": "road", "style": "xray-blue", "position3D": [0, 1.2, 0], "params": { "length": 9, "width": 2.6, "lanes": 4, "hasCars": true }, "behavior": "static" },
    { "id": "PILLAR_1", "name": "Pier Pilar", "geometryType": "pillar", "style": "xray-blue", "position3D": [-2.6, -0.6, 0], "params": { "height": 3.4, "radius": 0.34 }, "behavior": "static" },
    { "id": "CAR_1", "name": "Kendaraan X-Ray", "geometryType": "box", "style": "xray-blue-light", "position3D": [-0.6, 1.55, -1.2], "params": { "width": 0.5, "height": 0.28, "depth": 1.1 }, "behavior": "static" }
  ],
  "phases": [
    {
      "phaseId": 1,
      "title": "Pondasi Pilar",
      "label": "Beban dek disalurkan lewat tiang beton ke tanah",
      "duration": 6,
      "activeComponentIds": ["PILLAR_1", "TERRAIN"],
      "cameraDirection": { "shotType": "CLOSE", "focusComponentIds": ["PILLAR_1"], "zoomMultiplier": 1.3, "explodeFactor": 0 },
      "objectState": { "visibleComponentIds": ["TERRAIN", "PILLAR_1", "ROAD"], "exploded": false, "cutawayEnabled": false },
      "telemetryChannels": [
        { "name": "KEDALAMAN TIANG", "value": 24, "unit": "m", "startValue": 0, "endValue": 24 },
        { "name": "BEBAN PER PILAR", "value": 1800, "unit": "ton", "startValue": 0, "endValue": 1800 },
        { "name": "JUMLAH PILAR", "value": 312, "unit": "unit" }
      ]
    }
  ],
  "assemblies": [
    {
      "id": "road_deck", "stationCode": "STA-01", "label": "Elevated Toll Deck",
      "metrics": "WIDTH 3.6 m per lane // 4 LANES",
      "category": "structure", "primitiveType": "stratified_layer_slab",
      "dimensions": [2.6, 0.18, 9], "basePosition": [0, 1.2, 0], "explodeOffset": [0, 1.6, 0]
    }
  ]
}`;

/* -------------------------------------------------------------------------- */
/* Deterministic fallback (LLM unreachable / unrepairable)                     */
/* -------------------------------------------------------------------------- */

function buildFallbackBlueprint(topic: string): VideoBlueprint {
  const label = titleCaseTopic(topic);
  const token = topicToken(topic);
  const aspects = [
    { title: `${label} · Struktur Inti`, label: "Bentuk dan susunan bagian utama objek." },
    { title: `${label} · Sistem Pendukung`, label: "Bagian yang menjaga objek tetap bekerja." },
    { title: `${label} · Aliran Kerja`, label: "Urutan kejadian saat objek dipakai." },
    { title: `${label} · Integrasi`, label: "Seluruh bagian bekerja sebagai satu sistem." },
  ];

  const phases = aspects.map((aspect, index) => ({
    phaseId: index + 1,
    title: aspect.title,
    label: aspect.label,
    duration: 5,
    activeStationCode: `STA-${String(index + 1).padStart(2, "0")}`,
    activeComponentIds: [] as string[],
    cameraDirection: {
      shotType: index === 0 ? "WIDE" : "MEDIUM",
      focusComponentIds: [],
      zoomMultiplier: 1 + index * 0.1,
      explodeFactor: index === 3 ? 0.2 : 0,
    },
    objectState: { visibleComponentIds: [], exploded: false, cutawayEnabled: false },
    telemetryChannels: [
      { name: `${token}_LOAD`, value: "NOMINAL", unit: "" },
      { name: `${token}_SCALE`, value: "1.0", unit: "x" },
      { name: `${token}_FLOW`, value: "STABLE", unit: "" },
    ],
  }));

  const fallback = {
    videoTitle: label.toUpperCase(),
    subtitle: `ANATOMI ${label.toUpperCase()}`,
    subjectArchetype: token,
    visualStyle: "blueprint",
    params: {},
    components: [] as any[],
    phases,
  };

  const parsed = BlueprintSchema.safeParse(fallback);
  if (parsed.success) return parsed.data as VideoBlueprint;
  return fallback as unknown as VideoBlueprint;
}

/* -------------------------------------------------------------------------- */
/* Public entry point                                                          */
/* -------------------------------------------------------------------------- */

function finalizeBlueprint(draft: Record<string, any>, topic: string): VideoBlueprint {
  const parsed = BlueprintSchema.parse(draft);

  const componentIds = parsed.components.map((component) => component.id);
  const phases = parsed.phases.map((phase) => ({
    ...phase,
    activeComponentIds: phase.activeComponentIds.filter((id) => componentIds.includes(id)),
    cameraDirection: {
      ...phase.cameraDirection,
      focusComponentIds: phase.cameraDirection.focusComponentIds.filter((id) =>
        componentIds.includes(id)
      ),
    },
    objectState: {
      ...phase.objectState,
      visibleComponentIds: phase.objectState.visibleComponentIds.length
        ? phase.objectState.visibleComponentIds.filter((id) => componentIds.includes(id))
        : componentIds,
    },
  }));

  // Never let a topic-specific title be replaced by nothing.
  phases.forEach((phase, index) => {
    if (isForbiddenPhaseTitle(phase.title)) {
      const component = parsed.components[index % Math.max(1, parsed.components.length)];
      phase.title = `${titleCaseTopic(topic)} · ${
        component?.name || (component ? humanizeId(component.id) : `Sistem ${index + 1}`)
      }`;
    }
  });

  const blueprint = {
    ...parsed,
    phases,
    cadArchetype: resolveCADArchetype(parsed.subjectArchetype || topic),
  } as VideoBlueprint;

  return blueprint;
}

/**
 * Pure (network-free) path: raw LLM JSON -> repaired, validated blueprint.
 * Exported so fixtures can prove the universal contract without a model call.
 */
export function buildBlueprintFromLlmJson(rawBlueprint: unknown, topic: string): VideoBlueprint {
  return finalizeBlueprint(normalizeBlueprintDraft(rawBlueprint, topic), topic);
}

/**
 * Deconstruct ANY free-text topic into a validated universal blueprint.
 * Never throws: schema repair + model retry + deterministic fallback.
 */
export async function deconstructTopicToBlueprint(
  topic: string,
  knowledgeBase: string,
  modelId?: string
): Promise<VideoBlueprint> {
  const primaryModel = resolveContentModel(modelId);
  const compactKnowledge = String(knowledgeBase || "").slice(0, 2500);

  const buildMessages = (attempt: number) => {
    const user =
      attempt === 1
        ? `TOPIC: ${topic}\n\nRESEARCH KNOWLEDGE BASE (optional facts):\n${compactKnowledge}\n\nBuat blueprint X-ray hologram untuk topik ini. phases + components + telemetry HARUS spesifik topik. Balas HANYA JSON valid sesuai kontrak.`
        : `TOPIC: ${topic}\n\nGAGAL VALIDASI. Ulangi: phases minimal 3 (target 4-6) dengan judul spesifik topik, components 5-9 dengan geometryType & position3D scene units, telemetryChannels 3 per phase. Balas HANYA JSON tanpa markdown.`;

    return [
      { role: "system" as const, content: DECONSTRUCTOR_SYSTEM_PROMPT },
      { role: "user" as const, content: user },
    ];
  };

  const models = [primaryModel, "auto/best-free", "auto"];

  for (let attempt = 0; attempt < models.length; attempt++) {
    const model = models[attempt];
    try {
      const rawText = await omniroute.getChatCompletion(
        buildMessages(attempt === 0 ? 1 : 2),
        model,
        attempt === 0 ? 0.35 : 0.2,
        DECONSTRUCTOR_MAX_TOKENS
      );

      const parsed = omniroute.cleanAndParseJson(rawText);
      const blueprint = buildBlueprintFromLlmJson(parsed, topic);

      if ((blueprint.phases?.length ?? 0) >= 3) {
        return blueprint;
      }
      throw new Error(`Only ${blueprint.phases?.length ?? 0} valid phases returned`);
    } catch (error: any) {
      console.warn(
        `[DECONSTRUCTOR] Attempt ${attempt + 1}/${models.length} failed (${model}): ${error?.message}`
      );
    }
  }

  console.error("[DECONSTRUCTOR] Falling back to deterministic topic-derived blueprint.");
  return buildFallbackBlueprint(topic);
}
