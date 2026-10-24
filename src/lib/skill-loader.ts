import fs from "fs";
import path from "path";

const DEFAULT_BOOTSTRAP_CONTENT = `---
name: anatomy
description: Universal Physical & Mechanical Anatomy Breakdown Playbook for Explanatory 3D Cutaways
---

# UNIVERSAL PHYSICAL & MECHANICAL ANATOMY PLAYBOOK (KITABEDAH 3D EDITORIAL)

## Core Philosophy: The Object IS The Explanation
Never draw abstract diagrams or floating blocks. Deconstruct any technical or scientific concept into a real physical object with tangible parts, clear spatial hierarchy, and visible cause-and-effect.

## The 4 Anatomical Layers:
1. **Layer 1: OUTER_CUTAWAY_SHELL**
   - The recognizable exterior housing/casing/body of the object.
   - Sliced with a 90° cutaway (or 270° radial arc) so viewers can see inside the internal cavity.
   - Crisp #1E293B silhouette edges with smooth cel-shaded surfaces.

2. **Layer 2: INTERNAL_CHAMBER**
   - The interior cavity, fluid reservoir, pressure chamber, or internal chassis.
   - Must be nested strictly inside the boundaries of Layer 1.

3. **Layer 3: CORE_MECHANISM**
   - The primary active physical mechanism that drives the phenomenon (e.g., piston, impeller, heating element, coil, PN junction, rotor).
   - Responsible for the core physical state change.

4. **Layer 4: ZOOM_SUBPART**
   - The critical precision component zoomed in during Act 3 (e.g., pressure release weight, safety valve seal, micro-nozzle, busbar contact, latch pin).

## Coaxial & Spatial Nesting Rules:
- Inner parts MUST have strictly smaller radial/geometric bounds than outer shells.
- Never place multiple components overlapping at identical coordinates without intentional nesting.
- Parts must rest on real mountings or be held by real physical fasteners/chassis.

## Layman Cause-and-Effect Translation:
- Translate invisible or complex physics into visible physical interactions:
  - High pressure -> gas expanding, lifting a weighted safety valve.
  - Heat conduction -> thermal gradient, color shift, convection flow.
  - Electricity generation -> electron flow along visible conductors, voltage step-up.
`;

export async function loadAgentSkill(
  skillPath = ".agents/skill/anatomy"
): Promise<string> {
  const cwd = process.cwd();
  let resolvedPath = path.resolve(cwd, skillPath);

  // If path doesn't exist, check singular vs plural (.agents/skill vs .agents/skills)
  if (!fs.existsSync(resolvedPath)) {
    if (skillPath.includes(".agents/skill/")) {
      const altPath = path.resolve(
        cwd,
        skillPath.replace(".agents/skill/", ".agents/skills/")
      );
      if (fs.existsSync(altPath)) {
        resolvedPath = altPath;
      }
    } else if (skillPath.includes(".agents/skills/")) {
      const altPath = path.resolve(
        cwd,
        skillPath.replace(".agents/skills/", ".agents/skill/")
      );
      if (fs.existsSync(altPath)) {
        resolvedPath = altPath;
      }
    }
  }

  // If still not found, check if a .md file exists
  if (!fs.existsSync(resolvedPath) && fs.existsSync(`${resolvedPath}.md`)) {
    resolvedPath = `${resolvedPath}.md`;
  }

  // If still does not exist on disk, bootstrap .agents/skill/anatomy/SKILL.md
  if (!fs.existsSync(resolvedPath)) {
    const bootstrapDir = path.resolve(cwd, ".agents/skill/anatomy");
    fs.mkdirSync(bootstrapDir, { recursive: true });
    const bootstrapFile = path.join(bootstrapDir, "SKILL.md");
    fs.writeFileSync(bootstrapFile, DEFAULT_BOOTSTRAP_CONTENT, "utf-8");
    resolvedPath = bootstrapFile;
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isFile()) {
    return fs.readFileSync(resolvedPath, "utf-8");
  }

  if (stat.isDirectory()) {
    // Check if SKILL.md exists in the directory
    const skillMdPath = path.join(resolvedPath, "SKILL.md");
    let accumulatedContent = "";

    if (fs.existsSync(skillMdPath)) {
      accumulatedContent = fs.readFileSync(skillMdPath, "utf-8");
    }

    if (!accumulatedContent.trim()) {
      accumulatedContent = DEFAULT_BOOTSTRAP_CONTENT;
    }

    // Ensure universal 4-layer guidelines are present
    if (!accumulatedContent.includes("OUTER_CUTAWAY_SHELL")) {
      accumulatedContent = DEFAULT_BOOTSTRAP_CONTENT + "\n\n" + accumulatedContent.slice(0, 4000);
    }

    return accumulatedContent;
  }

  return DEFAULT_BOOTSTRAP_CONTENT;
}
