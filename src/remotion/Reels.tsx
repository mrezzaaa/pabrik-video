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
import { AudioMixer } from "./components/AudioMixer";
import { CameraRig } from "./components/CameraRig";
import { Caption } from "./components/Caption";
import {
  CtaBadge,
  HookInterrupt,
  IntroWipe,
  TopBar,
} from "./components/Overlays";
import { SceneBackground } from "./components/SceneBackground";
import { SceneStage } from "./components/Stage/SceneStage";
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

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050505",
        fontFamily: ANTON_FAMILY,
        overflow: "hidden",
      }}
    >
      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
      <AudioMixer scenes={sortedScenes} words={words} duration={duration} />

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
            <CameraRig scene={scene}>
              <SceneBackground
                scene={scene}
                index={index}
                total={sortedScenes.length}
              />
              <SceneStage scene={scene} index={index} />
            </CameraRig>
          </Sequence>
        );
      })}

      <TopBar topic={topic} accent={accent} />
      <Sequence from={0} durationInFrames={Math.round(3 * fps)} layout="none">
        <HookInterrupt hook={hook} accent={accent} />
      </Sequence>

      {words.length > 0 ? <Caption words={words} accentColor={accent} /> : null}
      <CtaBadge durationInFrames={totalFrames} accent={accent} />
      <IntroWipe accent={accent} />
    </AbsoluteFill>
  );
};
