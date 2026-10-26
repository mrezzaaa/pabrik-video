import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneVisual as Visual } from "../../lib/types";
import { ANTON_FAMILY } from "../fonts";
import type { SceneProps } from "../types";

/**
 * Zona tengah frame: di bawah headline (underline maks ±y620) dan di atas
 * caption (mulai ±y1380). Di sinilah video lama kosong.
 */
const ZONE = { left: 70, top: 660, width: 940, height: 660 };
const INK = "#E8F4FF";
const RED = "#FF3B3B";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

type P = { t: number; fps: number; accent: string };

/** Spring murni (tanpa hook) supaya bisa dipakai di loop. */
const pop = (t: number, fps: number, delay = 0, damping = 12) =>
  spring({
    frame: Math.max(0, Math.round((t - delay) * fps)),
    fps,
    config: { damping, mass: 0.5, stiffness: 180 },
  });

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const Panel: React.FC<
  P & { fade: number; tag: string; children: React.ReactNode }
> = ({ t, fps, accent, fade, tag, children }) => {
  const enter = pop(t, fps, 0, 14);
  const corner = (pos: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: 34,
    height: 34,
    borderColor: accent,
    borderStyle: "solid",
    borderWidth: 0,
    ...pos,
  });
  return (
    <div
      style={{
        position: "absolute",
        ...ZONE,
        opacity: clamp01(enter * 1.4) * fade,
        transform: `translateY(${(1 - enter) * 40}px) scale(${0.94 + 0.06 * enter})`,
        background: "rgba(3, 16, 38, 0.74)",
        border: `2px solid ${accent}66`,
        backgroundImage: `linear-gradient(${accent}1f 1px, transparent 1px), linear-gradient(90deg, ${accent}1f 1px, transparent 1px)`,
        backgroundSize: "47px 47px",
        boxShadow: `0 0 60px ${accent}33`,
      }}
    >
      <div style={corner({ left: -4, top: -4, borderTopWidth: 6, borderLeftWidth: 6 })} />
      <div style={corner({ right: -4, top: -4, borderTopWidth: 6, borderRightWidth: 6 })} />
      <div style={corner({ left: -4, bottom: -4, borderBottomWidth: 6, borderLeftWidth: 6 })} />
      <div style={corner({ right: -4, bottom: -4, borderBottomWidth: 6, borderRightWidth: 6 })} />
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 14,
          fontFamily: MONO,
          fontSize: 22,
          letterSpacing: 4,
          color: accent,
          opacity: 0.85,
        }}
      >
        {tag}
      </div>
      {children}
    </div>
  );
};

/* ---------- stat ---------- */
const Stat: React.FC<P & { v: Extract<Visual, { kind: "stat" }> }> = ({
  v,
  t,
  fps,
  accent,
}) => {
  const eased = Easing.out(Easing.cubic)(clamp01(t / 0.8));
  const isPct = v.suffix === "%";
  const shown = v.value * eased;
  const text = Number.isInteger(v.value)
    ? Math.round(shown).toLocaleString("id-ID")
    : shown.toFixed(1).replace(".", ",");
  const R = 190;
  const C = 2 * Math.PI * R;
  const fraction = isPct ? clamp01(v.value / 100) * eased : 0;
  const bump = 1 + 0.06 * Math.sin(clamp01((t - 0.8) / 0.4) * Math.PI);
  return (
    <>
      <svg
        viewBox="0 0 940 660"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <circle cx={470} cy={290} r={R} fill="none" stroke={`${accent}33`} strokeWidth={18} />
        {isPct ? (
          <circle
            cx={470}
            cy={290}
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - fraction)}
            transform="rotate(-90 470 290)"
          />
        ) : (
          <circle
            cx={470}
            cy={290}
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth={6}
            strokeDasharray="3 22"
            strokeLinecap="round"
            transform={`rotate(${t * 40} 470 290)`}
          />
        )}
        <circle cx={470} cy={290} r={R - 34} fill="none" stroke={`${accent}55`} strokeWidth={2} strokeDasharray="10 8" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 290 - 110,
          textAlign: "center",
          fontFamily: ANTON_FAMILY,
          color: "#fff",
          transform: `scale(${bump})`,
          textShadow: `0 0 40px ${accent}`,
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 190 }}>
          {v.prefix}
          {text}
        </span>
        <span style={{ fontSize: 72, color: accent, marginLeft: 10 }}>
          {v.suffix}
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          top: 540,
          textAlign: "center",
          fontFamily: ANTON_FAMILY,
          fontSize: 54,
          color: INK,
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: clamp01((t - 0.35) / 0.25),
          transform: `translateY(${(1 - clamp01((t - 0.35) / 0.25)) * 20}px)`,
        }}
      >
        {v.label}
      </div>
    </>
  );
};

/* ---------- compare ---------- */
const Compare: React.FC<P & { v: Extract<Visual, { kind: "compare" }> }> = ({
  v,
  t,
  fps,
  accent,
}) => {
  const Column = ({
    side,
    color,
    mark,
    dir,
  }: {
    side: { title: string; items: string[] };
    color: string;
    mark: string;
    dir: -1 | 1;
  }) => {
    const head = pop(t, fps, 0.15);
    return (
      <div style={{ width: 400, display: "flex", flexDirection: "column", gap: 26 }}>
        <div
          style={{
            alignSelf: "stretch",
            textAlign: "center",
            background: color,
            color: "#000",
            fontFamily: ANTON_FAMILY,
            fontSize: 56,
            letterSpacing: 2,
            padding: "8px 0",
            textTransform: "uppercase",
            transform: `scale(${head})`,
          }}
        >
          {side.title}
        </div>
        {side.items.map((item, i) => {
          const p = pop(t, fps, 0.45 + i * 0.28);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: clamp01(p * 1.5),
                transform: `translateX(${(1 - p) * 70 * dir}px)`,
              }}
            >
              <span
                style={{ fontFamily: ANTON_FAMILY, fontSize: 56, color, lineHeight: 1 }}
              >
                {mark}
              </span>
              <span
                style={{
                  fontFamily: ANTON_FAMILY,
                  fontSize: 42,
                  color: "#fff",
                  textTransform: "uppercase",
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
  const vs = pop(t, fps, 0.3, 8);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "80px 36px 0",
      }}
    >
      <Column side={v.left} color={RED} mark="✕" dir={-1} />
      <Column side={v.right} color={accent} mark="✓" dir={1} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 250,
          width: 96,
          height: 96,
          marginLeft: -48,
          borderRadius: "50%",
          background: "#fff",
          color: "#000",
          fontFamily: ANTON_FAMILY,
          fontSize: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${vs}) rotate(${(1 - vs) * 90}deg)`,
          boxShadow: `0 0 40px ${accent}`,
        }}
      >
        VS
      </div>
    </div>
  );
};

/* ---------- crosssection (cutaway berlapis) ---------- */
const LAYER_COLORS = ["#4FC3F7", "#29B6F6", "#1E88E5", "#1565C0", "#FFB300"];

const Cross: React.FC<P & { v: Extract<Visual, { kind: "crosssection" }> }> = ({
  v,
  t,
  fps,
  accent,
}) => {
  const n = v.layers.length;
  const H = 470;
  const gap = 12;
  const h = (H - gap * (n - 1)) / n;
  const x0 = 60;
  const w = 330;
  const d = 62;
  const yTop = 120;
  const step = 0.36;
  const sweepEnd = 0.2 + n * step;
  const scanY = interpolate(t, [0.1, sweepEnd], [yTop - 20, yTop + H + 10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scanOpacity = interpolate(t, [sweepEnd, sweepEnd + 0.3], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <svg
      viewBox="0 0 940 660"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        <pattern id="hatchX" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="9" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
        </pattern>
      </defs>
      <text x={30} y={88} fill={accent} fontFamily={MONO} fontSize={26} letterSpacing={3}>
        {`POTONGAN A-A${v.title ? "  //  " + v.title.toUpperCase() : ""}`}
      </text>
      {v.layers.map((layer, i) => {
        const delay = 0.2 + i * step;
        const p = pop(t, fps, delay, 11);
        const y = yTop + i * (h + gap) + (1 - p) * -110;
        const col = LAYER_COLORS[i % LAYER_COLORS.length];
        const cy = y + h / 2;
        const lineP = clamp01((t - delay - 0.12) / 0.25);
        const lx = x0 + w + d * 0.5;
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
            <rect x={x0} y={y} width={w} height={h} fill="url(#hatchX)" />
            <polygon
              points={`${x0 + w},${y} ${x0 + w + d},${y - d * 0.5} ${x0 + w + d},${y + h - d * 0.5} ${x0 + w},${y + h}`}
              fill="#000"
              fillOpacity={0.38}
              stroke={INK}
              strokeWidth={2.5}
            />
            <line
              x1={lx}
              y1={cy - d * 0.25}
              x2={lx + (tx - 16 - lx) * lineP}
              y2={cy - d * 0.25 + (cy - (cy - d * 0.25)) * lineP}
              stroke={accent}
              strokeWidth={2.5}
            />
            <circle cx={lx} cy={cy - d * 0.25} r={6} fill={accent} />
            <text
              x={tx}
              y={cy + (layer.note ? -2 : 14)}
              fill="#fff"
              fontFamily={ANTON_FAMILY}
              fontSize={42}
              opacity={lineP}
              style={{ textTransform: "uppercase" }}
            >
              {layer.label}
            </text>
            {layer.note ? (
              <text x={tx} y={cy + 30} fill={accent} fontFamily={MONO} fontSize={22} opacity={lineP}>
                {layer.note}
              </text>
            ) : null}
          </g>
        );
      })}
      <g opacity={scanOpacity}>
        <line x1={20} y1={scanY} x2={920} y2={scanY} stroke="#00E5FF" strokeWidth={3} />
        <rect x={20} y={scanY - 36} width={900} height={36} fill="#00E5FF" fillOpacity={0.14} />
      </g>
    </svg>
  );
};

/* ---------- timeline ---------- */
const Timeline: React.FC<P & { v: Extract<Visual, { kind: "timeline" }> }> = ({
  v,
  t,
  fps,
  accent,
}) => {
  const n = v.steps.length;
  const y0 = 110;
  const gapY = (660 - 2 * y0) / Math.max(1, n - 1);
  const X = 120;
  const step = 0.5;
  return (
    <svg
      viewBox="0 0 940 660"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {v.steps.map((s, i) => {
        const delay = 0.2 + i * step;
        const p = pop(t, fps, delay, 11);
        const y = y0 + i * gapY;
        const segP = clamp01((t - delay) / step);
        return (
          <g key={i}>
            {i < n - 1 ? (
              <>
                <line x1={X} y1={y} x2={X} y2={y + gapY} stroke={`${accent}44`} strokeWidth={6} />
                <line x1={X} y1={y} x2={X} y2={y + gapY * segP} stroke={accent} strokeWidth={6} />
              </>
            ) : null}
            <circle cx={X} cy={y} r={30 * p} fill="#050505" stroke={accent} strokeWidth={6} />
            <text
              x={X}
              y={y + 11}
              textAnchor="middle"
              fill={accent}
              fontFamily={ANTON_FAMILY}
              fontSize={32}
              opacity={p}
            >
              {i + 1}
            </text>
            <g opacity={clamp01(p * 1.5)} transform={`translate(${(1 - p) * 50} 0)`}>
              <text x={X + 70} y={y + (s.detail ? 2 : 16)} fill="#fff" fontFamily={ANTON_FAMILY} fontSize={58} style={{ textTransform: "uppercase" }}>
                {s.label}
              </text>
              {s.detail ? (
                <text x={X + 70} y={y + 42} fill={accent} fontFamily={MONO} fontSize={26}>
                  {s.detail}
                </text>
              ) : null}
            </g>
          </g>
        );
      })}
    </svg>
  );
};

/* ---------- stamp ---------- */
const Stamp: React.FC<
  P & { v: Extract<Visual, { kind: "stamp" }>; fade: number }
> = ({ v, t, fps, fade }) => {
  const slam = spring({
    frame: Math.round(t * fps),
    fps,
    config: { damping: 9, mass: 0.7, stiffness: 260 },
  });
  const scale = 3 - 2 * slam;
  const danger = v.word === "MITOS" || v.word === "BAHAYA";
  const color = danger ? "#FF2D2D" : "#39FF14";
  const impact = clamp01((t - 0.16) / 0.4);
  const shake = Math.sin(t * 90) * 14 * (1 - impact) * (t > 0.16 ? 1 : 0);
  const cap = clamp01((t - 0.55) / 0.25);
  return (
    <div
      style={{
        position: "absolute",
        ...ZONE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        opacity: fade,
      }}
    >
      <div
        style={{
          fontFamily: ANTON_FAMILY,
          fontSize: 250,
          letterSpacing: 10,
          lineHeight: 1,
          color,
          border: `18px solid ${color}`,
          padding: "10px 46px",
          background: "rgba(0,0,0,0.55)",
          textShadow: `0 0 50px ${color}`,
          boxShadow: `0 0 70px ${color}88, inset 0 0 40px ${color}44`,
          opacity: clamp01(t / 0.1),
          transform: `translate(${shake}px, ${shake * 0.6}px) rotate(-7deg) scale(${scale})`,
        }}
      >
        {v.word}
      </div>
      {v.caption ? (
        <div
          style={{
            fontFamily: ANTON_FAMILY,
            fontSize: 56,
            color: "#fff",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 2,
            opacity: cap,
            transform: `translateY(${(1 - cap) * 24}px)`,
            textShadow: "0 4px 20px rgba(0,0,0,0.8)",
          }}
        >
          {v.caption}
        </div>
      ) : null}
    </div>
  );
};

export const SceneVisual: React.FC<SceneProps> = ({ scene, index }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const v = scene.visual;
  if (!v) return null;

  const t = frame / fps + (scene.visualOffset ?? 0);
  const accent = scene.accentColor || "#39FF14";
  const fade =
    scene.visualFinal === false
      ? 1
      : interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const p: P = { t, fps, accent };
  const tag = `FIG.${String(index + 1).padStart(2, "0")}`;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 20 }}>
      {v.kind === "stamp" ? (
        <Stamp {...p} v={v} fade={fade} />
      ) : (
        <Panel {...p} fade={fade} tag={tag}>
          {v.kind === "stat" ? <Stat {...p} v={v} /> : null}
          {v.kind === "compare" ? <Compare {...p} v={v} /> : null}
          {v.kind === "crosssection" ? <Cross {...p} v={v} /> : null}
          {v.kind === "timeline" ? <Timeline {...p} v={v} /> : null}
        </Panel>
      )}
    </AbsoluteFill>
  );
};
