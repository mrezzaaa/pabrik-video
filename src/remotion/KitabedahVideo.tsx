import React, { useMemo } from "react";
import { Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { VideoBlueprint, VideoBlueprintPhase } from "../lib/scene/types";
import { CADBlueprintScene, buildCADAssemblies, resolveCADArchetype } from "../lib/cad";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./constants";

export interface KitabedahVideoProps {
  blueprint?: VideoBlueprint;
  visualStyle?: "xray" | "wireframe-green" | "blueprint";
  totalDurationInFrames?: number;
  audioUrl?: string;
}

const cleanPath = (p: string) => p.replace(/^\/+/, "").replace(/^public\/+/, "");

/**
 * Universal Procedural 3D CAD Blueprint & Cutaway Video Composition:
 * - Deterministic Remotion + Three.js rendering (no requestAnimationFrame)
 * - Hardware GPU zero-rebuild cutaway sectioning via THREE.Plane
 * - Dual-pass CAD material standard (surface pass + vector line edges)
 * - 4-Phase Choreography (Exterior -> Cutaway -> Exploded View -> Reassembly)
 * - Spoken Indonesian narration audio & subtitles synchronized per phase
 */
export const KitabedahVideo: React.FC<KitabedahVideoProps> = ({
  blueprint = { videoTitle: "CAD BLUEPRINT", components: [], phases: [] },
  visualStyle = "blueprint",
  totalDurationInFrames,
  audioUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Accumulate sequence intervals strictly
  const { phaseIntervals, calculatedTotalFrames } = useMemo(() => {
    let currentFrom = 0;
    const intervals: Array<{
      phase: VideoBlueprintPhase;
      from: number;
      durationInFrames: number;
    }> = [];

    const phases = blueprint.phases || [
      {
        phaseId: 1,
        title: "Struktur CAD 3D",
        duration: 5,
        activeComponentIds: [],
      },
    ];

    phases.forEach((phase) => {
      const dur = phase.durationInFrames
        ? phase.durationInFrames
        : Math.round((phase.duration || 5) * VIDEO_FPS);
      intervals.push({
        phase,
        from: currentFrom,
        durationInFrames: Math.max(1, dur),
      });
      currentFrom += Math.max(1, dur);
    });

    return {
      phaseIntervals: intervals,
      calculatedTotalFrames: Math.max(1, currentFrom),
    };
  }, [blueprint.phases]);

  // Find currently active phase
  const activeInterval = useMemo(() => {
    const found = phaseIntervals.find(
      (it) => frame >= it.from && frame < it.from + it.durationInFrames
    );
    return found || phaseIntervals[0];
  }, [frame, phaseIntervals]);

  const activePhase = activeInterval?.phase;

  // Resolve topological archetype and generate CAD sub-assemblies
  const archetype = useMemo(() => {
    return (
      blueprint.cadArchetype ||
      resolveCADArchetype(blueprint.subjectArchetype || blueprint.videoTitle || "MACHINE")
    );
  }, [blueprint.cadArchetype, blueprint.subjectArchetype, blueprint.videoTitle]);

  const assemblies = useMemo(() => {
    return buildCADAssemblies({
      videoTitle: blueprint.videoTitle || "CAD BLUEPRINT",
      subtitle: blueprint.subtitle,
      archetype: archetype as any,
      params: blueprint.params,
      phases: (blueprint.phases as any) || [],
      assemblies: blueprint.assemblies || blueprint.parts,
      customAssemblies: blueprint.customAssemblies as any,
    });
  }, [blueprint, archetype]);

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: "#050b14",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
      }}
    >
      {/* 1. Deterministic 3D CAD Blueprint & Cutaway Engine */}
      <CADBlueprintScene
        title={blueprint.videoTitle || "CAD BLUEPRINT"}
        subtitle={blueprint.subtitle || `ARCHETYPE: ${archetype}`}
        archetype={archetype}
        assemblies={assemblies}
        activeStationCode={activePhase?.activeStationCode}
      />

      {/* 2. Global Audio Track if provided */}
      {audioUrl && (
        <Audio src={staticFile(cleanPath(audioUrl))} volume={1.0} />
      )}

      {/* 3. Dynamic Sequential Overlays & Spoken Audio per Phase */}
      {phaseIntervals.map(({ phase, from, durationInFrames }, idx) => (
        <Sequence
          key={`phase_seq_${phase.phaseId ?? idx}`}
          from={from}
          durationInFrames={durationInFrames}
        >
          {/* Phase Voice Narration Audio */}
          {phase.audioUrl ? (
            <Audio src={staticFile(cleanPath(phase.audioUrl))} volume={1.0} />
          ) : null}

          {/* Subtitle Narration Bar at the Bottom */}
          {phase.narration && (
            <div
              style={{
                position: "absolute",
                bottom: 54,
                left: 48,
                right: 48,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(5, 11, 20, 0.88)",
                  border: "1px solid rgba(0, 240, 255, 0.4)",
                  borderLeft: "4px solid #00f0ff",
                  borderRadius: 6,
                  padding: "14px 24px",
                  maxWidth: 920,
                  backdropFilter: "blur(12px)",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    lineHeight: 1.5,
                    color: "#f8fafc",
                    letterSpacing: "0.01em",
                  }}
                >
                  "{phase.narration}"
                </div>
              </div>
            </div>
          )}
        </Sequence>
      ))}
    </div>
  );
};
