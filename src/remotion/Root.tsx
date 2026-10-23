import React from "react";
import { Composition } from "remotion";
import { BedahVideoComposition } from "./compositions/BedahVideoComposition";
import { RemotionCompositionPropsSchema } from "@/schemas/video-blueprint";
import {
  buildDefaultCompositionProps,
  buildSolarPanelCompositionProps,
  buildTsunamiCompositionProps,
} from "./default-props";

export const RemotionRoot: React.FC = () => {
  const defaultProps = buildDefaultCompositionProps();
  const solarPanelProps = buildSolarPanelCompositionProps();
  const tsunamiProps = buildTsunamiCompositionProps();

  return (
    <>
      <Composition
        id="BedahVideoShorts"
        component={BedahVideoComposition}
        durationInFrames={defaultProps.durationInFrames}
        fps={60}
        width={1080}
        height={1920}
        schema={RemotionCompositionPropsSchema}
        defaultProps={defaultProps}
      />
      <Composition
        id="SolarPanelShorts"
        component={BedahVideoComposition}
        durationInFrames={solarPanelProps.durationInFrames}
        fps={60}
        width={1080}
        height={1920}
        schema={RemotionCompositionPropsSchema}
        defaultProps={solarPanelProps}
      />
      <Composition
        id="TsunamiShorts"
        component={BedahVideoComposition}
        durationInFrames={tsunamiProps.durationInFrames}
        fps={60}
        width={1080}
        height={1920}
        schema={RemotionCompositionPropsSchema}
        defaultProps={tsunamiProps}
      />
      <Composition
        id="BedahVideoComposition"
        component={BedahVideoComposition}
        durationInFrames={defaultProps.durationInFrames}
        fps={60}
        width={1920}
        height={1080}
        schema={RemotionCompositionPropsSchema}
        defaultProps={{
          ...defaultProps,
          width: 1920,
          height: 1080,
          aspectRatioMode: "LANDSCAPE_16_9",
        }}
      />
    </>
  );
};
