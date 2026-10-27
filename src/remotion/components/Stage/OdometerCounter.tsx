import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VisualScene } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';

function integer(value: number) {
  return Number.isFinite(value) ? String(Math.round(value)) : "0";
}

/**
 * Slot-machine odometer. Every decimal place is a physical wheel: the ones
 * wheel rolls continuously, higher wheels only roll when the lower places
 * approach a wrap (classic mechanical carry).
 */
export const OdometerCounter: React.FC<{ scene: VisualScene }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const accent = scene.accentColor || "#39FF14";

  const target = Math.round(scene.counter?.to ?? scene.metric?.value ?? 0);
  const from = Math.round(
    scene.counter?.from ??
      Math.max(0, target - Math.max(6, Math.round(target * 0.18))),
  );
  const suffix = scene.metric?.suffix ?? scene.counter?.suffix ?? "";
  const label = scene.stageLabel ?? "";
  const places = Math.max(1, integer(target).length);

  if (!Number.isFinite(target) || target === 0) return null;

  const duration = Math.max(0.6, Math.min(1.1, (scene.duration ?? 2.4) * 0.48));
  const enter = spring({
    frame,
    fps,
    durationInFrames: Math.round(duration * fps),
    config: { damping: 18, mass: 0.9, stiffness: 64 },
  });
  const value = interpolate(enter, [0, 1], [from, target], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const size = places >= 4 ? 212 : places === 3 ? 268 : 330;
  const cellHeight = Math.round(size * 0.94);
  const columnWidth = Math.round(size * 0.6);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(165deg, #070a0e 0%, #0d141b 52%, #050608 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.28,
          backgroundImage: `linear-gradient(${accent}33 1px, transparent 1px), linear-gradient(90deg, ${accent}33 1px, transparent 1px)`,
          backgroundSize: "82px 82px",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${interpolate(enter, [0, 1], [22, 30])}%`,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accent}66, transparent)`,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          paddingBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {label || "METRIK"}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: 8,
            padding: "0 26px",
          }}
        >
          {integer(target)
            .split("")
            .map((_, index) => {
              const placeValue = 10 ** (places - 1 - index);
              const wheel = (value / placeValue) % 10;
              const base = Math.floor(wheel);
              const fraction = wheel - base;
              const roll =
                index === places - 1
                  ? fraction
                  : Math.max(0, fraction * 10 - 9);
              const digit = base % 10;
              const next = (digit + 1) % 10;

              return (
                <div
                  key={`wheel-${index}`}
                  style={{
                    width: columnWidth,
                    height: cellHeight,
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      transform: `translateY(${-roll * cellHeight}px)`,
                    }}
                  >
                    {[digit, next].map((current, slot) => (
                      <div
                        key={`${index}-${slot}`}
                        style={{
                          height: cellHeight,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: ANTON_FAMILY,
                          fontSize: size,
                          lineHeight: 1,
                          color: "#F8FAFC",
                          WebkitTextStroke: "3px rgba(0,0,0,0.55)",
                          paintOrder: "stroke fill",
                          textShadow: `0 0 44px ${accent}2e`,
                        }}
                      >
                        {current}
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(5,6,8,0.85) 0%, transparent 16%, transparent 84%, rgba(5,6,8,0.85) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              );
            })}

          {suffix ? (
            <div
              style={{
                marginTop: Math.round(size * 0.24),
                paddingLeft: 14,
                fontFamily: MONO,
                fontSize: Math.round(size * 0.2),
                fontWeight: 800,
                letterSpacing: 4,
                color: accent,
                textShadow: `0 0 30px ${accent}66`,
                whiteSpace: "nowrap",
              }}
            >
              {suffix.replace(/^[^A-Za-z%]+/, "")}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
          }}
        >
          {Array.from({ length: 24 }).map((_, tick) => (
            <div
              key={`tick-${tick}`}
              style={{
                width: 12,
                height: tick % 4 === 0 ? 18 : 8,
                background:
                  tick % 4 === 0 ? accent : "rgba(255,255,255,0.18)",
                opacity: tick % 4 === 0 ? 0.9 : 0.55,
              }}
            />
          ))}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "2px solid rgba(255,255,255,0.08)",
        }}
      />
    </AbsoluteFill>
  );
};
