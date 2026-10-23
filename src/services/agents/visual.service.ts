import { generateStructuredOmniroute } from "@/lib/omniroute";
import { env } from "@/config/env";
import {
  SemanticIsoSceneSchema,
  RemotionCompositionPropsSchema,
  type DeconstructionBlueprint,
  type ScriptArchitectOutput,
  type TtsSynchronizerOutput,
  type RemotionCompositionProps,
  type FramePillCallout,
  type FrameSfxOverlay,
  type PhaseTimelineBlock,
  type SemanticIsoScene,
  type SemanticIsoPart,
  type Point3D,
} from "@/schemas/video-blueprint";
import { SEMANTIC_3D_ISOMETRIC_SCENE_SYSTEM_PROMPT } from "./prompts";
import {
  computeStageFit,
  project3DAnchor,
  type Point2D,
} from "@/iso";

export interface AABB3D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export function computePartAABB(part: SemanticIsoPart): AABB3D {
  const { shape, position: pos } = part;
  switch (shape.type) {
    case "box":
      return {
        minX: pos.x,
        maxX: pos.x + shape.dx,
        minY: pos.y,
        maxY: pos.y + shape.dy,
        minZ: pos.z,
        maxZ: pos.z + shape.dz,
      };
    case "sheet":
      return {
        minX: pos.x,
        maxX: pos.x + shape.dx,
        minY: pos.y,
        maxY: pos.y + shape.dy,
        minZ: pos.z,
        maxZ: pos.z + (shape.thickness ?? 0.2),
      };
    case "wedge":
      return {
        minX: pos.x,
        maxX: pos.x + shape.dx,
        minY: pos.y,
        maxY: pos.y + shape.dy,
        minZ: pos.z,
        maxZ: pos.z + shape.dz,
      };
    case "cylinder":
      return {
        minX: pos.x - shape.radius,
        maxX: pos.x + shape.radius,
        minY: pos.y - shape.radius,
        maxY: pos.y + shape.radius,
        minZ: pos.z,
        maxZ: pos.z + shape.height,
      };
    case "cutawayCylinder":
      return {
        minX: pos.x - shape.radius,
        maxX: pos.x + shape.radius,
        minY: pos.y - shape.radius,
        maxY: pos.y + shape.radius,
        minZ: pos.z,
        maxZ: pos.z + shape.height,
      };
    case "cutawayBox":
      return {
        minX: pos.x,
        maxX: pos.x + shape.dx,
        minY: pos.y,
        maxY: pos.y + shape.dy,
        minZ: pos.z,
        maxZ: pos.z + shape.dz,
      };
    case "extrudePolygon": {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const pt of shape.footprint) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      return {
        minX: pos.x + minX,
        maxX: pos.x + maxX,
        minY: pos.y + minY,
        maxY: pos.y + maxY,
        minZ: pos.z,
        maxZ: pos.z + shape.dz,
      };
    }
    case "pipe": {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      for (const pt of shape.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
        if (pt.z < minZ) minZ = pt.z;
        if (pt.z > maxZ) maxZ = pt.z;
      }
      const r = shape.radius ?? 0.3;
      return {
        minX: pos.x + minX - r,
        maxX: pos.x + maxX + r,
        minY: pos.y + minY - r,
        maxY: pos.y + maxY + r,
        minZ: pos.z + minZ - r,
        maxZ: pos.z + maxZ + r,
      };
    }
    case "waveSurface":
      return {
        minX: pos.x,
        maxX: pos.x + shape.dx,
        minY: pos.y,
        maxY: pos.y + shape.dy,
        minZ: pos.z,
        maxZ: pos.z + (shape.amplitude ?? 0.4) * 2,
      };
    case "sphere":
      return {
        minX: pos.x - shape.radius,
        maxX: pos.x + shape.radius,
        minY: pos.y - shape.radius,
        maxY: pos.y + shape.radius,
        minZ: pos.z - shape.radius,
        maxZ: pos.z + shape.radius,
      };
    default:
      return { minX: pos.x, maxX: pos.x + 1, minY: pos.y, maxY: pos.y + 1, minZ: pos.z, maxZ: pos.z + 1 };
  }
}

export function computePartCenter3D(part: SemanticIsoPart): Point3D {
  const { shape, position: pos } = part;
  switch (shape.type) {
    case "box":
      return { x: pos.x + shape.dx / 2, y: pos.y + shape.dy / 2, z: pos.z + shape.dz / 2 };
    case "sheet":
      return { x: pos.x + shape.dx / 2, y: pos.y + shape.dy / 2, z: pos.z + (shape.thickness ?? 0.2) / 2 };
    case "wedge":
      return { x: pos.x + shape.dx / 2, y: pos.y + shape.dy / 2, z: pos.z + shape.dz / 3 };
    case "cylinder":
    case "cutawayCylinder":
      return { x: pos.x, y: pos.y, z: pos.z + shape.height / 2 };
    case "cutawayBox":
      return { x: pos.x + shape.dx * 0.45, y: pos.y + shape.dy * 0.45, z: pos.z + shape.dz / 2 };
    case "pipe": {
      if (!shape.points.length) return pos;
      let sx = 0, sy = 0, sz = 0;
      for (const p of shape.points) {
        sx += p.x;
        sy += p.y;
        sz += p.z;
      }
      const n = shape.points.length;
      return { x: pos.x + sx / n, y: pos.y + sy / n, z: pos.z + sz / n };
    }
    case "waveSurface":
      return { x: pos.x + shape.dx / 2, y: pos.y + shape.dy / 2, z: pos.z + (shape.amplitude ?? 0.4) };
    case "sphere":
      return { x: pos.x, y: pos.y, z: pos.z };
    case "extrudePolygon": {
      if (!shape.footprint.length) return pos;
      let sx = 0, sy = 0;
      for (const p of shape.footprint) {
        sx += p.x;
        sy += p.y;
      }
      const n = shape.footprint.length;
      return { x: pos.x + sx / n, y: pos.y + sy / n, z: pos.z + shape.dz / 2 };
    }
    default:
      return pos;
  }
}

/**
 * Checks if part inner is nested inside outer (e.g. inside cutaway cavity or hollow cylinder).
 */
export function checkPartNesting(inner: SemanticIsoPart, outer: SemanticIsoPart): boolean {
  if (outer.shape.type === "cutawayBox") {
    const rx = outer.shape.cutRatioX ?? 0.5;
    const ry = outer.shape.cutRatioY ?? 0.5;
    const cutX = outer.position.x + outer.shape.dx * (1 - rx);
    const cutY = outer.position.y + outer.shape.dy * (1 - ry);
    const floorZ = outer.position.z + (outer.shape.floor ?? 0.4);

    // Inner is in the cutaway quadrant cavity
    const innerAabb = computePartAABB(inner);
    if (
      innerAabb.minX >= cutX - 0.6 &&
      innerAabb.minY >= cutY - 0.6 &&
      innerAabb.minZ >= floorZ - 0.6
    ) {
      return true;
    }
  }

  if (outer.shape.type === "cutawayCylinder") {
    // Front quadrant or inner hollow
    const innerAabb = computePartAABB(inner);
    if (innerAabb.minX >= outer.position.x - 0.5 && innerAabb.minY >= outer.position.y - 0.5) {
      return true;
    }
  }

  // Thin sheets or pipes placed on or within boundaries
  if (inner.shape.type === "sheet" || inner.shape.type === "pipe") {
    return true;
  }

  return false;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSemanticScene(
  scene: SemanticIsoScene,
  blueprint: DeconstructionBlueprint
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Part count (4 to 7 parts)
  if (scene.parts.length < 4 || scene.parts.length > 7) {
    errors.push(`Part count must be between 4 and 7, got ${scene.parts.length}`);
  }

  // 2. Exactly 1 cutaway part
  const cutawayParts = scene.parts.filter(
    (p) =>
      p.shape.type === "cutawayBox" ||
      p.shape.type === "cutawayCylinder" ||
      p.material === "cut"
  );
  if (cutawayParts.length !== 1) {
    errors.push(
      `Scene must have EXACTLY 1 cutaway part (got ${cutawayParts.length}). Use "cutawayBox", "cutawayCylinder", or material "cut".`
    );
  }

  // 3. All blueprint componentIds represented (multiple parts may share a componentId)
  for (const comp of blueprint.components) {
    const hasPart = scene.parts.some((p) => p.componentId === comp.componentId);
    if (!hasPart) {
      errors.push(
        `Blueprint component "${comp.name}" (id: ${comp.componentId}) has no corresponding visual part.`
      );
    }
  }

  // Compute AABB for each part
  const aabbs = scene.parts.map((p) => ({
    part: p,
    box: computePartAABB(p),
  }));

  // 4. Overall scene bounding box <= 12 x 12 x 8
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const item of aabbs) {
    if (item.box.minX < minX) minX = item.box.minX;
    if (item.box.maxX > maxX) maxX = item.box.maxX;
    if (item.box.minY < minY) minY = item.box.minY;
    if (item.box.maxY > maxY) maxY = item.box.maxY;
    if (item.box.minZ < minZ) minZ = item.box.minZ;
    if (item.box.maxZ > maxZ) maxZ = item.box.maxZ;
  }
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const spanZ = maxZ - minZ;

  if (spanX > 13.5 || spanY > 13.5 || spanZ > 9.5) {
    errors.push(
      `Overall scene bounding box (${spanX.toFixed(1)}x${spanY.toFixed(1)}x${spanZ.toFixed(1)}) exceeds limit of 12x12x8 grid units.`
    );
  }

  // 5. Pipe points must remain inside scene bounding box
  for (const p of scene.parts) {
    if (p.shape.type === "pipe") {
      for (let i = 0; i < p.shape.points.length; i++) {
        const pt = p.shape.points[i];
        const wx = p.position.x + pt.x;
        const wy = p.position.y + pt.y;
        const wz = p.position.z + pt.z;
        if (
          wx < minX - 0.5 ||
          wx > maxX + 0.5 ||
          wy < minY - 0.5 ||
          wy > maxY + 0.5 ||
          wz < minZ - 0.5 ||
          wz > maxZ + 0.5
        ) {
          errors.push(
            `Pipe "${p.name}" point #${i} (${wx}, ${wy}, ${wz}) extends outside the scene bounding box.`
          );
        }
      }
    }
  }

  // 6. Non-nested collisions between parts
  for (let i = 0; i < aabbs.length; i++) {
    for (let j = i + 1; j < aabbs.length; j++) {
      const pA = aabbs[i].part;
      const pB = aabbs[j].part;
      const bA = aabbs[i].box;
      const bB = aabbs[j].box;

      const overlapX = Math.max(0, Math.min(bA.maxX, bB.maxX) - Math.max(bA.minX, bB.minX));
      const overlapY = Math.max(0, Math.min(bA.maxY, bB.maxY) - Math.max(bA.minY, bB.minY));
      const overlapZ = Math.max(0, Math.min(bA.maxZ, bB.maxZ) - Math.max(bA.minZ, bB.minZ));

      if (overlapX > 0.3 && overlapY > 0.3 && overlapZ > 0.3) {
        const isNested = checkPartNesting(pA, pB) || checkPartNesting(pB, pA);
        if (!isNested) {
          errors.push(
            `Parts "${pA.name}" and "${pB.name}" collide/penetrate without being nested in a cutaway cavity.`
          );
        }
      }
    }
  }

  // 7. Check parts that share componentId move with matching offsets (warning only)
  for (let phase = 0; phase < 4; phase++) {
    const movingParts = scene.parts.filter((p) => {
      const st = p.states?.find((s) => s.phase === phase);
      return st && (st.offset3D.x !== 0 || st.offset3D.y !== 0 || st.offset3D.z !== 0);
    });
    for (let i = 0; i < movingParts.length; i++) {
      for (let j = i + 1; j < movingParts.length; j++) {
        const mA = movingParts[i];
        const mB = movingParts[j];
        if (mA.componentId === mB.componentId) {
          const stA = mA.states?.find((s) => s.phase === phase);
          const stB = mB.states?.find((s) => s.phase === phase);
          if (
            stA &&
            stB &&
            (stA.offset3D.x !== stB.offset3D.x ||
              stA.offset3D.y !== stB.offset3D.y ||
              stA.offset3D.z !== stB.offset3D.z)
          ) {
            warnings.push(
              `Parts "${mA.name}" and "${mB.name}" share componentId "${mA.componentId}" but move with different offsets in phase ${phase}.`
            );
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export async function runVisualChoreographerAgent(params: {
  jobId: string;
  aspectRatioMode?: "SHORTS_9_16" | "LANDSCAPE_16_9";
  blueprint: DeconstructionBlueprint;
  script: ScriptArchitectOutput;
  tts: TtsSynchronizerOutput;
}): Promise<RemotionCompositionProps> {
  const {
    jobId,
    aspectRatioMode = "SHORTS_9_16",
    blueprint,
    script,
    tts,
  } = params;

  const isLandscape = aspectRatioMode === "LANDSCAPE_16_9";
  const width = isLandscape ? 1920 : 1080;
  const height = isLandscape ? 1080 : 1920;

  // Base prompt to Agent 4
  let userPrompt = `Design a high-fidelity, deterministic 3D Semantic Cutaway Scene ("SemanticIsoSceneSchema") for:

TOPIC: "${blueprint.topic}"
CATEGORY: "${blueprint.everydayCategory}"
CORE MECHANISM: "${blueprint.coreSimpleTruth}"

BLUEPRINT COMPONENTS TO REPRESENT (Every componentId below MUST be mapped to at least 1 part; multiple parts may share a componentId):
${JSON.stringify(blueprint.components, null, 2)}

SCRIPT STORYBOARD (4 BEATS):
${JSON.stringify(
  script.segments.map((s) => ({
    segmentIndex: s.segmentIndex,
    chapterTitle: s.chapterTitle,
    pillLabels: s.pillLabels,
  })),
  null,
  2
)}

GEOMETRY & SCENE SPECIFICATIONS:
1. Provide 4 to 7 solid semantic 3D parts within a 12x12x8 grid volume.
2. EXACTLY 1 part must be a cutaway part ("cutawayBox" or "cutawayCylinder" or material "cut").
3. Internal core parts must be nested inside the cutaway cavity so they are clearly visible!
4. For "cutawayBox", use floor: 0.4 (default) so inner parts sit on a solid base.
5. Colors must be chosen from the 8 tokens: "shell", "water", "hot", "metal", "accent", "leaf", "purple", "cut".
6. Define 4 phase states (phase 0: assemble, phase 1: cutaway shift/reveal, phase 2: zoom-in & isolation with dim on other parts, phase 3: full assembly).
7. Return ONLY valid JSON matching SemanticIsoSceneSchema.`;

  let visualScene: SemanticIsoScene | null = null;
  let validation: ValidationResult = { valid: false, errors: [], warnings: [] };
  let attempts = 0;

  while (attempts < 3) {
    let currentPrompt = userPrompt;
    if (validation.errors.length > 0) {
      currentPrompt += `\n\nCRITICAL FIX REQUIRED (PREVIOUS ATTEMPT FAILED GEOMETRIC VALIDATION):\n${validation.errors
        .map((e) => `- ${e}`)
        .join("\n")}\nFix these errors immediately and regenerate the scene JSON.`;
    }

    const response = await generateStructuredOmniroute<SemanticIsoScene>({
      systemPrompt: SEMANTIC_3D_ISOMETRIC_SCENE_SYSTEM_PROMPT,
      userPrompt: currentPrompt,
      schema: SemanticIsoSceneSchema,
      preferredModel: env.OMNIROUTE_PRIMARY_MODEL,
      temperature: 0.2,
    });

    visualScene = response.data;
    validation = validateSemanticScene(visualScene, blueprint);

    if (validation.warnings.length > 0) {
      console.warn(`[VISUAL_VALIDATOR_WARNING]`, validation.warnings);
    }

    if (validation.valid) {
      break;
    }

    console.warn(`[VISUAL_VALIDATOR_RETRY #${attempts + 1}] Validation errors:`, validation.errors);
    attempts++;
  }

  if (!visualScene || !validation.valid) {
    throw new Error(
      `Visual scene generator failed geometric validation after 3 attempts: ${validation.errors.join("; ")}`
    );
  }

  // Collect sample 3D points across all parts to compute stage auto-fit
  const allScenePoints3D: Point3D[] = [];
  for (const part of visualScene.parts) {
    const aabb = computePartAABB(part);
    allScenePoints3D.push(
      { x: aabb.minX, y: aabb.minY, z: aabb.minZ },
      { x: aabb.maxX, y: aabb.minY, z: aabb.minZ },
      { x: aabb.minX, y: aabb.maxY, z: aabb.minZ },
      { x: aabb.maxX, y: aabb.maxY, z: aabb.minZ },
      { x: aabb.minX, y: aabb.minY, z: aabb.maxZ },
      { x: aabb.maxX, y: aabb.minY, z: aabb.maxZ },
      { x: aabb.minX, y: aabb.maxY, z: aabb.maxZ },
      { x: aabb.maxX, y: aabb.maxY, z: aabb.maxZ }
    );
  }

  const fitConfig = computeStageFit(allScenePoints3D, {
    stageCenterX: width / 2,
    stageCenterY: isLandscape ? 540 : 1000,
    maxStageWidth: isLandscape ? 1200 : 800,
    maxStageHeight: isLandscape ? 700 : 860,
  });

  // Camera presets per beat
  const c2Zoom = blueprint.components[2]?.zoomTarget ?? {
    x: 0,
    y: 90,
    scale: 1.6,
  };
  const cameraPresets = [
    { x: 0, y: 0, scale: 1.0 },
    { x: 0, y: -30, scale: 1.18 },
    {
      x: c2Zoom.x,
      y: c2Zoom.y,
      scale: Math.min(1.85, Math.max(1.35, c2Zoom.scale)),
    },
    { x: 0, y: 12, scale: 1.02 },
  ];

  const phases: PhaseTimelineBlock[] = [];
  const pillCallouts: FramePillCallout[] = [];
  const sfxOverlays: FrameSfxOverlay[] = [];

  for (let i = 0; i < 4; i++) {
    const scriptSeg = script.segments[i];
    const ttsSeg = tts.segments[i];
    const bpPhase = blueprint.phases[i];
    const camPreset = cameraPresets[i] ?? cameraPresets[0];

    phases.push({
      segmentIndex: i,
      phaseType: scriptSeg.phaseType,
      chapterTitle: scriptSeg.chapterTitle,
      narrationText: scriptSeg.narrationText,
      audioUrl: ttsSeg.audioUrl,
      startFrame: ttsSeg.startFrame,
      endFrame: ttsSeg.endFrame,
      durationInFrames: ttsSeg.durationInFrames,
      wordTimings: ttsSeg.wordTimings,
      camera: {
        startFrame: ttsSeg.startFrame,
        endFrame: ttsSeg.endFrame,
        ...camPreset,
      },
      primaryMetric: scriptSeg.primaryMetric,
      statusBadge: scriptSeg.statusBadge,
      secondaryMetric: scriptSeg.secondaryMetric,
      activeComponentIds:
        bpPhase?.focusComponentIds ??
        visualScene.parts.map((p) => p.componentId),
      showChecklistCard: scriptSeg.showChecklistCard ?? i === 3,
    });

    // Compute pill callout anchors using 3D projected coordinates
    // When multiple parts share the same componentId, anchor is taken from the FIRST matching part
    const phasePills: { pill: FramePillCallout; anchor: Point2D }[] = [];

    for (const pill of scriptSeg.pillLabels) {
      const matchedPart = visualScene.parts.find(
        (p) => p.componentId === pill.componentId
      );

      const center3D = matchedPart
        ? computePartCenter3D(matchedPart)
        : { x: 6, y: 6, z: 2 };

      // Apply any phase offset3D to center
      const partPhaseState = matchedPart?.states?.find((s) => s.phase === i);
      if (partPhaseState?.offset3D) {
        center3D.x += partPhaseState.offset3D.x;
        center3D.y += partPhaseState.offset3D.y;
        center3D.z += partPhaseState.offset3D.z;
      }

      const rawAnchor = project3DAnchor(center3D, fitConfig);

      // Prevent pill overlap: if another pill in the same phase has close anchor, nudge Y
      for (const prev of phasePills) {
        const dy = Math.abs(rawAnchor.y - prev.anchor.y);
        const dx = Math.abs(rawAnchor.x - prev.anchor.x);
        if (dy < 85 && dx < 220) {
          if (rawAnchor.y + 90 <= (isLandscape ? 850 : 1440)) {
            rawAnchor.y += 90;
          } else {
            rawAnchor.y -= 90;
          }
        }
      }

      // Find narration word timing for anticipation trigger
      const cleanPillTerms = pill.text
        .replace(/[→←\-><]/g, "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      const cleanPartTerms = (matchedPart?.name || "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      const searchTerms = [...cleanPillTerms, ...cleanPartTerms];

      const matchedWord = ttsSeg.wordTimings.find((wt) => {
        const cleanW = wt.word.toLowerCase().replace(/[^a-z0-9]/g, "");
        return searchTerms.some(
          (term) => cleanW.includes(term) || term.includes(cleanW)
        );
      });

      const anticipationFrames = Math.round(0.2 * tts.fps);
      const baseTriggerFrame = matchedWord
        ? Math.max(ttsSeg.startFrame, matchedWord.startFrame - anticipationFrames)
        : ttsSeg.startFrame + Math.min(30, Math.floor(ttsSeg.durationInFrames * 0.15));

      const startFrame = baseTriggerFrame;
      const pillDurationFrames = Math.min(
        Math.round((pill.durationSeconds ?? 4.0) * tts.fps),
        Math.max(90, ttsSeg.endFrame - startFrame - 6)
      );
      const endFrame = Math.max(startFrame + 75, startFrame + pillDurationFrames);

      const callout: FramePillCallout = {
        id: pill.id,
        componentId: pill.componentId,
        startFrame,
        endFrame,
        text: pill.text,
        direction: pill.direction,
        anchor: rawAnchor,
      };

      phasePills.push({ pill: callout, anchor: rawAnchor });
      pillCallouts.push(callout);
    }

    if (scriptSeg.sfxCue) {
      const cleanSfx = scriptSeg.sfxCue.text.toLowerCase().replace(/[^a-z0-9]/g, "");
      const matchedSfxWord = ttsSeg.wordTimings.find((wt) => {
        const w = wt.word.toLowerCase().replace(/[^a-z0-9]/g, "");
        return w.includes(cleanSfx) || cleanSfx.includes(w);
      });

      const sfxStartFrame = matchedSfxWord
        ? Math.max(ttsSeg.startFrame, matchedSfxWord.startFrame - Math.round(0.12 * tts.fps))
        : ttsSeg.startFrame + Math.floor(ttsSeg.durationInFrames * (scriptSeg.sfxCue.relativeTriggerRatio ?? 0.25));

      const sfxEndFrame = Math.min(ttsSeg.endFrame - 6, sfxStartFrame + 120);

      sfxOverlays.push({
        id: `sfx_overlay_${i}`,
        startFrame: sfxStartFrame,
        endFrame: Math.max(sfxStartFrame + 60, sfxEndFrame),
        text: scriptSeg.sfxCue.text,
        variant: scriptSeg.sfxCue.variant,
        x: scriptSeg.sfxCue.x,
        y: scriptSeg.sfxCue.y,
        rotateDeg: scriptSeg.sfxCue.rotateDeg,
      });
    }
  }

  const compositionProps: RemotionCompositionProps = {
    jobId,
    topic: blueprint.topic,
    laymanHookTitle: blueprint.laymanHookTitle,
    everydayCategory: blueprint.everydayCategory,
    coreSimpleTruth: blueprint.coreSimpleTruth,
    width,
    height,
    fps: tts.fps,
    durationInFrames: tts.totalDurationInFrames,
    aspectRatioMode,
    practicalChecklist: script.practicalChecklist,
    visualScene,
    phases,
    pillCallouts,
    sfxOverlays,
    sfxTriggers: tts.sfxTriggers ?? [],
  };

  return RemotionCompositionPropsSchema.parse(compositionProps);
}
