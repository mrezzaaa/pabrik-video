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

export const TopHud: React.FC<{ topic: string; accent: string }> = ({
  topic,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = Math.min(1, frame / Math.max(1, durationInFrames));
  const elapsed = Math.floor(frame / fps);
  const total = Math.floor(durationInFrames / fps);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 9,
          backgroundColor: "rgba(255,255,255,0.14)",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: accent,
            boxShadow: `0 0 18px ${accent}`,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          top: 44,
          left: 54,
          right: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 34,
              height: 34,
              backgroundColor: accent,
              color: "#050505",
              fontFamily: "monospace",
              fontWeight: 900,
              fontSize: 22,
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
              fontFamily: "monospace",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: 5,
              color: "#fff",
              textTransform: "uppercase",
            }}
          >
            PABRIK VIDEO
          </div>
        </div>

        <div
          style={{
            fontFamily: "monospace",
            fontSize: 20,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.66)",
            textTransform: "uppercase",
            maxWidth: 430,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {topic}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 54,
          right: 54,
          bottom: 46,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "monospace",
          fontSize: 18,
          letterSpacing: 3,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        <span>
          {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
          {String(elapsed % 60).padStart(2, "0")} /{" "}
          {String(Math.floor(total / 60)).padStart(2, "0")}:
          {String(total % 60).padStart(2, "0")}
        </span>
        <span>1080×1920 // 30FPS // FB PRO REELS</span>
      </div>
    </AbsoluteFill>
  );
};

export const HookBanner: React.FC<{ hook: string; accent: string }> = ({
  hook,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame,
    fps,
    config: { damping: 13, mass: 0.5, stiffness: 170 },
  });
  const exit = interpolate(frame, [74, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (!hook) return null;

  return (
    <Sequence from={0} durationInFrames={90} layout="none">
      <div
        style={{
          position: "absolute",
          top: 150,
          left: 64,
          right: 64,
          display: "flex",
          justifyContent: "center",
          opacity: enter * exit,
          transform: `translateY(${(1 - enter) * -40}px) rotate(-1.5deg) scale(${interpolate(enter, [0, 1], [0.85, 1])})`,
        }}
      >
        <div
          style={{
            backgroundColor: "#050505",
            border: `4px solid ${accent}`,
            boxShadow: `10px 10px 0 ${accent}`,
            padding: "16px 26px 20px",
            maxWidth: 900,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 20,
              letterSpacing: 5,
              color: accent,
              marginBottom: 6,
            }}
          >
            ⚠ HOOK // 0-3 DETIK
          </div>
          <div
            style={{
              fontFamily: ANTON_FAMILY,
              fontSize: 62,
              lineHeight: 1,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: -0.5,
            }}
          >
            {hook}
          </div>
        </div>
      </div>
    </Sequence>
  );
};

export const CtaOverlay: React.FC<{ durationInFrames: number; accent: string }> = ({
  durationInFrames,
  accent,
}) => {
  const { fps } = useVideoConfig();
  const duration = Math.round(3.4 * fps);
  const from = Math.max(0, durationInFrames - duration);

  return (
    <Sequence from={from} durationInFrames={duration} layout="none">
      <CtaCard accent={accent} />
    </Sequence>
  );
};

const CtaCard: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        top: 760,
        left: 80,
        right: 80,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `rotate(-5deg) scale(${interpolate(
            spring({
              frame,
              fps,
              config: { damping: 9, mass: 0.5, stiffness: 150 },
            }),
            [0, 1],
            [0.4, 1],
          )}) translateY(${Math.sin(frame / 4) * 4}px)`,
          backgroundColor: "#050505",
          border: `7px solid ${accent}`,
          boxShadow: `14px 14px 0 ${accent}, 0 0 60px ${accent}66`,
          padding: "22px 38px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 26,
            letterSpacing: 7,
            color: accent,
            marginBottom: 4,
          }}
        >
          PART 2?
        </div>
        <div
          style={{
            fontFamily: ANTON_FAMILY,
            fontSize: 82,
            lineHeight: 0.9,
            color: "#fff",
            textTransform: "uppercase",
          }}
        >
          KOMEN
        </div>
        <div
          style={{
            fontFamily: ANTON_FAMILY,
            fontSize: 148,
            lineHeight: 0.9,
            color: "#FFFF00",
            textTransform: "uppercase",
            WebkitTextStroke: "4px #000",
            paintOrder: "stroke fill",
          }}
        >
          {"\"MAU\""}
        </div>
      </div>
    </div>
  );
};

export const IntroWipe: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 2, 8, 12], [1, 1, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (frame > 12) return null;

  return (
    <AbsoluteFill style={{ zIndex: 100, pointerEvents: "none", opacity }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: accent,
          transform: `translateY(${interpolate(frame, [0, 12], [0, -100])}%)`,
          opacity: 0.92,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          fontSize: 30,
          letterSpacing: 12,
          color: "#050505",
          fontWeight: 900,
        }}
      >
        PABRIK VIDEO
      </div>
    </AbsoluteFill>
  );
};
