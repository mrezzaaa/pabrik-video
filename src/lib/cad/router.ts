import { CADArchetype, CADBlueprintConfig, ComposableAssemblySpec, SubAssemblySpec } from "./types";
import { renderComposablePrimitive } from "./primitives";
import { buildAxisymmetricMachine } from "./builders/axisymmetricBuilder";
import { buildStratifiedInfrastructure } from "./builders/stratifiedInfrastructureBuilder";
import { buildStructuralGrid } from "./builders/structuralGridBuilder";
import { buildMechatronics } from "./builders/mechatronicsBuilder";
import { buildContinuumWave } from "./builders/continuumWaveBuilder";
import { buildElectricVehicle } from "./builders/electricVehicleBuilder";

export function resolveCADArchetype(topicOrArchetype: string): CADArchetype | "ELECTRIC_VEHICLE" {
  const str = topicOrArchetype.toUpperCase();

  // 1. Electric Vehicle / Car / Mobil Listrik / Otomotif
  if (
    str.includes("MOBIL") ||
    str.includes("CAR") ||
    str.includes("ELECTRIC_VEHICLE") ||
    str.includes("EV") ||
    str.includes("OTOMOTIF") ||
    str.includes("VEHICLE") ||
    str.includes("KENDARAAN") ||
    str.includes("TRUK") ||
    str.includes("TRUCK")
  ) {
    return "ELECTRIC_VEHICLE";
  }

  // 2. Axisymmetric / Cylindrical / Rotating
  if (
    str.includes("AXISYMMETRIC") ||
    str.includes("JET") ||
    str.includes("TURBINE") ||
    str.includes("ROCKET") ||
    str.includes("ROKET") ||
    str.includes("MESIN JET") ||
    str.includes("PISTON") ||
    str.includes("POMPA") ||
    str.includes("PROPELLER")
  ) {
    return "AXISYMMETRIC_MACHINE";
  }

  // 3. Stratified Infrastructure / Roads / Bridges
  if (
    str.includes("STRATIFIED") ||
    str.includes("ROAD") ||
    str.includes("TOL") ||
    str.includes("JALAN") ||
    str.includes("JEMBATAN") ||
    str.includes("BRIDGE") ||
    str.includes("ASPHALT") ||
    str.includes("BETON") ||
    str.includes("INFRASTRUCTURE") ||
    str.includes("HIGHWAY") ||
    str.includes("KABEL") ||
    str.includes("CABLE")
  ) {
    return "STRATIFIED_INFRASTRUCTURE";
  }

  // 4. Structural Architecture / High-Rise / Buildings
  if (
    str.includes("STRUCTURAL") ||
    str.includes("BUILDING") ||
    str.includes("GEDUNG") ||
    str.includes("SKYSCRAPER") ||
    str.includes("FACTORY") ||
    str.includes("PABRIK") ||
    str.includes("DATA_CENTER") ||
    str.includes("SHIP") ||
    str.includes("KAPAL")
  ) {
    return "STRUCTURAL_ARCHITECTURE";
  }

  // 5. Continuum Phenomenon / Natural Field
  if (
    str.includes("CONTINUUM") ||
    str.includes("TSUNAMI") ||
    str.includes("EARTHQUAKE") ||
    str.includes("GEMPA") ||
    str.includes("HUJAN") ||
    str.includes("RAIN") ||
    str.includes("WAVE") ||
    str.includes("OMBAK") ||
    str.includes("PLUME") ||
    str.includes("WAKE") ||
    str.includes("SONAR")
  ) {
    return "CONTINUUM_PHENOMENON";
  }

  // Default to Mechatronics (Drones, Electronics, Apple Silicon, Satellites, Robotics)
  return "MULTI_AXIS_MECHATRONICS";
}

/**
 * Converts a ComposableAssemblySpec (with parametric primitiveType) into a SubAssemblySpec
 */
export function convertComposableToSubAssembly(spec: ComposableAssemblySpec): SubAssemblySpec {
  return {
    id: spec.id,
    label: spec.label,
    stationCode: spec.stationCode,
    category: spec.category,
    basePosition: spec.basePosition,
    explodeOffset: spec.explodeOffset,
    rotationSpeed: spec.rotationSpeed,
    rotationAxis: spec.rotationAxis,
    metrics: spec.metrics,
    isShell: spec.isShell,
    buildGeometry: (group, helpers) => {
      renderComposablePrimitive(spec, group, helpers);
    },
  };
}

export function buildCADAssemblies(config: CADBlueprintConfig): SubAssemblySpec[] {
  // If the LLM has output structured composable assemblies, render them directly!
  if (config.assemblies && config.assemblies.length > 0) {
    return config.assemblies.map(convertComposableToSubAssembly);
  }

  const archetype = config.archetype || resolveCADArchetype(config.videoTitle);
  const params = config.params || {};

  let baseAssemblies: SubAssemblySpec[];

  if (archetype === "ELECTRIC_VEHICLE" || resolveCADArchetype(config.videoTitle) === "ELECTRIC_VEHICLE") {
    const evSpecs = buildElectricVehicle(params);
    baseAssemblies = evSpecs.map(convertComposableToSubAssembly);
  } else {
    switch (archetype) {
      case "AXISYMMETRIC_MACHINE":
        baseAssemblies = buildAxisymmetricMachine(params);
        break;
      case "STRATIFIED_INFRASTRUCTURE":
        baseAssemblies = buildStratifiedInfrastructure(params);
        break;
      case "STRUCTURAL_ARCHITECTURE":
        baseAssemblies = buildStructuralGrid(params);
        break;
      case "CONTINUUM_PHENOMENON":
        baseAssemblies = buildContinuumWave(params);
        break;
      case "MULTI_AXIS_MECHATRONICS":
      default:
        baseAssemblies = buildMechatronics(params);
        break;
    }
  }

  // If custom assembly metadata overrides are provided by LLM, merge them
  if (config.customAssemblies && config.customAssemblies.length > 0) {
    return baseAssemblies.map((base, idx) => {
      const custom = config.customAssemblies![idx];
      if (!custom) return base;
      return {
        ...base,
        label: custom.label || base.label,
        stationCode: custom.stationCode || base.stationCode,
        category: custom.category || base.category,
        metrics: custom.metrics || base.metrics,
        explodeOffset: custom.explodeOffset || base.explodeOffset,
      };
    });
  }

  return baseAssemblies;
}
