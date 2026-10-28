import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VisualScene } from "../../../lib/types";
import { formatCounter } from "../../../lib/text";
import { ANTON_FAMILY } from "../../fonts";

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';

function imageSrc(scene: VisualScene) {
  const value = scene.imageUrl?.replace(/^\/+/, "");
  return value ? staticFile(value) : null;
}

function StageLabel({ text, accent }: { text: string; accent: string }) {
  if (!text) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 54,
        bottom: 340,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px 8px 12px",
        background: "rgba(4,6,10,0.78)",
        border: "1px solid rgba(255,255,255,0.18)",
        borderRadius: 6,
        fontFamily: MONO,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 4,
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: accent,
          boxShadow: `0 0 12px ${accent}`,
        }}
      />
      {text}
    </div>
  );
}

/** Film grain + vignette + top/bottom readability gradients across the full 1080x1920 screen. */
function PhotoTreatment({ danger }: { danger: boolean }) {
  return (
    <>
      {/* Top & bottom readability gradients for TopBar and Captions */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: danger
            ? "linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(20,0,0,0.12) 20%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.85) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      {/* Subtle film grain texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.1,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.55) 0.9px, transparent 1px)",
          backgroundSize: "5px 5px",
          mixBlendMode: "overlay",
        }}
      />
      {/* Subtle scanline */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.08,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.85) 1px, transparent 1px, transparent 4px)",
        }}
      />
      {/* Soft edge vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </>
  );
}

/**
 * Full-bleed SearXNG b-roll visual frame.
 * Fills 100% of the 1080x1920 canvas with smooth Ken Burns motion (pan/zoom/drift).
 * Eliminates artificial boxes, borders, and splits to keep viewer focus immersive and unified.
 */
export const KenBurnsImageFrame: React.FC<{ scene: VisualScene }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const src = imageSrc(scene);
  const accent = scene.accentColor || "#39FF14";
  const danger = scene.theme === "danger";
  const duration = Math.max(0.6, scene.duration ?? scene.endTime - scene.startTime);
  const progress = Math.min(1, frame / (duration * fps));

  const zoom =
    scene.kenBurns === false
      ? 1.04
      : interpolate(progress, [0, 1], [1.04, 1.16], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const driftX = interpolate(progress, [0, 1], [-20, 20]);
  const driftY = interpolate(progress, [0, 1], [10, -12]);
  const rotate = interpolate(progress, [0, 1], [-0.5, 0.5]);

  const fallbackPlate = (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 35% 30%, ${accent}33 0%, transparent 60%), linear-gradient(155deg, #07090d 0%, #101720 60%, #050608 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.2,
          backgroundImage: `linear-gradient(${accent}44 1px, transparent 1px), linear-gradient(90deg, ${accent}44 1px, transparent 1px)`,
          backgroundSize: "74px 74px",
          transform: `translate3d(${driftX * 0.4}px, ${driftY * 0.4}px, 0) scale(${zoom})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          left: "50%",
          top: "46%",
          marginLeft: -260,
          marginTop: -260,
          borderRadius: "50%",
          border: `2px solid ${accent}55`,
          boxShadow: `0 0 90px ${accent}22 inset`,
          transform: `scale(${0.9 + progress * 0.15})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 320,
          height: 320,
          left: "50%",
          top: "46%",
          marginLeft: -160,
          marginTop: -160,
          borderRadius: "50%",
          border: `2px dashed ${accent}44`,
          transform: `rotate(${progress * 90}deg)`,
        }}
      />
    </>
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* Background Plate / Image */}
      <div style={{ position: "absolute", inset: 0 }}>
        {src ? (
          <Img
            src={src}
            style={{
              position: "absolute",
              inset: -50,
              width: "calc(100% + 100px)",
              height: "calc(100% + 100px)",
              objectFit: "cover",
              filter: danger
                ? "saturate(0.9) contrast(1.12) brightness(0.8) hue-rotate(-6deg)"
                : "saturate(1.05) contrast(1.08) brightness(0.85)",
              transform: `scale(${zoom}) translate3d(${driftX}px, ${driftY}px, 0) rotate(${rotate}deg)`,
              transformOrigin: "center center",
            }}
          />
        ) : (
          fallbackPlate
        )}
      </div>

      {/* Cinematic Grading & Top/Bottom Gradients */}
      <PhotoTreatment danger={danger} />

      {/* Optional Highlight Metric / Counter Overlay */}
      {scene.metric || scene.counter ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "44%",
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              padding: "18px 38px",
              borderRadius: 24,
              background: "rgba(4, 7, 12, 0.75)",
              border: `2px solid ${accent}55`,
              boxShadow: `0 24px 60px rgba(0,0,0,0.8), 0 0 40px ${accent}28`,
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: ANTON_FAMILY,
                fontSize: 160,
                lineHeight: 0.9,
                color: "#FFFFFF",
                letterSpacing: -3,
                textShadow: `0 0 40px ${accent}88, 4px 4px 0 rgba(0,0,0,0.8)`,
              }}
            >
              {formatCounter(scene.counter?.to ?? scene.metric?.value ?? 0)}
            </div>
            {scene.metric?.suffix ? (
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: 8,
                  color: accent,
                  textTransform: "uppercase",
                  marginTop: 6,
                }}
              >
                {scene.metric.suffix}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Optional Source/Category Label */}
      <StageLabel text={scene.stageLabel ?? ""} accent={accent} />
    </AbsoluteFill>
  );
};
