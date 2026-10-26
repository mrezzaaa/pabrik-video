import { CADArchetype, CADBlueprintConfig, SubAssemblySpec } from "./types";
import { buildAxisymmetricMachine } from "./builders/axisymmetricBuilder";
import { buildStratifiedInfrastructure } from "./builders/stratifiedInfrastructureBuilder";
import { buildStructuralGrid } from "./builders/structuralGridBuilder";
import { buildMechatronics } from "./builders/mechatronicsBuilder";
import { buildContinuumWave } from "./builders/continuumWaveBuilder";

export function resolveCADArchetype(topicOrArchetype: string): CADArchetype {
  const str = topicOrArchetype.toUpperCase();

  if (
    str.includes("AXISYMMETRIC") ||
    str.includes("JET") ||
    str.includes("TURBINE") ||
    str.includes("ROCKET") ||
    str.includes("MOTOR") ||
    str.includes("MESIN") ||
    str.includes("PISTON") ||
    str.includes("POMPA") ||
    str.includes("PROPELLER")
  ) {
    return "AXISYMMETRIC_MACHINE";
  }

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

export function buildCADAssemblies(config: CADBlueprintConfig): SubAssemblySpec[] {
  const archetype = config.archetype || resolveCADArchetype(config.videoTitle);
  const params = config.params || {};

  let baseAssemblies: SubAssemblySpec[];

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

  // If custom assembly overrides are provided by LLM, merge metadata
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
