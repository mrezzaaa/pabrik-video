#!/usr/bin/env tsx
/**
 * Offline contract test for the universal deconstructor repair layer.
 * No LLM call: feeds the kind of broken payloads a weak model really returns.
 *
 *   npm run test:deconstructor
 */
import { BlueprintSchema, isForbiddenPhaseTitle } from "../lib/schemas/blueprint.schema";
import { buildBlueprintFromLlmJson } from "./deconstructor.worker";

let failures = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL ${name}`);
    if (detail !== undefined) console.error("       ", JSON.stringify(detail));
  }
}

function validate(name: string, raw: unknown, topic: string) {
  console.log(`\n[${topic}] ${name}`);
  const blueprint = buildBlueprintFromLlmJson(raw, topic);  const parsed = BlueprintSchema.safeParse(blueprint);
  check("zod passes", parsed.success, parsed.success ? undefined : parsed.error.issues);
  check("phases >= 3", (blueprint.phases?.length ?? 0) >= 3);
  check(
    "no forbidden/generic phase titles",
    (blueprint.phases || []).every((phase) => !isForbiddenPhaseTitle(phase.title || ""))
  );
  check(
    "activeComponentIds reference real components",
    (blueprint.phases || []).every((phase) =>
      (phase.activeComponentIds || []).every((id) =>
        (blueprint.components || []).some((component) => component.id === id)
      )
    )
  );
  check(
    "every component has a renderable geometryType",
    (blueprint.components || []).every((component) =>
      ["cylinder", "box", "sphere", "torus", "cone", "plane", "fan", "road", "pillar", "quad"].includes(
        String(component.geometryType || "")
      )
    )
  );
  return blueprint;
}

// 1. The exact regression from the ticket: hardcoded vacuum titles + enum-ish garbage.
validate(
  "legacy hardcoded phases + bogus geometry/style/position",
  {
    videoTitle: "KENAPA TUMBLER VAKUM",
    subjectArchetype: "TUMBLER_VACUUM",
    components: [
      { id: "TUMBLER", geometryType: "globe", style: "purple", position3D: [0, 300, 0] },
      { id: "LID", geometryType: "disc", style: "xray-blue" },
    ],
    phases: [
      { phaseId: 1, title: "Solusi Vakum", duration: 99, telemetryChannels: [] },
      { phaseId: 2, title: "Peran Lapisan" },
      { phaseId: 3, title: "Segel Silikon" },
    ],
  },
  "tumbler"
);

// 2. Assemblies only (no components[]) -> components must be derived.
const derived = validate(
  "assemblies-only payload derives components",
  {
    videoTitle: "TURBO XRAY",
    subjectArchetype: "TURBOCHARGER",
    assemblies: [
      {
        id: "compressor",
        label: "Compressor Wheel",
        category: "rotor",
        primitiveType: "turbine_rotor_stage",
        basePosition: [0, 0.4, 0],
        explodeOffset: [0, 1.2, 0],
      },
      {
        id: "shaft",
        label: "Titanium Shaft",
        category: "core",
        primitiveType: "cylinder_motor_stator",
        basePosition: [0, 0, 0],
        explodeOffset: [0, -1, 0],
      },
    ],
    phases: [{ title: "Compressor Housing" }],
  },
  "turbo"
);
check("derived COMPRESSOR component exists", (derived.components || []).length >= 2);
check(
  "derived fan spins",
  (derived.components || []).some((c) => c.geometryType === "fan" && c.behavior === "rotate")
);

// 3. Zero components / zero phases but a valid topic -> still a usable blueprint.
validate("empty payload", { videoTitle: "", phases: [] }, "cat landing");

// 4. Millimetre positions must be rescaled into the camera frustum.
const scaled = validate(
  "mm-scale positions are rescaled",
  {
    videoTitle: "JALAN TOL",
    components: [
      { id: "ROAD", geometryType: "road", position3D: [0, 0, 0] },
      { id: "PILLAR_1", geometryType: "pillar", position3D: [-300, 50, 0] },
      { id: "CAR", geometryType: "box", position3D: [0, -20, 0] },
    ],
    phases: [
      { title: "Pondasi Pilar" },
      { title: "Alur Kendaraan" },
      { title: "Struktur Elevated" },
    ],
  },
  "jalan tol"
);
check(
  "telemetry has 3 channels per phase",
  (scaled.phases || []).every((phase) => (phase.telemetryChannels || []).length === 3)
);
check(
  "all positions fit the frame (±8 units)",
  (scaled.components || []).every((component) =>
    (component.position3D || [0, 0, 0]).every((value) => Math.abs(value) <= 8)
  )
);

console.log(
  failures === 0
    ? "\nblueprint contract: PASS"
    : `\nblueprint contract: ${failures} FAILURE(S)`
);
process.exitCode = failures === 0 ? 0 : 1;
