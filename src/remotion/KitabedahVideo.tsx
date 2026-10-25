import React, { useMemo } from "react";
import { Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { VideoBlueprint, VideoBlueprintPhase } from "../lib/scene/types";
import { KitabedahScene } from "../lib/scene/remotion/KitabedahScene";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "./constants";

export interface KitabedahVideoProps {
  blueprint?: VideoBlueprint;
  visualStyle?: "xray" | "wireframe-green" | "blueprint";
  totalDurationInFrames?: number;
  audioUrl?: string;
}

const cleanPath = (p: string) => p.replace(/^\/+/, "").replace(/^public\/+/, "");

/**
 * Universal Kitabedah X-Ray Hologram Video Composition:
 * - Pure 3D X-Ray transparency with neon blue/cyan & orange engine highlights
 * - Black #000000 background
 * - Accumulative timeline (no Sequence stacking at frame 0)
 * - Dynamic topic-specific phase HUDs & telemetry
 */
export const KitabedahVideo: React.FC<KitabedahVideoProps> = ({
  blueprint = { videoTitle: "KITABEDAH", components: [], phases: [] },
  visualStyle = "xray",
  totalDurationInFrames,
  audioUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Accumulate sequence intervals strictly (Fix Section 1 & 6)
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
        title: "Sistem Transparan",
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

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: "#000000",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
      }}
    >
      {/* 1. Universal Procedural 3D Hologram Scene */}
      <KitabedahScene
        blueprint={blueprint}
        phase={activePhase}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />

      {/* 2. Audio Track if available */}
      {audioUrl && (
        <Audio src={staticFile(cleanPath(audioUrl))} volume={1.0} />
      )}

      {/* 3. Dynamic Sequential Overlays (Accumulated Timeline) */}
      {phaseIntervals.map(({ phase, from, durationInFrames }, idx) => (
        <Sequence
          key={`phase_seq_${phase.phaseId ?? idx}`}
          from={from}
          durationInFrames={durationInFrames}
        >
          {/* Top Hologram Header */}
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 48,
              right: 48,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              pointerEvents: "none",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.28em",
                  color: "#00D4FF",
                  opacity: 0.85,
                  marginBottom: 6,
                }}
              >
                // KITABEDAH 3D X-RAY // ARCHETYPE:{" "}
                {blueprint.subjectArchetype || "UNIVERSAL_CUTAWAY"}
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: "#FFFFFF",
                  letterSpacing: "-0.01em",
                  textShadow: "0 0 20px rgba(0, 212, 255, 0.6)",
                }}
              >
                {blueprint.videoTitle || "TEKNIK 3D"}
              </div>
            </div>

            {/* Dynamic Status Beacon */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "1px solid rgba(0, 212, 255, 0.4)",
                  backgroundColor: "rgba(0, 20, 40, 0.7)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#00D4FF",
                    boxShadow: "0 0 10px #00D4FF",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#BAE6FD",
                    letterSpacing: "0.15em",
                  }}
                >
                  PHASE {idx + 1}/{phaseIntervals.length}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                30 FPS METAL ACCELERATED
              </span>
            </div>
          </div>

          {/* Bottom Phase Title HUD (Spesifik per topik) */}
          <div
            style={{
              position: "absolute",
              bottom: 120,
              left: 48,
              right: 48,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                padding: "20px 28px",
                borderRadius: 12,
                border: "1px solid rgba(0, 212, 255, 0.35)",
                backgroundColor: "rgba(4, 15, 30, 0.8)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 32px rgba(0, 212, 255, 0.15)",
                maxWidth: "70%",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#38BDF8",
                  letterSpacing: "0.2em",
                  marginBottom: 6,
                }}
              >
                SUBSYSTEM FOCUS
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  color: "#FFFFFF",
                }}
              >
                {phase.title}
              </div>
              {phase.label && (
                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(186, 230, 253, 0.85)",
                    marginTop: 6,
                  }}
                >
                  {phase.label}
                </div>
              )}
            </div>

            {/* Dynamic Telemetry Channels */}
            {phase.telemetryChannels && phase.telemetryChannels.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {phase.telemetryChannels.map((ch, cIdx) => (
                  <div
                    key={`ch_${cIdx}`}
                    style={{
                      padding: "10px 18px",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 107, 53, 0.4)",
                      backgroundColor: "rgba(30, 10, 5, 0.75)",
                      backdropFilter: "blur(8px)",
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#FF6B35",
                        letterSpacing: "0.15em",
                      }}
                    >
                      {ch.name}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: "#FFFFFF",
                      }}
                    >
                      {ch.value} {ch.unit || ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Sequence>
      ))}

      {/* 4. Subtle Blueprint Corner Reticles */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          width: 30,
          height: 30,
          borderTop: "2px solid #00D4FF",
          borderLeft: "2px solid #00D4FF",
          pointerEvents: "none",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          width: 30,
          height: 30,
          borderTop: "2px solid #00D4FF",
          borderRight: "2px solid #00D4FF",
          pointerEvents: "none",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 24,
          width: 30,
          height: 30,
          borderBottom: "2px solid #00D4FF",
          borderLeft: "2px solid #00D4FF",
          pointerEvents: "none",
          opacity: 0.7,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 30,
          height: 30,
          borderBottom: "2px solid #00D4FF",
          borderRight: "2px solid #00D4FF",
          pointerEvents: "none",
          opacity: 0.7,
        }}
      />
    </div>
  );
};
