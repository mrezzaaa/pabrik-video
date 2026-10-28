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

/**
 * Empat visual "editorial" untuk center stage (960x1000):
 * stamp, compare, crosssection (cutaway berlapis), timeline.
 * Aturan stage tetap berlaku: tidak ada kalimat narasi, hanya label 1-2 kata.
 * Animasi murni fungsi waktu t (frame + visualOffset) sehingga lanjut mulus
 * kalau satu kalimat dipecah jadi beberapa scene 2.5 detik.
 */

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, monospace';
const INK = "#E8F4FF";
const RED = "#FF3B3B";
const GREEN = "#39FF14";
const W = 960;
const H = 1000;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Spring murni (tanpa hook) supaya bisa dipanggil di dalam loop. */
const pop = (t: number, fps: number, delay = 0, damping = 12) =>
  spring({
    frame: Math.max(0, Math.round((t - delay) * fps)),
    fps,
    config: { damping, mass: 0.5, stiffness: 180 },
  });

function useStageTime(scene: VisualScene) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { t: frame / fps + (scene.visualOffset ?? 0), fps };
}

const Backdrop: React.FC<{ accent: string; tag: string }> = ({
  accent,
  tag,
}) => {
  if (!tag) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 24,
        padding: "6px 14px",
        background: "rgba(4,6,12,0.65)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 4,
        fontFamily: MONO,
        fontSize: 20,
        letterSpacing: 4,
        color: accent,
        backdropFilter: "blur(6px)",
      }}
    >
      {tag}
    </div>
  );
};

/* ---------------------------------- stamp --------------------------------- */

export const StampStage: React.FC<{ scene: VisualScene; index: number }> = ({
  scene,
  index,
}) => {
  const { t, fps } = useStageTime(scene);
  const word = scene.stamp?.word;
  if (!word) return null;

  const danger = word === "MITOS" || word === "BAHAYA";
  const color = danger ? "#FF2D2D" : GREEN;
  const slam = spring({
    frame: Math.round(t * fps),
    fps,
    config: { damping: 9, mass: 0.7, stiffness: 260 },
  });
  const scale = 3 - 2 * slam;
  const impact = clamp01((t - 0.16) / 0.4);
  const shake = t > 0.16 ? Math.sin(t * 90) * 16 * (1 - impact) : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop accent={color} tag={`FIG.${String(index + 1).padStart(2, "0")}`} />
      {/* shock-ring saat cap mendarat */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 300 + impact * 700,
          height: 300 + impact * 700,
          marginLeft: -(150 + impact * 350),
          marginTop: -(150 + impact * 350),
          borderRadius: "50%",
          border: `6px solid ${color}`,
          opacity: t > 0.16 ? (1 - impact) * 0.7 : 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: ANTON_FAMILY,
            fontSize: 220,
            letterSpacing: 10,
            lineHeight: 1,
            color,
            border: `18px solid ${color}`,
            padding: "14px 44px",
            background: "rgba(0,0,0,0.55)",
            textShadow: `0 0 50px ${color}`,
            boxShadow: `0 0 70px ${color}88, inset 0 0 40px ${color}44`,
            opacity: clamp01(t / 0.1),
            transform: `translate(${shake}px, ${shake * 0.6}px) rotate(-7deg) scale(${scale})`,
          }}
        >
          {word}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* --------------------------------- compare -------------------------------- */

const Cross: React.FC<{ color: string }> = ({ color }) => (
  <svg width={54} height={54} viewBox="0 0 54 54">
    <path d="M9 9L45 45M45 9L9 45" stroke={color} strokeWidth={9} strokeLinecap="round" fill="none" />
  </svg>
);

const Tick: React.FC<{ color: string }> = ({ color }) => (
  <svg width={54} height={54} viewBox="0 0 54 54">
    <path d="M7 29L21 43L47 11" stroke={color} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const CompareStage: React.FC<{ scene: VisualScene; index: number }> = ({
  scene,
  index,
}) => {
  const { t, fps } = useStageTime(scene);
  const compare = scene.compare;
  if (!compare) return null;
  const accent = scene.accentColor || GREEN;

  const column = (
    side: { title: string; items: string[] },
    color: string,
    good: boolean,
    dir: -1 | 1,
  ) => {
    const head = pop(t, fps, 0.12);
    return (
      <div style={{ width: 400, display: "flex", flexDirection: "column", gap: 34 }}>
        <div
          style={{
            textAlign: "center",
            background: color,
            color: "#000",
            fontFamily: ANTON_FAMILY,
            fontSize: 64,
            letterSpacing: 2,
            padding: "10px 0",
            transform: `scale(${head})`,
          }}
        >
          {side.title}
        </div>
        {side.items.map((item, i) => {
          const p = pop(t, fps, 0.4 + i * 0.26);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                opacity: clamp01(p * 1.5),
                transform: `translateX(${(1 - p) * 80 * dir}px)`,
              }}
            >
              {good ? <Tick color={color} /> : <Cross color={color} />}
              <span
                style={{
                  fontFamily: ANTON_FAMILY,
                  fontSize: 52,
                  color: "#fff",
                  lineHeight: 1.1,
                }}
              >
                {item}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const vs = pop(t, fps, 0.28, 8);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop accent={accent} tag={`FIG.${String(index + 1).padStart(2, "0")}`} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "0 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {column(compare.left, RED, false, -1)}
        {column(compare.right, accent, true, 1)}
      </div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 118,
          height: 118,
          marginLeft: -59,
          marginTop: -59,
          borderRadius: "50%",
          background: "#fff",
          color: "#000",
          fontFamily: ANTON_FAMILY,
          fontSize: 58,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${vs}) rotate(${(1 - vs) * 90}deg)`,
          boxShadow: `0 0 50px ${accent}`,
        }}
      >
        VS
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------- crosssection ------------------------------ */

const LAYER_COLORS = ["#4FC3F7", "#29B6F6", "#1E88E5", "#1565C0", "#FFB300"];

export const CrossSectionStage: React.FC<{
  scene: VisualScene;
  index: number;
}> = ({ scene, index }) => {
  const { t, fps } = useStageTime(scene);
  const layers = scene.layers ?? [];
  if (layers.length === 0) return null;
  const accent = scene.accentColor || GREEN;

  const n = layers.length;
  const stackH = 560;
  const gap = 12;
  const h = (stackH - gap * (n - 1)) / n;
  const x0 = 70;
  const w = 330;
  const d = 70;
  const yTop = 270;
  const step = 0.36;
  const sweepEnd = 0.2 + n * step;
  const scanY = interpolate(t, [0.1, sweepEnd], [yTop - 24, yTop + stackH + 12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanOpacity = interpolate(t, [sweepEnd, sweepEnd + 0.3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const title = (scene.stageLabel || "POTONGAN").toUpperCase();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop accent={accent} tag={`FIG.${String(index + 1).padStart(2, "0")}`} />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <pattern id="hatchStage" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="9" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
          </pattern>
        </defs>
        <text x={40} y={150} fill={INK} fontFamily={ANTON_FAMILY} fontSize={64}>
          {title}
        </text>
        <text x={40} y={196} fill={accent} fontFamily={MONO} fontSize={26} letterSpacing={4}>
          POTONGAN A-A
        </text>
        {layers.map((layer, i) => {
          const delay = 0.2 + i * step;
          const p = pop(t, fps, delay, 11);
          const y = yTop + i * (h + gap) + (1 - p) * -120;
          const col = LAYER_COLORS[i % LAYER_COLORS.length];
          const cy = y + h / 2;
          const lineP = clamp01((t - delay - 0.12) / 0.25);
          const lx = x0 + w + d * 0.5;
          const ly = cy - d * 0.25;
          const tx = x0 + w + d + 64;
          return (
            <g key={i} opacity={clamp01(p * 1.6)}>
              {i === 0 ? (
                <polygon
                  points={`${x0},${y} ${x0 + d},${y - d * 0.5} ${x0 + w + d},${y - d * 0.5} ${x0 + w},${y}`}
                  fill={col}
                  stroke={INK}
                  strokeWidth={2}
                />
              ) : null}
              <rect x={x0} y={y} width={w} height={h} fill={col} fillOpacity={0.9} stroke={INK} strokeWidth={2.5} />
              <rect x={x0} y={y} width={w} height={h} fill="url(#hatchStage)" />
              <polygon
                points={`${x0 + w},${y} ${x0 + w + d},${y - d * 0.5} ${x0 + w + d},${y + h - d * 0.5} ${x0 + w},${y + h}`}
                fill="#000"
                fillOpacity={0.38}
                stroke={INK}
                strokeWidth={2.5}
              />
              <line
                x1={lx}
                y1={ly}
                x2={lx + (tx - 18 - lx) * lineP}
                y2={ly + (cy - ly) * lineP}
                stroke={accent}
                strokeWidth={2.5}
              />
              <circle cx={lx} cy={ly} r={6} fill={accent} />
              <text
                x={tx}
                y={cy + 16}
                fill="#fff"
                fontFamily={ANTON_FAMILY}
                fontSize={52}
                opacity={lineP}
              >
                {layer.label}
              </text>
            </g>
          );
        })}
        <g opacity={scanOpacity}>
          <line x1={20} y1={scanY} x2={W - 20} y2={scanY} stroke="#00E5FF" strokeWidth={3} />
          <rect x={20} y={scanY - 40} width={W - 40} height={40} fill="#00E5FF" fillOpacity={0.14} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

/* -------------------------------- timeline -------------------------------- */

export const TimelineStage: React.FC<{ scene: VisualScene; index: number }> = ({
  scene,
  index,
}) => {
  const { t, fps } = useStageTime(scene);
  const steps = scene.steps ?? [];
  if (steps.length === 0) return null;
  const accent = scene.accentColor || GREEN;

  const n = steps.length;
  const gapY = Math.min(230, 600 / Math.max(1, n - 1));
  const total = (n - 1) * gapY;
  const y0 = (H - total) / 2;
  const X = 170;
  const step = 0.5;
  const title = (scene.stageLabel || "URUTAN").toUpperCase();

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Backdrop accent={accent} tag={`FIG.${String(index + 1).padStart(2, "0")}`} />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <text x={40} y={130} fill={INK} fontFamily={ANTON_FAMILY} fontSize={56} opacity={0.9}>
          {title}
        </text>
        {steps.map((s, i) => {
          const delay = 0.2 + i * step;
          const p = pop(t, fps, delay, 11);
          const y = y0 + i * gapY;
          const segP = clamp01((t - delay) / step);
          return (
            <g key={i}>
              {i < n - 1 ? (
                <>
                  <line x1={X} y1={y} x2={X} y2={y + gapY} stroke={`${accent}44`} strokeWidth={7} />
                  <line x1={X} y1={y} x2={X} y2={y + gapY * segP} stroke={accent} strokeWidth={7} />
                </>
              ) : null}
              <circle cx={X} cy={y} r={38 * p} fill="#050505" stroke={accent} strokeWidth={7} />
              <text
                x={X}
                y={y + 14}
                textAnchor="middle"
                fill={accent}
                fontFamily={ANTON_FAMILY}
                fontSize={40}
                opacity={p}
              >
                {i + 1}
              </text>
              <g opacity={clamp01(p * 1.5)} transform={`translate(${(1 - p) * 60} 0)`}>
                <text x={X + 80} y={y + 24} fill="#fff" fontFamily={ANTON_FAMILY} fontSize={78}>
                  {s.label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
