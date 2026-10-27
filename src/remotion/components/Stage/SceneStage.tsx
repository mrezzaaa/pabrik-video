import React from "react";
import type { VisualScene } from "../../../lib/types";
import { CognitiveWave } from "./CognitiveWave";
import { ComparisonBars } from "./ComparisonBars";
import { KenBurnsImageFrame } from "./KenBurnsImageFrame";
import { OdometerCounter } from "./OdometerCounter";
import { RangeGauge } from "./RangeGauge";

/** Vertical safe zone for the center stage (1080x1920). */
export const STAGE_TOP = 280;
export const STAGE_HEIGHT = 1000;

/**
 * Center stage dispatcher. The stage NEVER renders the spoken transcript:
 * it is either real SearXNG b-roll or an animated data graphic containing
 * numbers and 1-2 word axis labels only.
 */
export const SceneStage: React.FC<{
  scene: VisualScene;
  index: number;
}> = ({ scene }) => {
  const stage = (() => {
    switch (scene.visualType) {
      case "SVG_COUNTER":
        return <OdometerCounter scene={scene} />;
      case "SVG_GAUGE":
        return <RangeGauge scene={scene} />;
      case "SVG_BAR_CHART":
        return <ComparisonBars scene={scene} />;
      case "SVG_WAVEFORM":
        return <CognitiveWave scene={scene} />;
      case "B_ROLL_IMAGE":
        return <KenBurnsImageFrame scene={scene} />;
      default:
        return null;
    }
  })();

  if (!stage) return null;

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
        overflow: "hidden",
        borderRadius: 4,
      }}
    >
      {stage}
    </div>
  );
};
