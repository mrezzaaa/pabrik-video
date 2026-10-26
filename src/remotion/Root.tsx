import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { VideoProps } from "../lib/types";
import { KitabedahVideo, KitabedahVideoProps } from "./KitabedahVideo";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./constants";
import {
  JALAN_TOL_BLUEPRINT,
  TURBO_BLUEPRINT,
  LAPTOP_BLUEPRINT,
} from "../lib/scene/fixtures";

const defaultProps: VideoProps = {
  videoTitle: "Blueprint Demo",
  themeColor: "#38BDF8",
  totalDurationInFrames: 300,
  fps: VIDEO_FPS,
  width: VIDEO_WIDTH,
  height: VIDEO_HEIGHT,
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
    },
  ],
};

/** Total timeline length derived by accumulating every phase (never parallel). */
function totalFramesOf(blueprint: { phases?: Array<any> }): number {
  const phases = blueprint.phases || [];
  let from = 0;
  for (const phase of phases) {
    const dur = phase.durationInFrames
      ? phase.durationInFrames
      : Math.round((phase.duration || 5) * VIDEO_FPS);
    from += Math.max(1, dur);
  }
  return Math.max(1, from || 450);
}

const tollProps: KitabedahVideoProps = {
  visualStyle: "blueprint",
  blueprint: JALAN_TOL_BLUEPRINT,
};

const turboProps: KitabedahVideoProps = {
  visualStyle: "xray",
  blueprint: TURBO_BLUEPRINT,
};

const laptopProps: KitabedahVideoProps = {
  visualStyle: "xray",
  blueprint: LAPTOP_BLUEPRINT,
};

export const SAMPLE_KITABEDAH_PROPS: KitabedahVideoProps = tollProps;

/**
 * Every composition reads its duration from the accumulated phase list so the
 * last phase is never cut off and frames never stack.
 */
const metadataFor = (props: KitabedahVideoProps) => ({
  durationInFrames: totalFramesOf(props.blueprint || {}),
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Kitabedah"
        component={KitabedahVideo}
        durationInFrames={495}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={tollProps}
        calculateMetadata={({ props }) =>
          metadataFor(props as KitabedahVideoProps)
        }
      />
      <Composition
        id="KitabedahTurbo"
        component={KitabedahVideo}
        durationInFrames={450}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={turboProps}
        calculateMetadata={({ props }) =>
          metadataFor(props as KitabedahVideoProps)
        }
      />
      <Composition
        id="KitabedahLaptop"
        component={KitabedahVideo}
        durationInFrames={450}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={laptopProps}
        calculateMetadata={({ props }) =>
          metadataFor(props as KitabedahVideoProps)
        }
      />
      <Composition
        id="MainVideo"
        component={MainVideo}
        durationInFrames={300}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultProps}
      />
    </>
  );
};
