import React from "react";
import { AbsoluteFill } from "remotion";
import type { RemotionCompositionProps } from "@/schemas/video-blueprint";
import { IsometricStage } from "../components/IsometricStage";
import { TelemetryHUD } from "../components/TelemetryHUD";
import { PopUpCalloutLayer } from "../components/PopUpCallout";
import { AudioTrack } from "../components/AudioTrack";

export const BedahVideoComposition: React.FC<RemotionCompositionProps> = (
  props
) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#090D16",
        color: "#F8FAFC",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Layer 1: Isometric 3D Vector Stage (<IsometricStage />) */}
      <IsometricStage
        layers={props.isometricLayers}
        phases={props.phases}
        primaryArchetype={props.primaryArchetype}
        coreEquationOrLaw={props.coreEquationOrLaw}
      />

      {/* Layer 2: Top Telemetry HUD (<TelemetryHUD />) */}
      <TelemetryHUD
        normalizedTitle={props.normalizedTitle}
        engineeringCategory={props.engineeringCategory}
        channels={props.telemetryChannels}
        phases={props.phases}
        totalDurationInFrames={props.durationInFrames}
      />

      {/* Layer 3: Dynamic Pop-up Callouts (<PopUpCalloutLayer />) */}
      <PopUpCalloutLayer callouts={props.callouts} />

      {/* Synchronized Audio Track (UnlimitedTTS id-ID Ethan 1.1x chunks) */}
      <AudioTrack phases={props.phases} />
    </AbsoluteFill>
  );
};
