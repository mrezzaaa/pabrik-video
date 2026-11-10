import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AudioMixer } from "./components/AudioMixer";
import { CameraRig } from "./components/CameraRig";
import { Caption } from "./components/Caption";
import { HookCard, SoftOpen, TopBar } from "./components/Overlays";
import { SceneBackground } from "./components/SceneBackground";
import { SceneStage } from "./components/Stage/SceneStage";
import { ANTON_FAMILY } from "./fonts";
import type { ReelsProps } from "./types";

export const Reels: React.FC<ReelsProps> = ({
  audioSrc,
  duration,
  topic,
  scenes,
  words,
  hookText,
  hookKicker,
  hookEnd,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sortedScenes = [...scenes].sort((a, b) => a.startTime - b.startTime);
  const currentTime = frame / fps;
  const activeScene =
    sortedScenes.find(
      (scene) => currentTime >= scene.startTime && currentTime < scene.endTime,
    ) ?? sortedScenes[sortedScenes.length - 1];

  const accent = activeScene?.accentColor ?? "#39FF14";
  const totalFrames = Math.max(1, durationInFrames);
  // Kartu hook bertahan sampai hook selesai diucapkan, dibatasi 2.4-3.2 detik.
  const hookSeconds = Math.min(3.2, Math.max(2.4, hookEnd ?? 3));
  const hookFrames = Math.min(totalFrames, Math.round(hookSeconds * fps));

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
        const isLast = index === sortedScenes.length - 1;
        const to = isLast
          ? totalFrames
          : Math.min(
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

      {hookText ? (
        <Sequence from={0} durationInFrames={hookFrames} layout="none">
          <HookCard text={hookText} kicker={hookKicker} accent={accent} />
        </Sequence>
      ) : null}

      {words.length > 0 ? <Caption words={words} accentColor={accent} /> : null}
      <SoftOpen />
    </AbsoluteFill>
  );
};
