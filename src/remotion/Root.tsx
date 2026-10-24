import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { VideoProps } from "../lib/types";
import { TechVideo } from "./TechVideo";
import { SAMPLE_PISTON_PROPS, TechVideoProps } from "../lib/tech-storyboard";

const defaultProps: VideoProps = {
  videoTitle: "Blueprint Demo",
  themeColor: "#38BDF8",
  totalDurationInFrames: 300,
  fps: 30,
  width: 1080,
  height: 1920,
  scenes: [
    {
      sceneId: 1,
      narration: "Ini cara kerja mesin jet turbofan di ketinggian tiga puluh ribu kaki.",
      durationInFrames: 150,
      durationMs: 5000,
      mainVisual: {
        sourceType: "SEARXNG_IMAGE",
        searchQuery: "jet engine turbofan cutaway",
        cameraShot: "XRAY_WIREFRAME_SCAN",
        overlayHeadline: "TURBOFAN CORE",
        callouts: [
          { label: "KOMPRESOR TINGGI", detail: "Tekanan 40:1", x: 38, y: 44 },
          { label: "TURBIN TEKANAN TINGGI", detail: "Suhu 1700°C", x: 68, y: 62 },
        ],
      },
      cutaway: {
        enabled: true,
        triggerAtProgress: 0.5,
        sourceType: "SEARXNG_IMAGE",
        searchQuery: "jet turbine blades combustion",
        cameraShot: "KEN_BURNS_ZOOM_IN",
        graphicOverlay: {
          type: "STAT_COUNTER",
          value: "1700°C",
          label: "Combustion Chamber",
          iconName: "Flame",
        },
      },
      transitionToNext: "FLASH_CUT",
      wordTimestamps: [
        { word: "Ini", startMs: 0, endMs: 300 },
        { word: "cara", startMs: 300, endMs: 650 },
        { word: "kerja", startMs: 650, endMs: 1100 },
        { word: "mesin", startMs: 1100, endMs: 1600 },
        { word: "jet", startMs: 1600, endMs: 2000 },
        { word: "turbofan", startMs: 2000, endMs: 2700 },
        { word: "di", startMs: 2700, endMs: 2900 },
        { word: "ketinggian", startMs: 2900, endMs: 3700 },
        { word: "tiga", startMs: 3700, endMs: 4100 },
        { word: "puluh", startMs: 4100, endMs: 4400 },
        { word: "ribu", startMs: 4400, endMs: 4700 },
        { word: "kaki.", startMs: 4700, endMs: 5000 },
      ],
    },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        component={MainVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
      <Composition
        id="TechVideo"
        component={TechVideo}
        durationInFrames={SAMPLE_PISTON_PROPS.totalDurationInFrames}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={SAMPLE_PISTON_PROPS as TechVideoProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(1, props.totalDurationInFrames),
        })}
      />
    </>
  );
};
