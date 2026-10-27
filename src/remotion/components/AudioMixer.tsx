import React, { useMemo } from "react";
import {
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useVideoConfig,
} from "remotion";
import type { VisualScene, WordTimestamp } from "../../lib/types";

const at = (seconds: number, fps: number) => Math.max(0, Math.round(seconds * fps));

type Sfx = { src: string; at: number; volume: number; length?: number };

/**
 * SFX + BGM engine.
 * - scene transition: swipe/whoosh alternates
 * - danger/warn: sub-bass impact / alert glitch
 * - counters and bars: pop + mechanical ticks
 * No CTA ding: the script never ends with a call to action.
 */
export const AudioMixer: React.FC<{
  scenes: VisualScene[];
  words: WordTimestamp[];
  duration: number;
}> = ({ scenes, words, duration }) => {
  const { fps } = useVideoConfig();

  const cues = useMemo(() => {
    const list: Sfx[] = [
      { src: "audio/riser.mp3", at: 0, volume: 0.34, length: 1.4 },
      { src: "audio/whoosh.mp3", at: 0, volume: 0.5, length: 0.9 },
    ];

    scenes.forEach((scene, index) => {
      const start = scene.startTime;
      const danger = scene.theme === "danger";
      const warn = scene.theme === "warn";

      if (index > 0) {
        list.push({
          src: index % 2 === 0 ? "audio/swipe.mp3" : "audio/whoosh.mp3",
          at: start,
          volume: danger ? 0.3 : 0.16,
          length: 0.5,
        });
      }
      if (danger) {
        list.push({
          src: "audio/sub-bass-impact.mp3",
          at: start,
          volume: 0.42,
          length: 0.9,
        });
      } else if (warn) {
        list.push({
          src: "audio/alert-glitch.mp3",
          at: start,
          volume: 0.24,
          length: 0.5,
        });
      }

      const hasCounter = scene.visualType === "SVG_COUNTER";
      if (hasCounter) {
        list.push({
          src: "audio/pop.mp3",
          at: start + 0.02,
          volume: 0.32,
          length: 0.3,
        });
        [0.16, 0.34, 0.52].forEach((offset, tickIndex) => {
          list.push({
            src: "audio/counter-tick.mp3",
            at: start + offset,
            volume: 0.16 - tickIndex * 0.03,
            length: 0.18,
          });
        });
      } else if (scene.visualType === "SVG_STAMP") {
        // Cap mendarat di ~0.16s (sinkron dengan slam di StampStage).
        list.push({
          src: "audio/sub-bass-impact.mp3",
          at: start + 0.14,
          volume: 0.5,
          length: 0.9,
        });
      } else if (
        scene.visualType === "SVG_CROSSSECTION" ||
        scene.visualType === "SVG_TIMELINE" ||
        scene.visualType === "SVG_COMPARE"
      ) {
        [0.2, 0.56, 0.92].forEach((offset, tickIndex) => {
          list.push({
            src: "audio/pop.mp3",
            at: start + offset,
            volume: 0.22 - tickIndex * 0.03,
            length: 0.24,
          });
        });
      } else if (scene.visualType === "SVG_BAR_CHART") {
        [0.08, 0.22, 0.36].forEach((offset, tickIndex) => {
          list.push({
            src: "audio/pop.mp3",
            at: start + offset,
            volume: 0.2 - tickIndex * 0.03,
            length: 0.24,
          });
        });
      }
    });

    return list;
  }, [scenes]);

  const sortedWords = useMemo(
    () => [...words].sort((a, b) => a.start - b.start),
    [words],
  );

  const bgmVolume = (frame: number) => {
    const time = frame / fps;
    const speaking = sortedWords.some(
      (word) => time >= word.start - 0.04 && time <= word.end + 0.04,
    );
    const fadeOut = interpolate(
      time,
      [Math.max(0, duration - 0.9), duration],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    const base = speaking ? 0.085 : 0.16;
    return base * fadeOut;
  };

  return (
    <>
      <Audio src={staticFile("audio/bgm-dark.mp3")} loop volume={bgmVolume} />
      {cues.map((cue, index) => (
        <Sequence
          key={`${cue.src}-${cue.at}-${index}`}
          from={at(cue.at, fps)}
          durationInFrames={Math.max(4, at(cue.length ?? 0.4, fps))}
          layout="none"
        >
          <Audio src={staticFile(cue.src)} volume={cue.volume} />
        </Sequence>
      ))}
    </>
  );
};
