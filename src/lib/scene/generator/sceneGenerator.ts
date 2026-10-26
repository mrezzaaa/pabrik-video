import * as THREE from "three";
import { primitives } from "../primitives";
import { GeometryType, VideoBlueprint, VideoBlueprintComponent } from "../types";
import { createWireframeTerrainMesh } from "../materials/wireframe-terrain.material";

const VALID_GEOMETRIES: Set<string> = new Set([
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
  "car",
  "chamber",
]);

/**
 * Normalizes any LLM geometry string into a supported primitive type.
 * Universal synonyms only — never keyed on the topic.
 */
export function normalizeGeometryType(raw: string): GeometryType {
  const g = String(raw || "").trim().toLowerCase();
  if (VALID_GEOMETRIES.has(g)) {
    return g as GeometryType;
  }
  if (g.includes("road") || g.includes("highway") || g.includes("bridge") || g.includes("tol")) return "road";
  if (g.includes("pillar") || g.includes("column") || g.includes("pier") || g.includes("tiang")) return "pillar";
  if (g.includes("car") || g.includes("vehicle") || g.includes("mobil") || g.includes("truck") || g.includes("bus")) return "car";
  if (g.includes("fan") || g.includes("rotor") || g.includes("blade") || g.includes("propeller") || g.includes("turbine") || g.includes("impeller")) return "fan";
  if (g.includes("sphere") || g.includes("ball") || g.includes("droplet") || g.includes("atom") || g.includes("nucleus")) return "sphere";
  if (g.includes("torus") || g.includes("ring") || g.includes("seal") || g.includes("coil") || g.includes("donut")) return "torus";
  if (g.includes("cone") || g.includes("nozzle") || g.includes("diffuser") || g.includes("corong")) return "cone";
  if (g.includes("plane") || g.includes("ground") || g.includes("terrain") || g.includes("grid") || g.includes("floor")) return "plane";
  if (g.includes("quad") || g.includes("panel") || g.includes("sheet") || g.includes("screen") || g.includes("display") || g.includes("pcb") || g.includes("plate")) return "quad";
  if (g.includes("box") || g.includes("block") || g.includes("chassis") || g.includes("board") || g.includes("chip")) return "box";
  return "cylinder";
}

/**
 * Universal 3D scene factory (Section 3.3).
 * Builds the scene purely from blueprint.components[] — no topic branching.
 */
export function generateScene(blueprint: VideoBlueprint): THREE.Group {
  const sceneGroup = new THREE.Group();
  sceneGroup.name = "KitabedahProceduralScene";

  if (!blueprint || !Array.isArray(blueprint.components) || blueprint.components.length === 0) {
    return sceneGroup;
  }

  let hasTerrainGrid = false;

  blueprint.components.forEach((comp: VideoBlueprintComponent, index: number) => {
    const rawGeom = comp.geometryType || comp.geometry || "cylinder";
    const geomType = normalizeGeometryType(rawGeom);
    const style = comp.style || "xray-blue";

    if (style === "wireframe-green") {
      hasTerrainGrid = true;
    }

    const creator = primitives[geomType] || primitives.cylinder;
    const meshGroup = creator({
      ...(comp.params || {}),
      style,
    });

    meshGroup.name = `node_${comp.id || `comp_${index}`}`;
    meshGroup.userData = {
      id: comp.id,
      // Ground planes are environment, not subject: the camera must not fit them.
      kind: geomType === "plane" ? "terrain" : "component",
      geometryType: geomType,
      behavior: comp.behavior || "static",
      axis: comp.axis || "z",
      initialPosition: comp.position3D || comp.position || [0, 0, 0],
      initialRotation: comp.rotation3D || comp.rotation || [0, 0, 0],
      explodeDirection: geomType === "plane" ? [0, -1, 0] : [0, 1, 0],
      componentIndex: index,
    };

    const pos = comp.position3D || comp.position || [0, 0, 0];
    meshGroup.position.set(pos[0], pos[1], pos[2]);

    const rot = comp.rotation3D || comp.rotation;
    if (rot && Array.isArray(rot) && rot.length === 3) {
      meshGroup.rotation.set(rot[0], rot[1], rot[2]);
    }

    sceneGroup.add(meshGroup);
  });

  // Green hologram terrain can also be requested at scene level.
  const wantsTerrain =
    hasTerrainGrid ||
    blueprint.subjectArchetype?.includes("TOLL") ||
    blueprint.subjectArchetype?.includes("TERRAIN") ||
    blueprint.subjectArchetype?.includes("ROAD");

  if (wantsTerrain && !sceneGroup.getObjectByName("WireframeTerrainMesh")) {
    const terrain = createWireframeTerrainMesh(26, 26, 96, 96, 2.0);
    terrain.name = "WireframeTerrainMesh";
    terrain.position.set(0, -3.2, 0);
    (terrain as any).userData = {
      id: "WireframeTerrainMesh",
      kind: "terrain",
      behavior: "static",
      axis: "y",
      initialPosition: [0, -3.2, 0],
      initialRotation: [0, 0, 0],
      explodeDirection: [0, -1, 0],
    };
    sceneGroup.add(terrain);
  }

  return sceneGroup;
}
