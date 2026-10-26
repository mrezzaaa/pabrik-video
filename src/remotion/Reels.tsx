import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Caption } from "./components/Caption";
import {
  CtaOverlay,
  HookBanner,
  IntroWipe,
  TopHud,
} from "./components/Overlays";
import { SceneBackground } from "./components/SceneBackground";
import { SceneHeadline } from "./components/SceneHeadline";
import { SceneOverlay } from "./components/SceneOverlay";
import { SceneVisual } from "./components/SceneVisual";
import { ANTON_FAMILY, anton } from "./fonts";
import type { ReelsProps } from "./types";

export const Reels: React.FC<ReelsProps> = ({
  audioSrc,
  duration,
  hook,
  topic,
  scenes,
  words,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [fontHandle] = useState(() => delayRender("Loading Anton font"));

  useEffect(() => {
    anton
      .waitUntilDone()
      .then(() => continueRender(fontHandle))
      .catch(() => continueRender(fontHandle));
  }, [fontHandle]);

  const sortedScenes = [...scenes].sort((a, b) => a.startTime - b.startTime);
  const currentTime = frame / fps;
  const activeScene =
    sortedScenes.find(
      (scene) => currentTime >= scene.startTime && currentTime < scene.endTime,
    ) ?? sortedScenes[sortedScenes.length - 1];

  const accent = activeScene?.accentColor ?? "#39FF14";
  const totalFrames = Math.max(1, durationInFrames);
  const safeDuration = Math.max(0.5, duration);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050505",
        fontFamily: ANTON_FAMILY,
        overflow: "hidden",
      }}
    >
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
      <Sequence from={0} durationInFrames={Math.round(0.9 * fps)} layout="none">
        <Audio src={staticFile("audio/whoosh.mp3")} volume={0.45} />
      </Sequence>

      {sortedScenes.map((scene, index) => {
        const from = Math.max(0, Math.round(scene.startTime * fps));
        const to = Math.min(
          totalFrames,
          Math.max(from + 6, Math.round(scene.endTime * fps)),
        );

        return (
          <Sequence
            key={scene.id || index}
            from={from}
            durationInFrames={Math.max(6, to - from)}
            layout="none"
          >
            <SceneBackground
              scene={scene}
              index={index}
              total={sortedScenes.length}
            />
            <SceneVisual
              scene={scene}
              index={index}
              total={sortedScenes.length}
            />
            {index === 0 ? null : (
              <SceneHeadline
                scene={scene}
                index={index}
                total={sortedScenes.length}
              />
            )}
            <SceneOverlay
              scene={scene}
              index={index}
              total={sortedScenes.length}
            />
          </Sequence>
        );
      })}

      <TopHud topic={topic} accent={accent} />
      <HookBanner hook={hook} accent={accent} />
      {words.length > 0 ? <Caption words={words} accentColor={accent} /> : null}
      <CtaOverlay durationInFrames={totalFrames} accent={accent} />
      <IntroWipe accent={accent} />

      {/* Constant safe-area shimmer keeps the frame from looking flat. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          zIndex: 40,
          background: `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 18%, transparent 72%, rgba(0,0,0,0.45) 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 54,
          bottom: 100,
          fontFamily: "monospace",
          fontSize: 16,
          letterSpacing: 4,
          color: "rgba(255,255,255,0.38)",
          zIndex: 55,
        }}
      >
        {safeDuration.toFixed(1)}S // AI GENERATED
      </div>
    </AbsoluteFill>
  );
};
