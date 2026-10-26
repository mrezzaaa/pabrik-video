import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ANTON_FAMILY } from "../fonts";
import type { SceneProps } from "../types";

export const SceneHeadline: React.FC<SceneProps> = ({ scene, index, total }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationFrames = Math.max(12, (scene.endTime - scene.startTime) * fps);

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 150 },
  });
  const exit = interpolate(
    frame,
    [durationFrames - 9, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const words = (scene.headline || "FAKTA GILA").split(" ").filter(Boolean);
  const activeIndex = Math.min(
    words.length - 1,
    Math.floor((frame / durationFrames) * words.length),
  );

  const revealed =
    scene.textAnimation.type === "typewriter"
      ? Array.from(scene.headline || "FAKTA GILA").slice(
          0,
          Math.floor(
            interpolate(frame, [0, Math.min(38, durationFrames * 0.6)], [0, 40], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          ),
        ).join("")
      : null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 292,
          left: 64,
          right: 64,
          opacity: exit,
          transform: `translateY(${(1 - enter) * 60}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginBottom: 26,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 26,
              letterSpacing: 5,
              padding: "10px 16px",
              backgroundColor: scene.accentColor,
              color: "#050505",
              fontWeight: 800,
              transform: "rotate(-2deg)",
            }}
          >
            {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 24,
              letterSpacing: 3,
              color: "rgba(255,255,255,0.7)",
              textTransform: "uppercase",
            }}
          >
            {scene.bRollKeywords.slice(0, 3).join(" / ") || "PABRIK VIDEO"}
          </div>
        </div>

        {revealed !== null ? (
          <div
            style={{
              fontFamily: ANTON_FAMILY,
              fontSize: 122,
              lineHeight: 0.92,
              letterSpacing: -2,
              textAlign: "center",
              textTransform: "uppercase",
              color: "#fff",
              WebkitTextStroke: "4px #000",
              paintOrder: "stroke fill",
              textShadow: `8px 8px 0 #050505, 0 0 36px ${scene.accentColor}55`,
            }}
          >
            {revealed}
            <span style={{ color: scene.accentColor }}>|</span>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "0 22px",
              fontFamily: ANTON_FAMILY,
              fontSize: 122,
              lineHeight: 0.92,
              letterSpacing: -2,
              textAlign: "center",
              textTransform: "uppercase",
            }}
          >
            {words.map((word, wordIndex) => {
              const wordSpring = spring({
                frame: frame - wordIndex * 2,
                fps,
                config: { damping: 11, mass: 0.5, stiffness: 180 },
              });
              const isActive =
                scene.textAnimation.type === "karaoke" &&
                wordIndex === activeIndex;

              return (
                <span
                  key={`${word}-${wordIndex}`}
                  style={{
                    color: isActive ? scene.accentColor : "#fff",
                    WebkitTextStroke: "4px #000",
                    paintOrder: "stroke fill",
                    textShadow: `8px 8px 0 #050505, 0 0 34px ${
                      isActive ? `${scene.accentColor}66` : "rgba(0,0,0,0.8)"
                    }`,
                    transform: `translateY(${(1 - wordSpring) * 44}px) scale(${
                      (scene.textAnimation.type === "popIn"
                        ? interpolate(wordSpring, [0, 1], [0.5, 1])
                        : 1) * (isActive ? 1.07 : 1)
                    }) rotate(${isActive ? -2 : 0}deg)`,
                    display: "inline-block",
                    opacity: wordSpring,
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        )}

        <div
          style={{
            margin: "28px auto 0",
            width: `${Math.min(100, 32 + (frame / durationFrames) * 68)}%`,
            maxWidth: 760,
            height: 10,
            backgroundColor: "rgba(0,0,0,0.55)",
            border: "3px solid rgba(255,255,255,0.18)",
            transform: "rotate(-1deg)",
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: scene.accentColor,
              boxShadow: `0 0 22px ${scene.accentColor}`,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
