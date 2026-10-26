import { Composition } from "remotion";
import { FPS, HEIGHT, WIDTH } from "./constants";
import { Reels } from "./Reels";
import type { ReelsProps } from "./types";

const demoTopic = "5 fakta unik kucing";

const defaultProps: ReelsProps = {
  audioSrc: "",
  duration: 8,
  fps: FPS,
  hook: "99% orang salah paham soal kucing",
  topic: demoTopic,
  scenes: [
    {
      id: "demo-1",
      startTime: 0,
      endTime: 4,
      background: {
        type: "gradient",
        value: "linear-gradient(145deg, #050505 0%, #0b2a12 48%, #39ff14 140%)",
      },
      motion: { type: "zoomIn", intensity: 0.24 },
      textAnimation: { type: "karaoke" },
      bRollKeywords: ["kucing", "mata", "fakta"],
      overlayEmoji: "😱",
      visual: { kind: "stamp", word: "FAKTA", caption: "KUCING LIHAT DI GELAP" },
      headline: "FAKTA GILA",
      accentColor: "#39FF14",
    },
    {
      id: "demo-2",
      startTime: 4,
      endTime: 8,
      background: {
        type: "gradient",
        value: "linear-gradient(160deg, #0a0014 0%, #4a0b5c 55%, #ff2e93 130%)",
      },
      motion: { type: "shake", intensity: 0.3 },
      textAnimation: { type: "popIn" },
      bRollKeywords: ["kucing", "malam"],
      overlayEmoji: "🤯",
      visual: {
        kind: "crosssection",
        title: "MATA KUCING",
        layers: [
          { label: "KORNEA", note: "lapisan pelindung" },
          { label: "LENSA", note: "memfokuskan cahaya" },
          { label: "RETINA", note: "sel batang padat" },
          { label: "TAPETUM", note: "cermin cahaya" },
        ],
      },
      headline: "MATA KUCING",
      accentColor: "#FF2E93",
    },
  ],
  words: [
    {
      word: "Kucing",
      start: 0.1,
      end: 0.7,
      sentenceId: "s1",
      emphasis: true,
    },
    { word: "itu", start: 0.7, end: 0.95, sentenceId: "s1", emphasis: false },
    {
      word: "aneh",
      start: 0.95,
      end: 1.4,
      sentenceId: "s1",
      emphasis: true,
    },
    { word: "banget.", start: 1.4, end: 1.9, sentenceId: "s1", emphasis: false },
    {
      word: "Matanya",
      start: 4.1,
      end: 4.8,
      sentenceId: "s2",
      emphasis: true,
    },
    { word: "bisa", start: 4.8, end: 5.1, sentenceId: "s2", emphasis: false },
    {
      word: "nyala",
      start: 5.1,
      end: 5.5,
      sentenceId: "s2",
      emphasis: true,
    },
    { word: "di", start: 5.5, end: 5.7, sentenceId: "s2", emphasis: false },
    { word: "gelap.", start: 5.7, end: 6.2, sentenceId: "s2", emphasis: false },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Reels"
      component={Reels}
      durationInFrames={Math.round(defaultProps.duration * FPS)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => {
        const duration =
          Number.isFinite(props.duration) && props.duration > 0
            ? props.duration
            : 30;
        return {
          durationInFrames: Math.max(30, Math.ceil(duration * FPS)),
          fps: FPS,
          width: WIDTH,
          height: HEIGHT,
        };
      }}
    />
  );
};
