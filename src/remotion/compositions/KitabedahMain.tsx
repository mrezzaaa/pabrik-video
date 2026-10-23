import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { COLORS } from "../constants";
import { TelemetryBar } from "../components/TelemetryBar";
import { PopupLabel } from "../components/PopupLabel";
import { Caption } from "../components/Caption";
import { IsometricStage } from "../components/IsometricStage";
import type {
  VideoBlueprintScene,
  IsoSceneGraph,
  PhaseTimelineBlock,
  FramePillCallout,
  FrameSfxOverlay,
} from "@/schemas/video-blueprint";

export interface KitabedahMainProps {
  scenes?: VideoBlueprintScene[];
  topic?: string;
  // Backwards compatibility with legacy RemotionCompositionProps
  phases?: PhaseTimelineBlock[];
  visualScene?: IsoSceneGraph;
  pillCallouts?: FramePillCallout[];
  sfxOverlays?: FrameSfxOverlay[];
  practicalChecklist?: {
    title: string;
    items: string[];
  };
}

function resolveAudioSrc(audioUrl?: string): string {
  if (!audioUrl) return "";
  if (audioUrl.startsWith("http://") || audioUrl.startsWith("https://")) {
    return audioUrl;
  }
  const cleanRelative = audioUrl.replace(/^\/+/, "");
  return staticFile(cleanRelative);
}

/**
 * Converts legacy RemotionCompositionProps phases to dynamic VideoBlueprintScene[]
 */
function convertPhasesToScenes(
  phases: PhaseTimelineBlock[],
  pillCallouts?: FramePillCallout[],
  visualScene?: IsoSceneGraph
): VideoBlueprintScene[] {
  return phases.map((p, idx) => {
    const scenePills = (pillCallouts || []).filter(
      (c) => c.startFrame >= p.startFrame && c.startFrame < p.endFrame
    );

    return {
      id: `scene_${p.segmentIndex ?? idx}`,
      title: p.chapterTitle.replace(/<highlight>|<\/highlight>/g, ""),
      vo_text: p.narrationText,
      durationInFrames: Math.max(1, p.durationInFrames),
      audioUrl: p.audioUrl,
      words: (p.wordTimings || []).map((w) => ({
        text: w.word,
        startFrame: Math.max(0, w.startFrame - p.startFrame),
        endFrame: Math.max(0, w.endFrame - p.startFrame),
      })),
      telemetry: {
        channels: [
          {
            label: "UTAMA",
            unit: p.primaryMetric.unit,
            start: p.primaryMetric.startValue,
            end: p.primaryMetric.endValue,
          },
        ],
        badge: {
          text: p.statusBadge.text,
          color: p.statusBadge.variant === "red" ? "red" : "green",
        },
      },
      visual: {
        description: `Act ${idx + 1} cross section`,
        popup_labels: scenePills.map((pill) => ({
          text: pill.text,
          x: pill.anchor.x > 1.0 ? pill.anchor.x / 1080 : pill.anchor.x,
          y: pill.anchor.y > 1.0 ? pill.anchor.y / 1920 : pill.anchor.y,
        })),
        nodes: visualScene?.nodes,
      },
      caption: {
        text: p.narrationText,
        highlights: p.chapterTitle.match(/<highlight>(.*?)<\/highlight>/i)?.[1]
          ? [p.chapterTitle.match(/<highlight>(.*?)<\/highlight>/i)![1]]
          : [],
        words: (p.wordTimings || []).map((w) => ({
          text: w.word,
          startFrame: Math.max(0, w.startFrame - p.startFrame),
          endFrame: Math.max(0, w.endFrame - p.startFrame),
        })),
      },
    };
  });
}

interface SceneComponentProps {
  scene: VideoBlueprintScene;
  visualScene?: IsoSceneGraph;
}

const SceneComponent: React.FC<SceneComponentProps> = ({ scene, visualScene }) => {
  const audioSrc = resolveAudioSrc(scene.audioUrl);
  const activeSceneGraph: IsoSceneGraph = {
    subjectTitle: scene.title || "Isometric Cutaway",
    objectFormFactor: "Procedural Cutaway",
    anatomyDecomposition: {
      outerHousingShell: "Outer Shell",
      primaryInternalMechanism: "Primary Mechanism",
      zoomInSubComponents: "Subcomponents",
      physicalStateChange: "Physical State",
    },
    cameraPreset: {
      basePosition: [8, 6.5, 8],
      baseZoom: 170,
    },
    enableSteamWisps: false,
    nodes: scene.visual.nodes || visualScene?.nodes || [],
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        overflow: "hidden",
      }}
    >
      {/* 1. Universal Isometric 3D Stage in Center */}
      <IsometricStage visualScene={activeSceneGraph} />

      {/* 2. Dynamic Telemetry Bar at Top */}
      <TelemetryBar
        channels={scene.telemetry.channels}
        badge={scene.telemetry.badge}
        durationInFrames={scene.durationInFrames}
        title={scene.title}
      />

      {/* 3. Staggered Dynamic Popup Labels */}
      <PopupLabel labels={scene.visual.popup_labels} />

      {/* 4. Word-by-Word Karaoke Subtitles with #FFE500 Highlights */}
      <Caption
        text={scene.caption.text || scene.vo_text}
        highlights={scene.caption.highlights}
        words={scene.caption.words || scene.words}
        durationInFrames={scene.durationInFrames}
      />

      {/* 5. Synchronized Audio Segment */}
      {audioSrc && <Audio src={audioSrc} volume={1.0} />}
    </AbsoluteFill>
  );
};

export const KitabedahMain: React.FC<KitabedahMainProps> = (props) => {
  // Resolve scenes either directly from props.scenes or mapped from props.phases
  const activeScenes: VideoBlueprintScene[] =
    props.scenes && props.scenes.length > 0
      ? props.scenes
      : props.phases && props.phases.length > 0
        ? convertPhasesToScenes(props.phases, props.pillCallouts, props.visualScene)
        : [];

  // Cumulative scene sequencing (prevents frame-0 overlapping stacking)
  let accumulatedFrom = 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {activeScenes.map((scene, idx) => {
        const from = accumulatedFrom;
        accumulatedFrom += scene.durationInFrames;

        return (
          <Sequence
            key={scene.id ?? `seq_scene_${idx}`}
            from={from}
            durationInFrames={scene.durationInFrames}
          >
            <SceneComponent scene={scene} visualScene={props.visualScene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
