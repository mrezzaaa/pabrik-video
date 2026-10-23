import React from "react";
import { Composition } from "remotion";
import { KitabedahMain } from "./compositions/KitabedahMain";
import { BedahVideoComposition } from "./compositions/BedahVideoComposition";
import {
  RemotionCompositionPropsSchema,
  KitabedahCompositionPropsSchema,
} from "@/schemas/video-blueprint";
import {
  buildDefaultCompositionProps,
  buildSolarPanelCompositionProps,
  buildTsunamiCompositionProps,
} from "./default-props";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./constants";

export const RemotionRoot: React.FC = () => {
  const defaultProps = buildDefaultCompositionProps();
  const solarPanelProps = buildSolarPanelCompositionProps();
  const tsunamiProps = buildTsunamiCompositionProps();

  return (
    <>
      {/* 1. Primary Dynamic Composition: KitabedahMain (1080x1920 @ 30fps) */}
      <Composition
        id="KitabedahMain"
        component={KitabedahMain as React.FC<any>}
        durationInFrames={defaultProps.durationInFrames}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultProps}
      />

      {/* 2. BedahVideoShorts alias to KitabedahMain for seamless pipeline rendering */}
      <Composition
        id="BedahVideoShorts"
        component={KitabedahMain as React.FC<any>}
        durationInFrames={defaultProps.durationInFrames}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultProps}
      />

      {/* 3. Legacy BedahVideoComposition kept at 1080x1920 30fps */}
      <Composition
        id="BedahVideoComposition"
        component={KitabedahMain as React.FC<any>}
        durationInFrames={defaultProps.durationInFrames}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultProps}
      />

      {/* 4. Fixture Previews */}
      <Composition
        id="SolarPanelShorts"
        component={KitabedahMain as React.FC<any>}
        durationInFrames={solarPanelProps.durationInFrames}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={solarPanelProps}
      />

      <Composition
        id="TsunamiShorts"
        component={KitabedahMain as React.FC<any>}
        durationInFrames={tsunamiProps.durationInFrames}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={tsunamiProps}
      />
    </>
  );
};
