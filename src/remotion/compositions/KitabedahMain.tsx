import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "../constants";
import { TelemetryBar } from "../components/TelemetryBar";
import { PopupLabel } from "../components/PopupLabel";
import { Caption } from "../components/Caption";
import { IsometricStage } from "../components/IsometricStage";
import { AnatomyFigureRenderer } from "../components/AnatomyFigureRenderer";
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
    svgComponentPath: scene.visual.svgComponentPath || visualScene?.svgComponentPath,
    svgContent: scene.visual.svgContent || visualScene?.svgContent,
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
  const frame = useCurrentFrame();

  // If phases are provided (default pipeline format), use continuous dynamic camera interpolation
  if (props.phases && props.phases.length > 0) {
    const phases = props.phases;
    const current =
      phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ||
      phases[phases.length - 1] ||
      phases[0];
    const currentIndex = phases.indexOf(current);
    const next = phases[currentIndex + 1] || current;

    // Interpolasi zoom & explode & pan biar gak loncat
    const scale = interpolate(
      frame,
      [current.startFrame, Math.max(current.startFrame + 1, current.endFrame)],
      [
        current.camera?.scale ?? 1.0,
        next?.camera?.scale ?? current.camera?.scale ?? 1.0,
      ],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const explode = interpolate(
      frame,
      [current.startFrame, Math.max(current.startFrame + 1, current.endFrame)],
      [
        current.camera?.explodeFactor ?? 0,
        next?.camera?.explodeFactor ?? current.camera?.explodeFactor ?? 0,
      ],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );
    const x = interpolate(
      frame,
      [current.startFrame, Math.max(current.startFrame + 1, current.endFrame)],
      [current.camera?.x ?? 0, next?.camera?.x ?? current.camera?.x ?? 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Render cuma komponen yang visible di phase itu (biar object ganti-ganti)
    const allNodes = props.visualScene?.nodes || [];
    const visibleNodes =
      current.activeComponentIds && current.activeComponentIds.length > 0
        ? allNodes.filter(
            (n) =>
              current.activeComponentIds.includes(n.componentId) ||
              current.activeComponentIds.includes(n.nodeId)
          )
        : allNodes;
    const activeNodes = visibleNodes.length > 0 ? visibleNodes : allNodes;

    // Active popup labels for current frame
    const activePills = (props.pillCallouts || []).filter(
      (c) => frame >= c.startFrame && frame <= c.endFrame
    );

    return (
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.bg,
          fontFamily:
            "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* 1. Dynamic 4-Tone Isometric Anatomy Figure Stage with camera interpolation */}
        <AnatomyFigureRenderer
          scale={scale}
          x={x}
          explodeFactor={explode}
          nodes={activeNodes}
          cutaway={current.cutaway}
          svgContent={
            current.visualScene?.svgContent || props.visualScene?.svgContent
          }
          svgComponentPath={
            current.visualScene?.svgComponentPath ||
            props.visualScene?.svgComponentPath
          }
          title={props.visualScene?.subjectTitle || current.chapterTitle}
        />

        {/* 2. Dynamic Telemetry Bar at Top */}
        <TelemetryBar
          channels={[
            {
              label: "UTAMA",
              unit: current.primaryMetric.unit,
              start: current.primaryMetric.startValue,
              end: current.primaryMetric.endValue,
            },
          ]}
          badge={{
            text: current.statusBadge.text,
            color: current.statusBadge.variant === "red" ? "red" : "green",
          }}
          durationInFrames={current.durationInFrames}
          title={current.chapterTitle.replace(/<highlight>|<\/highlight>/g, "")}
        />

        {/* 3. Staggered Dynamic Popup Labels */}
        <PopupLabel
          labels={activePills.map((pill) => ({
            text: pill.text,
            x: pill.anchor.x > 1.0 ? pill.anchor.x / 1080 : pill.anchor.x,
            y: pill.anchor.y > 1.0 ? pill.anchor.y / 1920 : pill.anchor.y,
          }))}
        />

        {/* 4. Word-by-Word Karaoke Subtitles with #FFE500 Highlights */}
        <Caption
          text={current.narrationText}
          highlights={
            current.chapterTitle.match(/<highlight>(.*?)<\/highlight>/i)?.[1]
              ? [current.chapterTitle.match(/<highlight>(.*?)<\/highlight>/i)![1]]
              : []
          }
          words={(current.wordTimings || []).map((w) => ({
            text: w.word,
            startFrame: Math.max(0, w.startFrame - current.startFrame),
            endFrame: Math.max(0, w.endFrame - current.startFrame),
          }))}
          durationInFrames={current.durationInFrames}
        />

        {/* 5. Synchronized Audio Segment Sequences */}
        {phases.map((p, idx) => {
          const audioSrc = resolveAudioSrc(p.audioUrl);
          if (!audioSrc) return null;
          return (
            <Sequence
              key={`audio_${p.segmentIndex ?? idx}`}
              from={p.startFrame}
              durationInFrames={p.durationInFrames}
            >
              <Audio src={audioSrc} volume={1.0} />
            </Sequence>
          );
        })}
      </AbsoluteFill>
    );
  }

  // Fallback: Resolve scenes either directly from props.scenes
  const activeScenes: VideoBlueprintScene[] = props.scenes || [];
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
