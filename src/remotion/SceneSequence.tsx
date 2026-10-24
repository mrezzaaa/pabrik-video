import React from "react";
import { Audio, Img, Video, staticFile, useCurrentFrame } from "remotion";
import { StoryboardScene } from "../lib/types";
import { CameraShotWrapper } from "./CameraShotWrapper";
import { SubtitleTrack } from "./SubtitleTrack";
import { TopTelemetryDeck } from "./TopTelemetryDeck";
import { TransitionOverlay } from "./TransitionOverlay";

interface SceneSequenceProps {
  scene: StoryboardScene;
  themeColor: string;
}

export const SceneSequence: React.FC<SceneSequenceProps> = ({
  scene,
  themeColor,
}) => {
  const frame = useCurrentFrame();
  const durationInFrames = scene.durationInFrames || 150;

  // Split frame for cutaway
  const triggerProgress = scene.cutaway?.triggerAtProgress ?? 0.5;
  const cutawayFrame = Math.floor(durationInFrames * triggerProgress);
  const isCutawayActive = scene.cutaway?.enabled && frame >= cutawayFrame;

  // Resolve media src: normalize relative to public/
  const cleanMain = (scene.mainVisual.localAssetUrl || "")
    .replace(/^\/+/, "")
    .replace(/^public\/+/, "");
  const cleanCutaway = (scene.cutaway?.localAssetUrl || "")
    .replace(/^\/+/, "")
    .replace(/^public\/+/, "");

  const mainSrc = cleanMain ? staticFile(cleanMain) : "";
  const cutawaySrc = cleanCutaway ? staticFile(cleanCutaway) : mainSrc;

  const isCutawayVideo =
    scene.cutaway?.sourceType === "PEXELS_VIDEO" &&
    cutawaySrc.endsWith(".mp4");

  return (
    <div
      style={{
        width: 1080,
        height: 1920,
        position: "relative",
        backgroundColor: "#071324",
        overflow: "hidden",
      }}
    >
      {/* Background Media Engine */}
      {!isCutawayActive ? (
        <CameraShotWrapper
          shot={scene.mainVisual.cameraShot}
          durationInFrames={cutawayFrame}
          themeColor={themeColor}
          callouts={scene.mainVisual.callouts}
        >
          {mainSrc ? (
            mainSrc.endsWith(".mp4") ? (
              <Video
                src={mainSrc}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                muted
              />
            ) : (
              <Img
                src={mainSrc}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #071324 0%, #0B1D36 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "rgba(56, 189, 248, 0.4)",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.2em",
                }}
              >
                AWAITING_VISUAL_ASSET
              </div>
            </div>
          )}
        </CameraShotWrapper>
      ) : (
        <CameraShotWrapper
          shot={scene.cutaway?.cameraShot || "KEN_BURNS_ZOOM_IN"}
          durationInFrames={durationInFrames - cutawayFrame}
          themeColor={themeColor}
        >
          {cutawaySrc ? (
            isCutawayVideo ? (
              <Video
                src={cutawaySrc}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                muted
              />
            ) : (
              <Img
                src={cutawaySrc}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(135deg, #071324 0%, #0B1D36 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "rgba(56, 189, 248, 0.4)",
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.2em",
                }}
              >
                AWAITING_CUTAWAY_ASSET
              </div>
            </div>
          )}
        </CameraShotWrapper>
      )}

      {/* Blueprint Grid Watermark Layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          pointerEvents: "none",
        }}
      />

      {/* Full-Width Top Telemetry & Animated Chart Deck */}
      <TopTelemetryDeck
        sceneId={scene.sceneId}
        durationInFrames={durationInFrames}
        telemetry={scene.telemetry}
        headline={scene.mainVisual.overlayHeadline}
        themeColor={themeColor}
      />

      {/* Cutaway Transition FX */}
      <TransitionOverlay
        type={scene.transitionToNext || "FLASH_CUT"}
        triggerFrame={cutawayFrame}
        durationFrames={4}
      />

      {/* High-Contrast Technical Subtitles */}
      <SubtitleTrack
        wordTimestamps={scene.wordTimestamps}
        themeColor={themeColor}
      />

      {/* Audio Narration */}
      {scene.audioUrl && (
        <Audio
          src={staticFile(
            scene.audioUrl.replace(/^\/+/, "").replace(/^public\/+/, "")
          )}
        />
      )}
    </div>
  );
};
