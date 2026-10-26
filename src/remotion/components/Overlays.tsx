import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ANTON_FAMILY } from "../fonts";

/**
 * Clean top bar: only a progress bar and a minimal topic pill.
 * No FPS/resolution/timecode telemetry.
 */
export const TopBar: React.FC<{ topic: string; accent: string }> = ({
  topic,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(1, durationInFrames));

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 10,
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: accent,
            boxShadow: `0 0 20px ${accent}`,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 58,
          left: 54,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 18px 8px 10px",
          borderRadius: 999,
          background: "rgba(5,8,14,0.62)",
          border: "2px solid rgba(255,255,255,0.14)",
          backdropFilter: "blur(8px)",
          maxWidth: 760,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            backgroundColor: accent,
            color: "#050505",
            fontFamily: ANTON_FAMILY,
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-6deg)",
          }}
        >
          PV
        </div>
        <div
          style={{
            fontFamily: "ui-monospace, Menlo, monospace",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            color: "rgba(255,255,255,0.88)",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {topic}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * 0-3s pattern interrupt: strobe, warning tape, rapid zoom.
 * It replaces the old static orange card entirely.
 */
export const HookInterrupt: React.FC<{ hook: string; accent: string }> = ({
  hook,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoom = spring({
    frame,
    fps,
    config: { damping: 9, mass: 0.55, stiffness: 240 },
  });
  const exit = interpolate(frame, [78, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strobe = frame < 5 ? 0.42 : frame < 8 ? 0.18 : 0;
  const tapeShift = (frame * 5) % 72;
  const fontSize = hook.length > 78 ? 52 : hook.length > 46 ? 64 : 80;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 45, opacity: exit }}>
      <div
        style={{
          position: "absolute",
          top: 380,
          left: 0,
          right: 0,
          height: 76,
          background:
            "repeating-linear-gradient(125deg, #FFD400 0px, #FFD400 36px, #0A0A0A 36px, #0A0A0A 72px)",
          transform: `translateX(${tapeShift - 72}px) rotate(-1.2deg)`,
          opacity: 0.96,
          boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 470,
          left: 0,
          right: 0,
          height: 56,
          background:
            "repeating-linear-gradient(125deg, #FFD400 0px, #FFD400 30px, #0A0A0A 30px, #0A0A0A 60px)",
          transform: `translateX(${-tapeShift + 20}px) rotate(1deg)`,
          opacity: 0.9,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 470,
          left: 54,
          right: 54,
          bottom: 540,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: 940,
            padding: "34px 38px 38px",
            background: "rgba(4,6,10,0.9)",
            border: `5px solid ${accent}`,
            boxShadow: `18px 18px 0 ${accent}, 0 0 90px ${accent}55`,
            transform: `rotate(-2deg) scale(${1.28 - 0.28 * zoom})`,
          }}
        >
          <div
            style={{
              display: "inline-block",
              marginBottom: 18,
              padding: "6px 14px",
              background: accent,
              color: "#050505",
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: 4,
            }}
          >
            ⚠ JANGAN SCROLL
          </div>
          <div
            style={{
              fontFamily: ANTON_FAMILY,
              fontSize,
              lineHeight: 0.96,
              color: "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: -1,
              textShadow: `0 5px 0 rgba(0,0,0,0.7), 0 0 40px ${accent}55`,
            }}
          >
            {hook}
          </div>
        </div>
      </div>

      <AbsoluteFill
        style={{
          backgroundColor: accent,
          opacity: strobe,
          mixBlendMode: "screen",
        }}
      />
    </AbsoluteFill>
  );
};

/** Small CTA pill during the final 3s, above the caption safe zone. */
export const CtaBadge: React.FC<{
  durationInFrames: number;
  accent: string;
}> = ({ durationInFrames, accent }) => {
  const { fps } = useVideoConfig();
  const duration = Math.round(3.2 * fps);
  const from = Math.max(0, durationInFrames - duration);

  return (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <CtaBadgeInner accent={accent} />
    </Sequence>
  );
};

const CtaBadgeInner: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: { damping: 10, mass: 0.45, stiffness: 220 },
  });
  const pulse = 1 + Math.sin(frame / 4) * 0.02;

  return (
    <div
      style={{
        position: "absolute",
        top: 150,
        right: 54,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 22px",
        borderRadius: 999,
        background: accent,
        color: "#050505",
        border: "4px solid #050505",
        boxShadow: `8px 8px 0 #050505, 0 0 40px ${accent}88`,
        transform: `translateY(${(1 - enter) * -30}px) scale(${enter * pulse})`,
        fontFamily: ANTON_FAMILY,
        fontSize: 30,
        letterSpacing: 1,
        textTransform: "uppercase",
        zIndex: 60,
        pointerEvents: "none",
      }}
    ></div>
  );
};

export const IntroWipe: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 1, 6, 9], [1, 1, 0.7, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame > 9) return null;

  return (
    <AbsoluteFill style={{ zIndex: 100, pointerEvents: "none", opacity }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: accent,
          transform: `translateY(${interpolate(frame, [0, 9], [0, -100])}%)`,
          opacity: 0.94,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: ANTON_FAMILY,
          fontSize: 44,
          letterSpacing: 10,
          color: "#050505",
        }}
      >
        PABRIK VIDEO
      </div>
    </AbsoluteFill>
  );
};
