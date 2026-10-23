import React from "react";
import { AbsoluteFill } from "remotion";
import type { RemotionCompositionProps } from "@/schemas/video-blueprint";
import { IsometricStage } from "../components/IsometricStage";
import { TelemetryHUD } from "../components/TelemetryHUD";
import { PopUpCalloutLayer } from "../components/PopUpCallout";
import { SubtitleOverlay } from "../components/SubtitleOverlay";
import { AudioTrack } from "../components/AudioTrack";

export const BedahVideoComposition: React.FC<RemotionCompositionProps> = (
  props,
) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#F8F9FA",
        color: "#0F172A",
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Layer 1: Pure Data-Driven Parametric Cutaway Stage (<IsometricStage />) */}
      <IsometricStage scene={props.scene} phases={props.phases} />

      {/* Layer 2: Simplified Clean Editorial Header (<TelemetryHUD />) */}
      <TelemetryHUD phases={props.phases} />

      {/* Layer 3: Dark Pill Pointers, Comic SFX Text & Practical Checklist (<PopUpCalloutLayer />) */}
      <PopUpCalloutLayer
        pillCallouts={props.pillCallouts}
        sfxOverlays={props.sfxOverlays}
        phases={props.phases}
        practicalChecklist={props.practicalChecklist}
      />

      {/* Layer 4: Karaoke Word-Highlight Subtitles (<SubtitleOverlay />) */}
      <SubtitleOverlay phases={props.phases} />

      {/* Synchronized Audio Track (UnlimitedTTS id-ID Ethan 1.1x chunks) */}
      <AudioTrack phases={props.phases} />
    </AbsoluteFill>
  );
};
