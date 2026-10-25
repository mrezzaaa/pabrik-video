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
  "chamber",
]);

/**
 * Normalizes any LLM geometry string into safe supported primitive type
 */
export function normalizeGeometryType(raw: string): GeometryType {
  const g = String(raw || "").trim().toLowerCase();
  if (VALID_GEOMETRIES.has(g)) {
    return g as GeometryType;
  }
  // Tolerant smart synonyms
  if (g.includes("road") || g.includes("highway") || g.includes("bridge") || g.includes("tol")) return "road";
  if (g.includes("pillar") || g.includes("column") || g.includes("pier") || g.includes("tiang")) return "pillar";
  if (g.includes("fan") || g.includes("rotor") || g.includes("blade") || g.includes("propeller") || g.includes("turbine")) return "fan";
  if (g.includes("sphere") || g.includes("ball") || g.includes("droplet") || g.includes("atom") || g.includes("nucleus")) return "sphere";
  if (g.includes("torus") || g.includes("ring") || g.includes("seal") || g.includes("coil") || g.includes("donut")) return "torus";
  if (g.includes("cone") || g.includes("nozzle") || g.includes("diffuser") || g.includes("corong")) return "cone";
  if (g.includes("plane") || g.includes("ground") || g.includes("grid") || g.includes("plate")) return "plane";
  if (g.includes("box") || g.includes("block") || g.includes("chassis") || g.includes("board") || g.includes("chip")) return "box";
  return "cylinder";
}

/**
 * Universal 3D Scene Generator (Section 3.3)
 * JANGAN HARDCODE if topic === "jet" else if "car".
 * Builds a dynamic Three.js Group purely from blueprint.components[] Lego bricks.
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

    // Detect if this component or visual style specifies neon green wireframe terrain
    if (style === "wireframe-green" || geomType === "plane" && (comp.params as any)?.isTerrain) {
      hasTerrainGrid = true;
    }

    const creator = primitives[geomType] || primitives.cylinder;
    const primitiveParams = {
      ...(comp.params || {}),
      style,
    };

    const meshGroup = creator(primitiveParams);
    meshGroup.name = `node_${comp.id || `comp_${index}`}`;
    (meshGroup as any).userData = {
      id: comp.id,
      behavior: comp.behavior || "static",
      axis: comp.axis || "z",
      initialPosition: comp.position3D || comp.position || [0, 0, 0],
      initialRotation: comp.rotation3D || comp.rotation || [0, 0, 0],
    };

    // 3D Position
    const pos = comp.position3D || comp.position || [0, 0, 0];
    meshGroup.position.set(pos[0], pos[1], pos[2]);

    // 3D Rotation
    const rot = comp.rotation3D || comp.rotation;
    if (rot && Array.isArray(rot) && rot.length === 3) {
      meshGroup.rotation.set(rot[0], rot[1], rot[2]);
    }

    sceneGroup.add(meshGroup);
  });

  // If blueprint specifies green wireframe terrain or toll road elevated, add terrain floor
  const isTollOrLandscape =
    blueprint.subjectArchetype?.includes("TOLL") ||
    blueprint.subjectArchetype?.includes("TERRAIN") ||
    blueprint.subjectArchetype?.includes("ROAD") ||
    hasTerrainGrid;

  if (isTollOrLandscape && !sceneGroup.getObjectByName("WireframeTerrainMesh")) {
    const terrain = createWireframeTerrainMesh(26, 26, 44, 44, 2.2);
    terrain.name = "WireframeTerrainMesh";
    terrain.position.set(0, -3.2, 0);
    (terrain as any).userData = {
      id: "WireframeTerrainMesh",
      behavior: "static",
      axis: "y",
      initialPosition: [0, -3.2, 0],
      initialRotation: [0, 0, 0],
    };
    sceneGroup.add(terrain);
  }

  return sceneGroup;
}
