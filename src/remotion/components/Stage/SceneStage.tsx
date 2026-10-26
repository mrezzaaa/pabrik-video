import React from "react";
import type { SceneLayout, VisualScene } from "../../../lib/types";
import { BRollFrame } from "./BRollFrame";
import { FullKineticImpact } from "./FullKineticImpact";
import { HeroStatCard } from "./HeroStatCard";
import { SplitComparison } from "./SplitComparison";

/** Vertical safe zone for the center stage (1080x1920). */
export const STAGE_TOP = 420;
export const STAGE_HEIGHT = 930;

function layoutFor(scene: VisualScene): SceneLayout {
  if (scene.layout) return scene.layout;
  if (scene.visual?.kind === "stat") return "HERO_STAT_CARD";
  if (scene.visual?.kind === "compare") return "SPLIT_COMPARISON";
  if (scene.visual?.kind === "stamp") return "FULL_KINETIC_IMPACT";
  return "B_ROLL_FRAME";
}

/**
 * Center visual stage. Four structurally different templates rotate across
 * scenes; the stage owns Y 420-1350 so the middle of the reel is never empty.
 */
export const SceneStage: React.FC<{
  scene: VisualScene;
  index: number;
}> = ({ scene, index }) => {
  const layout = layoutFor(scene);
  const accent = scene.accentColor || "#39FF14";
  const theme = scene.theme ?? "info";
  const props = { scene, index, accent, theme };

  return (
    <div
      style={{
        position: "absolute",
        top: STAGE_TOP,
        height: STAGE_HEIGHT,
        left: 60,
        right: 60,
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      {layout === "HERO_STAT_CARD" ? <HeroStatCard {...props} /> : null}
      {layout === "B_ROLL_FRAME" ? <BRollFrame {...props} /> : null}
      {layout === "SPLIT_COMPARISON" ? <SplitComparison {...props} /> : null}
      {layout === "FULL_KINETIC_IMPACT" ? (
        <FullKineticImpact {...props} />
      ) : null}
    </div>
  );
};
