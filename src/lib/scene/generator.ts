import { GeometryType, BehaviorType, SceneNode, VideoBlueprint } from "./types";

const VALID_GEOMETRIES: Set<GeometryType> = new Set([
  "fan",
  "cylinder",
  "cone",
  "torus",
  "chamber",
  "box",
]);

const VALID_BEHAVIORS: Set<BehaviorType> = new Set([
  "rotate",
  "static",
  "explode",
]);

/**
 * Normalizes and parses raw geometry string into safe GeometryType
 */
export function normalizeGeometryType(raw: string): GeometryType {
  const g = String(raw || "").trim().toLowerCase();
  if (VALID_GEOMETRIES.has(g as GeometryType)) {
    return g as GeometryType;
  }
  // Tolerant fallbacks for common synonyms
  if (g.includes("fan") || g.includes("propeller") || g.includes("blade") || g.includes("rotor"))
    return "fan";
  if (g.includes("cone") || g.includes("nozzle") || g.includes("diffuser"))
    return "cone";
  if (g.includes("torus") || g.includes("ring") || g.includes("seal") || g.includes("o-ring"))
    return "torus";
  if (g.includes("chamber") || g.includes("combust") || g.includes("vacuum") || g.includes("cavity"))
    return "chamber";
  if (g.includes("cylinder") || g.includes("pipe") || g.includes("wall") || g.includes("tube") || g.includes("rod"))
    return "cylinder";
  return "cylinder";
}

/**
 * Normalizes and parses raw behavior string into safe BehaviorType
 */
export function normalizeBehaviorType(raw: string): BehaviorType {
  const b = String(raw || "").trim().toLowerCase();
  if (VALID_BEHAVIORS.has(b as BehaviorType)) {
    return b as BehaviorType;
  }
  if (b.includes("rot") || b.includes("spin")) return "rotate";
  if (b.includes("explod") || b.includes("apart") || b.includes("pull")) return "explode";
  return "static";
}

/**
 * Generates dynamic SceneNode graph directly from VideoBlueprint.
 * DILARANG hardcode per-topic check (misal: if topic === 'jet' return jetModel).
 * Semuanya dinamis dari data blueprint.components!
 */
export function generateSceneGraph(blueprint: VideoBlueprint): SceneNode[] {
  if (!blueprint || !Array.isArray(blueprint.components)) {
    return [];
  }

  return blueprint.components.map((c) => {
    const geometry = normalizeGeometryType(c.geometry);
    const behavior = normalizeBehaviorType(c.behavior || "static");

    const pos = Array.isArray(c.position) && c.position.length >= 3
      ? [Number(c.position[0]) || 0, Number(c.position[1]) || 0, Number(c.position[2]) || 0] as [number, number, number]
      : [0, 0, 0] as [number, number, number];

    const axis = c.axis && ["x", "y", "z"].includes(c.axis.toLowerCase())
      ? (c.axis.toLowerCase() as "x" | "y" | "z")
      : undefined;

    return {
      id: String(c.id || `node_${Math.random().toString(36).substring(2, 7)}`),
      name: c.name,
      geometry,
      params: (c.params && typeof c.params === "object") ? c.params : {},
      position: pos,
      behavior,
      axis,
    };
  });
}
