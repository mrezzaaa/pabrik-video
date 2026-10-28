import React from "react";
import type { VisualScene } from "../../../lib/types";
import { CognitiveWave } from "./CognitiveWave";
import { ComparisonBars } from "./ComparisonBars";
import {
  CompareStage,
  CrossSectionStage,
  StampStage,
  TimelineStage,
} from "./EditorialStages";
import { KenBurnsImageFrame } from "./KenBurnsImageFrame";
import { OdometerCounter } from "./OdometerCounter";
import { RangeGauge } from "./RangeGauge";

/** Vertical safe zone for the center stage data graphics (1080x1920). */
export const STAGE_TOP = 280;
export const STAGE_HEIGHT = 1000;

/**
 * Center stage dispatcher.
 * When B_ROLL_IMAGE is used, it renders FULL BLEED (1080x1920) across the entire screen
 * so the viewer stays focused without visual fragmentation or disjointed frames.
 * For animated data graphics (counters, gauges, charts), they stay centered in the safe zone.
 */
export const SceneStage: React.FC<{
  scene: VisualScene;
  index: number;
}> = ({ scene, index }) => {
  const isImage = scene.visualType === "B_ROLL_IMAGE";

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
      case "SVG_STAMP":
        return <StampStage scene={scene} index={index} />;
      case "SVG_COMPARE":
        return <CompareStage scene={scene} index={index} />;
      case "SVG_CROSSSECTION":
        return <CrossSectionStage scene={scene} index={index} />;
      case "SVG_TIMELINE":
        return <TimelineStage scene={scene} index={index} />;
      case "B_ROLL_IMAGE":
        return <KenBurnsImageFrame scene={scene} />;
      default:
        return null;
    }
  })();

  if (!stage) return null;

  if (isImage) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {stage}
      </div>
    );
  }

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
      }}
    >
      {stage}
    </div>
  );
};
