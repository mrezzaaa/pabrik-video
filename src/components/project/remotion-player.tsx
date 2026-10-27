import { useMemo } from "react";
import { Player } from "@remotion/player";
import { Reels } from "@/remotion/Reels";
import { FPS } from "@/remotion/constants";
import { alignWords } from "@/lib/alignment";
import type { ProjectDTO, VisualScene } from "@/lib/types";
import { GRADIENT_PALETTES } from "@/lib/viral";

const MOTIONS = ["zoomIn", "shake", "zoomOut", "pan", "panLeft"] as const;
const ANIMATIONS = ["karaoke", "popIn", "typewriter"] as const;
const IMAGE_STYLES = ["fullBleed", "glass", "split"] as const;

function keywordsFor(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .slice(0, 3)
    .join(" ");
}

function firstNumber(text: string) {
  const match = text.match(/(\d{1,4})/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 3 ? value : null;
}

function fallbackScenes(project: ProjectDTO, duration: number): VisualScene[] {
  const sentences = project.fullScript?.sentences ?? [];
  if (sentences.length === 0) {
    return [
      {
        id: "preview-1",
        startTime: 0,
        endTime: duration,
        duration,
        background: {
          type: "gradient",
          value: GRADIENT_PALETTES[0],
        },
        motion: { type: "zoomIn", intensity: 0.2 },
        textAnimation: { type: "karaoke" },
        visualType: "B_ROLL_IMAGE",
        imageSearchQuery: project.topic,
        imageStyle: "fullBleed",
        stageLabel: "",
        accentColor: "#39FF14",
      },
    ];
  }

  const weights = sentences.map((sentence) => sentence.text.length || 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;

  return sentences.map((sentence, index) => {
    const slice = (weights[index] / total) * duration;
    const start = cursor;
    cursor += slice;
    const end = index === sentences.length - 1 ? duration : cursor;
    const value = firstNumber(sentence.text);
    const isYear = value !== null && value >= 1800 && value <= 2100;
    const query = keywordsFor(sentence.text) || project.topic;

    const base = {
      id: `preview-${index + 1}`,
      startTime: start,
      endTime: end,
      duration: Math.max(0.5, end - start),
      background: {
        type: "gradient" as const,
        value: GRADIENT_PALETTES[index % GRADIENT_PALETTES.length],
      },
      motion: {
        type: MOTIONS[index % MOTIONS.length],
        intensity: 0.22,
      },
      textAnimation: {
        type: ANIMATIONS[index % ANIMATIONS.length],
      },
      imageSearchQuery: query,
      imageStyle: IMAGE_STYLES[index % IMAGE_STYLES.length],
      stageLabel: isYear ? "TAHUN" : "DATA",
      theme: "info" as const,
      accentColor: ["#39FF14", "#FF2E93", "#00D4FF", "#F5FF00"][index % 4],
    };

    if (value !== null) {
      return {
        ...base,
        visualType: "SVG_COUNTER" as const,
        counter: { from: 0, to: value, suffix: "", label: base.stageLabel },
        metric: { value, suffix: "", label: base.stageLabel },
      };
    }

    return {
      ...base,
      stageLabel: "",
      visualType: "B_ROLL_IMAGE" as const,
    };
  });
}

export function RemotionReelsPlayer({ project }: { project: ProjectDTO }) {
  const duration = project.duration ?? project.fullScript?.durationEstimate ?? 40;
  const audioSrc = project.audioUrl ? project.audioUrl.replace(/^\/+/, "") : "";

  const words = useMemo(() => {
    if (project.wordTimestamps && project.wordTimestamps.length > 0) {
      return project.wordTimestamps;
    }
    if (project.fullScript?.sentences?.length) {
      return alignWords(project.fullScript.sentences, duration).words;
    }
    return [];
  }, [duration, project.fullScript, project.wordTimestamps]);

  const scenes = useMemo(() => {
    if (project.visualPlan?.scenes?.length) return project.visualPlan.scenes;
    return fallbackScenes(project, duration);
  }, [duration, project]);

  const inputProps = {
    audioSrc,
    duration,
    fps: FPS,
    hook: project.hook ?? project.fullScript?.hook ?? "",
    topic: project.topic,
    scenes,
    words,
  };

  if (!audioSrc) return null;

  return (
    <Player
      component={Reels}
      inputProps={inputProps}
      durationInFrames={Math.max(30, Math.ceil(duration * FPS))}
      fps={FPS}
      compositionWidth={1080}
      compositionHeight={1920}
      style={{ width: "100%" }}
      numberOfSharedAudioTags={32}
      controls
      loop
      clickToPlay
      doubleClickToFullscreen
      spaceKeyToPlayOrPause
    />
  );
}
