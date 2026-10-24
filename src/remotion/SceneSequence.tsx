import React from "react";
import { Audio, Img, Video, staticFile, useCurrentFrame } from "remotion";
import { StoryboardScene } from "../lib/types";
import { CameraShotWrapper } from "./CameraShotWrapper";
import { GraphicOverlayComponent } from "./GraphicOverlay";
import { SubtitleTrack } from "./SubtitleTrack";
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

  // Resolve media src
  const mainSrc = scene.mainVisual.localAssetUrl
    ? staticFile(scene.mainVisual.localAssetUrl)
    : "";
  const cutawaySrc = scene.cutaway?.localAssetUrl
    ? staticFile(scene.cutaway.localAssetUrl)
    : mainSrc;

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
        >
          {mainSrc.endsWith(".mp4") ? (
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
          )}
        </CameraShotWrapper>
      ) : (
        <CameraShotWrapper
          shot={scene.cutaway.cameraShot || "KEN_BURNS_ZOOM_IN"}
          durationInFrames={durationInFrames - cutawayFrame}
          themeColor={themeColor}
        >
          {isCutawayVideo ? (
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

      {/* Top HUD Telemetry Header */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "monospace",
          fontSize: 18,
          color: themeColor,
          zIndex: 20,
          textShadow: "0 2px 8px rgba(0,0,0,0.8)",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span
            style={{
              padding: "4px 10px",
              backgroundColor: "rgba(7, 19, 36, 0.8)",
              border: `1px solid ${themeColor}`,
            }}
          >
            SEC_{String(scene.sceneId).padStart(2, "0")}
          </span>
          <span style={{ color: "#F0F9FF" }}>
            {scene.mainVisual.overlayHeadline}
          </span>
        </div>
        <div
          style={{
            padding: "4px 8px",
            backgroundColor: "rgba(7, 19, 36, 0.8)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            fontSize: 14,
            color: "#94A3B8",
          }}
        >
          CAD: 1080x1920 @ 30FPS
        </div>
      </div>

      {/* Cutaway Transition FX */}
      <TransitionOverlay
        type={scene.transitionToNext || "FLASH_CUT"}
        triggerFrame={cutawayFrame}
        durationFrames={4}
      />

      {/* Dynamic Graphic Overlay */}
      {isCutawayActive && (
        <GraphicOverlayComponent
          overlay={scene.cutaway.graphicOverlay}
          themeColor={themeColor}
        />
      )}

      {/* Dynamic Hormozi Subtitles */}
      <SubtitleTrack
        wordTimestamps={scene.wordTimestamps}
        themeColor={themeColor}
      />

      {/* Audio Narration */}
      {scene.audioUrl && <Audio src={staticFile(scene.audioUrl)} />}
    </div>
  );
};
