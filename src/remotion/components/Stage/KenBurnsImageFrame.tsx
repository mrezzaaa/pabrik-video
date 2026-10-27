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
        left: 22,
        bottom: 18,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 14px 6px 10px",
        background: "rgba(4,6,10,0.72)",
        border: "1px solid rgba(255,255,255,0.14)",
        borderRadius: 4,
        fontFamily: MONO,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 5,
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.8)",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          background: accent,
          boxShadow: `0 0 12px ${accent}`,
        }}
      />
      {text}
    </div>
  );
}

function HudCorners({ accent }: { accent: string }) {
  const corner = (style: React.CSSProperties) => (
    <div
      style={{
        position: "absolute",
        width: 46,
        height: 46,
        borderColor: accent,
        borderStyle: "solid",
        borderWidth: 0,
        opacity: 0.85,
        ...style,
      }}
    />
  );
  return (
    <>
      {corner({ top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3 })}
      {corner({ top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3 })}
      {corner({ bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3 })}
      {corner({ bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3 })}
    </>
  );
}

/** Film grain + halftone + vignette treatment that sits on top of every photo. */
function PhotoTreatment({ danger }: { danger: boolean }) {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: danger
            ? "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(20,0,0,0.1) 42%, rgba(0,0,0,0.78) 100%)"
            : "linear-gradient(180deg, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.06) 44%, rgba(0,0,0,0.8) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.14,
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.55) 0.9px, transparent 1px)",
          backgroundSize: "5px 5px",
          mixBlendMode: "overlay",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.16,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.85) 1px, transparent 1px, transparent 4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.62) 100%)",
        }}
      />
    </>
  );
}

/**
 * SearXNG b-roll frame. Three structurally different treatments rotate across
 * scenes: full bleed, diagonal split reveal and a rounded glass frame.
 * The only text permitted here is a 1-2 word axis label or a metric.
 */
export const KenBurnsImageFrame: React.FC<{ scene: VisualScene }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const src = imageSrc(scene);
  const accent = scene.accentColor || "#39FF14";
  const danger = scene.theme === "danger";
  const style = scene.imageStyle ?? "fullBleed";
  const duration = Math.max(0.6, scene.duration ?? scene.endTime - scene.startTime);
  const progress = Math.min(1, frame / (duration * fps));

  const zoom =
    scene.kenBurns === false
      ? 1.02
      : interpolate(progress, [0, 1], [1.02, 1.16], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const driftX = interpolate(progress, [0, 1], [-24, 24]);
  const driftY = interpolate(progress, [0, 1], [12, -14]);
  const rotate = interpolate(progress, [0, 1], [-0.6, 0.6]);

  const photo = (extra?: React.CSSProperties): React.ReactNode =>
    src ? (
      <Img
        src={src}
        style={{
          position: "absolute",
          inset: -40,
          width: "calc(100% + 80px)",
          height: "calc(100% + 80px)",
          objectFit: "cover",
          filter: danger
            ? "saturate(0.86) contrast(1.12) brightness(0.78) hue-rotate(-8deg)"
            : "saturate(1.04) contrast(1.08) brightness(0.82)",
          transform: `scale(${zoom}) translate3d(${driftX}px, ${driftY}px, 0) rotate(${rotate}deg)`,
          transformOrigin: "center center",
          ...extra,
        }}
      />
    ) : null;

  const fallbackPlate = (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 32% 28%, ${accent}33 0%, transparent 58%), linear-gradient(155deg, #07090d 0%, #101720 60%, #050608 100%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.24,
          backgroundImage: `linear-gradient(${accent}44 1px, transparent 1px), linear-gradient(90deg, ${accent}44 1px, transparent 1px)`,
          backgroundSize: "74px 74px",
          transform: `translate3d(${driftX * 0.4}px, ${driftY * 0.4}px, 0) scale(${zoom})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          left: "50%",
          top: "46%",
          marginLeft: -210,
          marginTop: -210,
          borderRadius: "50%",
          border: `2px solid ${accent}55`,
          boxShadow: `0 0 90px ${accent}22 inset`,
          transform: `scale(${0.9 + progress * 0.2})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 240,
          height: 240,
          left: "50%",
          top: "46%",
          marginLeft: -120,
          marginTop: -120,
          borderRadius: "50%",
          border: `2px dashed ${accent}44`,
          transform: `rotate(${progress * 90}deg)`,
        }}
      />
    </>
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden", borderRadius: 2 }}>
      {style === "split" ? (
        <>
          <div style={{ position: "absolute", inset: 0 }}>{fallbackPlate}</div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: `polygon(0 0, ${62 + progress * 3}% 0, ${54 + progress * 3}% 100%, 0 100%)`,
              overflow: "hidden",
            }}
          >
            {photo()}
            <PhotoTreatment danger={danger} />
          </div>
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 6,
              left: `${60 + progress * 3}%`,
              background: accent,
              boxShadow: `0 0 40px ${accent}`,
              transform: "skewX(-7deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 0,
              width: "40%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              paddingRight: 14,
            }}
          >
            {scene.metric || scene.counter ? (
              <div
                style={{
                  fontFamily: ANTON_FAMILY,
                  fontSize: 180,
                  lineHeight: 0.86,
                  color: "#FFFFFF",
                  letterSpacing: -4,
                  textShadow: `0 0 46px ${accent}66, 6px 6px 0 rgba(0,0,0,0.65)`,
                }}
              >
                {formatCounter(scene.counter?.to ?? scene.metric?.value ?? 0)}
              </div>
            ) : (
              <div
                style={{
                  position: "relative",
                  width: 260,
                  height: 260,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {[0, 1, 2].map((ring) => (
                  <div
                    key={`ring-${ring}`}
                    style={{
                      position: "absolute",
                      width: 260 - ring * 64,
                      height: 260 - ring * 64,
                      borderRadius: "50%",
                      border: `2px ${ring % 2 === 0 ? "solid" : "dashed"} ${accent}${ring === 0 ? "cc" : "66"}`,
                      transform: `rotate(${progress * (40 + ring * 30)}deg)`,
                    }}
                  />
                ))}
                <div
                  style={{
                    position: "absolute",
                    width: 2,
                    height: 300,
                    background: `linear-gradient(180deg, transparent, ${accent}, transparent)`,
                    transform: `translateY(${interpolate(progress, [0, 1], [-60, 60])}px)`,
                    opacity: 0.6,
                  }}
                />
                <div
                  style={{
                    width: 16,
                    height: 16,
                    background: accent,
                    boxShadow: `0 0 30px ${accent}`,
                  }}
                />
              </div>
            )}
            {scene.metric?.suffix ? (
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 34,
                  fontWeight: 700,
                  letterSpacing: 8,
                  color: accent,
                  textTransform: "uppercase",
                }}
              >
                {scene.metric.suffix}
              </div>
            ) : null}
          </div>
          <HudCorners accent={accent} />
          <StageLabel text={scene.stageLabel ?? ""} accent={accent} />
        </>
      ) : style === "glass" ? (
        <>
          {src ? (
            <Img
              src={src}
              style={{
                position: "absolute",
                inset: -60,
                width: "calc(100% + 120px)",
                height: "calc(100% + 120px)",
                objectFit: "cover",
                filter: "blur(34px) brightness(0.4) saturate(1.1)",
                transform: `scale(${1.12 + progress * 0.05})`,
              }}
            />
          ) : (
            fallbackPlate
          )}
          <div
            style={{
              position: "absolute",
              inset: `${28 + progress * 6}px 22px`,
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: `0 44px 90px rgba(0,0,0,0.72), 0 0 0 1px ${accent}33, 0 0 70px ${accent}22`,
              transform: `translate3d(${driftX * 0.35}px, ${driftY * 0.35}px, 0) rotate(${rotate * 0.35}deg)`,
            }}
          >
            {photo()}
            <PhotoTreatment danger={danger} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                border: `2px solid ${accent}55`,
                borderRadius: 24,
              }}
            />
          </div>
          <StageLabel text={scene.stageLabel ?? ""} accent={accent} />
        </>
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0 }}>{fallbackPlate}</div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: src ? 1 : 0,
              overflow: "hidden",
            }}
          >
            {photo()}
          </div>
          <PhotoTreatment danger={danger} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${interpolate(progress, [0, 1], [8, 84])}%`,
              height: 3,
              background: `linear-gradient(90deg, transparent 0%, ${accent} 18%, ${accent} 82%, transparent 100%)`,
              opacity: 0.5,
              mixBlendMode: "screen",
            }}
          />
          <HudCorners accent={accent} />
          <StageLabel text={scene.stageLabel ?? ""} accent={accent} />
        </>
      )}
    </AbsoluteFill>
  );
};
