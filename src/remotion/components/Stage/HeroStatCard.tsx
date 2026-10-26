import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { formatCounter } from "../../../lib/text";
import type { SceneVisual, VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";
import { StatBody } from "./VisualParts";

const MONO = "ui-monospace, Menlo, Consolas, monospace";

/**
 * HERO_STAT_CARD — giant number / statistic inside a glassmorphic card with a
 * pulsing accent border and floating contextual badges.
 */
export const HeroStatCard: React.FC<{
  scene: VisualScene;
  index: number;
  accent: string;
  theme: "danger" | "warn" | "info" | "success";
}> = ({ scene, index, accent, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneSeconds = Math.max(0.5, scene.endTime - scene.startTime);
  const localFrames = Math.max(12, Math.round(sceneSeconds * fps));
  const t = frame / fps;

  const enter = spring({
    frame,
    fps,
    config: { damping: 13, mass: 0.55, stiffness: 190 },
  });
  const exit = interpolate(
    frame,
    [localFrames - 7, localFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const pulse = 0.5 + 0.5 * Math.sin(t * 4.2 + index);

  const stat: Extract<SceneVisual, { kind: "stat" }> | null =
    scene.visual?.kind === "stat"
      ? scene.visual
      : scene.overlay?.counter
        ? {
            kind: "stat",
            value: scene.overlay.counter.value,
            prefix: scene.overlay.counter.prefix ?? "",
            suffix: scene.overlay.counter.suffix ?? "",
            label: scene.subheadline || scene.headline,
          }
        : null;

  const subheadline =
    scene.subheadline ||
    (stat
      ? `${formatCounter(stat.value)}${stat.suffix}`
      : scene.overlay?.textHook ?? "");

  const tags = (scene.tags ?? []).slice(0, 3);
  const danger = theme === "danger";
  const headlineSize =
    scene.headline.length > 20 ? 64 : scene.headline.length > 12 ? 76 : 88;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: enter * exit,
        transform: `translateY(${(1 - enter) * 60}px) scale(${0.9 + 0.1 * enter})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 34,
          background: danger
            ? "linear-gradient(160deg, rgba(28,4,10,0.86) 0%, rgba(8,8,14,0.92) 100%)"
            : "linear-gradient(160deg, rgba(10,18,32,0.82) 0%, rgba(4,8,16,0.92) 100%)",
          border: `3px solid ${accent}`,
          boxShadow: `0 28px 90px rgba(0,0,0,0.65), 0 0 ${28 + pulse * 34}px ${accent}55, inset 0 0 70px ${accent}12`,
          overflow: "hidden",
        }}
      >
        {/* glass sheen */}
        <div
          style={{
            position: "absolute",
            top: -140,
            left: -80,
            width: 620,
            height: 340,
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%)",
            transform: "rotate(-12deg)",
          }}
        />

        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "36px 40px 26px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 18,
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: 22,
                letterSpacing: 5,
                color: accent,
                textTransform: "uppercase",
              }}
            >
              {danger ? "⚠ PERINGATAN" : "STATISTIK"}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 20,
                letterSpacing: 3,
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              fontFamily: ANTON_FAMILY,
              fontSize: headlineSize,
              lineHeight: 0.92,
              color: "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: -1,
              textShadow: `0 6px 0 rgba(0,0,0,0.55)`,
            }}
          >
            {scene.headline}
          </div>

          {stat ? (
            <>
              <div style={{ position: "relative", flex: 1, marginTop: 6 }}>
                <StatBody stat={stat} t={t} fps={fps} accent={accent} />
              </div>
              <div
                style={{
                  alignSelf: "center",
                  marginTop: -8,
                  padding: "10px 26px",
                  borderRadius: 999,
                  background: accent,
                  color: "#050505",
                  fontFamily: ANTON_FAMILY,
                  fontSize: 34,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  transform: `scale(${interpolate(
                    spring({
                      frame: frame - 6,
                      fps,
                      config: { damping: 10, mass: 0.4, stiffness: 220 },
                    }),
                    [0, 1],
                    [0.6, 1],
                  )})`,
                  boxShadow: `0 10px 30px ${accent}55`,
                }}
              >
                {subheadline}
              </div>
            </>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: ANTON_FAMILY,
                fontSize: 54,
                color: accent,
                textAlign: "center",
                textTransform: "uppercase",
              }}
            >
              {subheadline}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              marginTop: 16,
              flexWrap: "wrap",
            }}
          >
            {tags.map((tag, tagIndex) => (
              <div
                key={`${tag}-${tagIndex}`}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `2px solid ${accent}88`,
                  color: accent,
                  fontFamily: MONO,
                  fontSize: 18,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  background: "rgba(0,0,0,0.35)",
                  transform: `translateY(${Math.sin(t * 2.2 + tagIndex) * 4}px) rotate(${tagIndex % 2 === 0 ? -1.5 : 1.5}deg)`,
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* floating contextual badges */}
      {tags.slice(0, 2).map((tag, tagIndex) => (
        <div
          key={`float-${tag}-${tagIndex}`}
          style={{
            position: "absolute",
            top: tagIndex === 0 ? -18 : undefined,
            bottom: tagIndex === 1 ? 96 : undefined,
            right: tagIndex === 0 ? 34 : undefined,
            left: tagIndex === 1 ? -22 : undefined,
            padding: "10px 20px",
            background: tagIndex === 0 ? "#FFFFFF" : accent,
            color: "#050505",
            fontFamily: ANTON_FAMILY,
            fontSize: 24,
            letterSpacing: 1,
            textTransform: "uppercase",
            transform: `rotate(${tagIndex === 0 ? 4 : -5}deg) translateY(${Math.sin(t * 2.6 + tagIndex * 1.7) * 7}px)`,
            boxShadow: "0 12px 30px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
            maxWidth: 300,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {tag}
        </div>
      ))}
    </div>
  );
};
