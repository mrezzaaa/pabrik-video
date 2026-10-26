"use client";

import { useMemo } from "react";
import { Player } from "@remotion/player";
import { Reels } from "@/remotion/Reels";
import { FPS } from "@/remotion/constants";
import { alignWords } from "@/lib/alignment";
import type { ProjectDTO, VisualScene } from "@/lib/types";
import { EMOJI_POOL, GRADIENT_PALETTES } from "@/lib/viral";

function fallbackScenes(project: ProjectDTO, duration: number): VisualScene[] {
  const sentences = project.fullScript?.sentences ?? [];
  if (sentences.length === 0) {
    return [
      {
        id: "preview-1",
        startTime: 0,
        endTime: duration,
        background: {
          type: "gradient",
          value: GRADIENT_PALETTES[0],
        },
        motion: { type: "zoomIn", intensity: 0.2 },
        textAnimation: { type: "karaoke" },
        bRollKeywords: [project.topic],
        overlayEmoji: "🔥",
        headline: project.hook?.split(" ").slice(0, 5).join(" ") ?? "PREVIEW",
        accentColor: "#39FF14",
      },
    ];
  }

  const weights = sentences.map((sentence) => sentence.text.length || 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;
  const motions = ["zoomIn", "shake", "zoomOut", "pan"] as const;
  const animations = ["karaoke", "popIn", "typewriter"] as const;

  return sentences.map((sentence, index) => {
    const slice = (weights[index] / total) * duration;
    const start = cursor;
    cursor += slice;
    return {
      id: `preview-${index + 1}`,
      startTime: start,
      endTime: index === sentences.length - 1 ? duration : cursor,
      background: {
        type: "gradient",
        value: GRADIENT_PALETTES[index % GRADIENT_PALETTES.length],
      },
      motion: { type: motions[index % motions.length], intensity: 0.22 },
      textAnimation: { type: animations[index % animations.length] },
      bRollKeywords: sentence.text
        .replace(/[^\p{L}\p{N}\s]/gu, "")
        .split(/\s+/)
        .filter((word) => word.length > 4)
        .slice(0, 3),
      overlayEmoji: EMOJI_POOL[index % EMOJI_POOL.length],
      headline: sentence.text.split(" ").slice(0, 4).join(" ").toUpperCase(),
      accentColor: ["#39FF14", "#FF2E93", "#00D4FF", "#F5FF00"][index % 4],
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
      controls
      loop
      clickToPlay
      doubleClickToFullscreen
      spaceKeyToPlayOrPause
    />
  );
}
