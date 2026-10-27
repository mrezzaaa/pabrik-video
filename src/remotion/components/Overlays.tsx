import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ANTON_FAMILY } from "../fonts";

/**
 * Clean top bar: only a progress bar and a minimal topic pill.
 * No transcript, no FPS/resolution/timecode telemetry, no emojis.
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
 * 0-3s visual pattern interrupt: strobe, speed lines, scan bars and a rapid
 * zoom. Zero words — the narration and the bottom caption carry the message.
 */
export const PatternInterrupt: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, 6, 18], [0, 1, 0.82], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit = interpolate(frame, [Math.round(2.5 * fps), Math.round(3 * fps)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strobe = frame < 4 ? 0.5 : frame < 7 ? 0.22 : 0;
  const sweep = interpolate(frame, [0, 34], [-120, 1120], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bars = 9;

  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", zIndex: 45, opacity: exit * enter }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 42%, ${accent}22 0%, rgba(0,0,0,0) 62%)`,
        }}
      />

      {/* All geometry stays inside the center stage so captions are never crossed. */}
      <div
        style={{
          position: "absolute",
          top: 280,
          left: 0,
          right: 0,
          height: 1000,
          overflow: "hidden",
        }}
      >
        {Array.from({ length: bars }).map((_, index) => {
          const height = 18 + (index % 3) * 16;
          const y = 24 + index * 108;
          return (
            <div
              key={`speed-${index}`}
              style={{
                position: "absolute",
                top: y,
                left: 0,
                width: `${36 + (index % 4) * 14}%`,
                height,
                background: `linear-gradient(90deg, ${accent}00 0%, ${accent}66 45%, ${accent}00 100%)`,
                transform: `translateX(${((frame * (12 + index * 4)) % 900) - 280}px) skewX(-24deg)`,
                opacity: 0.26 + (index % 3) * 0.12,
                mixBlendMode: "screen",
              }}
            />
          );
        })}

        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 220,
            left: sweep,
            background: `linear-gradient(90deg, transparent, ${accent}55, transparent)`,
            mixBlendMode: "screen",
            transform: "skewX(-14deg)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 6,
            background: accent,
            boxShadow: `0 0 38px ${accent}`,
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 6,
            background: accent,
            boxShadow: `0 0 38px ${accent}`,
            opacity: 0.8,
          }}
        />
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
