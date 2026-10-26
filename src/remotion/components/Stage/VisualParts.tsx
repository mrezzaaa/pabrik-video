import React from "react";
import { Easing, interpolate, spring } from "remotion";
import { formatCounter } from "../../../lib/text";
import type { SceneVisual } from "../../../lib/types";
import { ANTON_FAMILY } from "../../fonts";

const INK = "#EAF6FF";
const RED = "#FF3B3B";
const MONO = "ui-monospace, Menlo, Consolas, monospace";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const pop = (t: number, fps: number, delay = 0, damping = 12) =>
  spring({
    frame: Math.max(0, Math.round((t - delay) * fps)),
    fps,
    config: { damping, mass: 0.5, stiffness: 180 },
  });

type BaseProps = {
  t: number;
  fps: number;
  accent: string;
};

/* ---------------------------------------------------------------- stat --- */
export const StatBody: React.FC<
  BaseProps & {
    stat: Extract<SceneVisual, { kind: "stat" }>;
    compact?: boolean;
  }
> = ({ stat, t, accent, compact = false }) => {
  const eased = Easing.out(Easing.cubic)(clamp01(t / 0.85));
  const isPercent = stat.suffix === "%";
  const shown = stat.value * eased;
  const text = formatCounter(
    Number.isInteger(stat.value) ? Math.round(shown) : shown,
  );
  const ring = compact ? 160 : 210;
  const center = compact ? 190 : 250;
  const circumference = 2 * Math.PI * ring;
  const fraction = isPercent ? clamp01(stat.value / 100) * eased : 0;
  const bump = 1 + 0.05 * Math.sin(clamp01((t - 0.85) / 0.35) * Math.PI);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingBottom: 10,
      }}
    >
      <svg
        viewBox="0 0 900 620"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <circle
          cx={450}
          cy={center}
          r={ring}
          fill="none"
          stroke={`${accent}2e`}
          strokeWidth={20}
        />
        {isPercent ? (
          <circle
            cx={450}
            cy={center}
            r={ring}
            fill="none"
            stroke={accent}
            strokeWidth={20}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            transform={`rotate(-90 450 ${center})`}
          />
        ) : (
          <circle
            cx={450}
            cy={center}
            r={ring}
            fill="none"
            stroke={accent}
            strokeWidth={6}
            strokeDasharray="4 26"
            strokeLinecap="round"
            transform={`rotate(${t * 34} 450 ${center})`}
          />
        )}
        <circle
          cx={450}
          cy={center}
          r={ring - 40}
          fill="none"
          stroke={`${accent}55`}
          strokeWidth={2}
          strokeDasharray="12 10"
        />
      </svg>

      <div
        style={{
          position: "relative",
          marginTop: compact ? 20 : 0,
          fontFamily: ANTON_FAMILY,
          color: "#FFFFFF",
          lineHeight: 0.85,
          textAlign: "center",
          transform: `scale(${bump})`,
          textShadow: `0 10px 60px ${accent}aa, 0 4px 0 rgba(0,0,0,0.65)`,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: compact ? 150 : 200 }}>
          {stat.prefix}
          {text}
        </span>
        {stat.suffix ? (
          <span style={{ fontSize: compact ? 60 : 76, color: accent }}>
            {stat.suffix}
          </span>
        ) : null}
      </div>

      <div
        style={{
          position: "relative",
          marginTop: compact ? 20 : 30,
          maxWidth: 760,
          padding: "10px 26px",
          fontFamily: MONO,
          fontSize: compact ? 24 : 28,
          letterSpacing: 2,
          color: INK,
          textTransform: "uppercase",
          textAlign: "center",
          background: "rgba(0,0,0,0.42)",
          border: `2px solid ${accent}66`,
          opacity: clamp01((t - 0.4) / 0.3),
          transform: `translateY(${(1 - clamp01((t - 0.4) / 0.3)) * 18}px)`,
        }}
      >
        {stat.label}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------- compare --- */
const CompareColumn: React.FC<{
  side: { title: string; items: string[] };
  color: string;
  mark: string;
  dir: -1 | 1;
  t: number;
  fps: number;
}> = ({ side, color, mark, dir, t, fps }) => {
  const head = pop(t, fps, 0.12);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        padding: "26px 22px",
        background: "rgba(6,10,22,0.72)",
        border: `2px solid ${color}66`,
        borderRadius: 24,
        boxShadow: `0 18px 50px rgba(0,0,0,0.45)`,
      }}
    >
      <div
        style={{
          alignSelf: "stretch",
          textAlign: "center",
          background: color,
          color: "#050505",
          fontFamily: ANTON_FAMILY,
          fontSize: 50,
          letterSpacing: 1,
          padding: "8px 0",
          textTransform: "uppercase",
          transform: `scale(${head})`,
          borderRadius: 12,
        }}
      >
        {side.title}
      </div>
      {side.items.map((item, index) => {
        const p = pop(t, fps, 0.38 + index * 0.24);
        return (
          <div
            key={item}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              opacity: clamp01(p * 1.5),
              transform: `translateX(${(1 - p) * 46 * dir}px)`,
            }}
          >
            <span
              style={{
                fontFamily: ANTON_FAMILY,
                fontSize: 46,
                color,
                lineHeight: 1,
              }}
            >
              {mark}
            </span>
            <span
              style={{
                fontFamily: ANTON_FAMILY,
                fontSize: 38,
                color: "#FFFFFF",
                textTransform: "uppercase",
                lineHeight: 1.05,
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

export const CompareBody: React.FC<
  BaseProps & { compare: Extract<SceneVisual, { kind: "compare" }> }
> = ({ compare, t, fps, accent }) => {
  const vs = pop(t, fps, 0.3, 8);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "stretch",
        gap: 26,
        padding: "8px 6px",
      }}
    >
      <CompareColumn
        side={compare.left}
        color={RED}
        mark="✕"
        dir={-1}
        t={t}
        fps={fps}
      />
      <CompareColumn
        side={compare.right}
        color={accent}
        mark="✓"
        dir={1}
        t={t}
        fps={fps}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 92,
          height: 92,
          marginLeft: -46,
          marginTop: -46,
          borderRadius: "50%",
          background: "#FFFFFF",
          color: "#050505",
          fontFamily: ANTON_FAMILY,
          fontSize: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${vs}) rotate(${(1 - vs) * 90}deg)`,
          boxShadow: `0 0 42px ${accent}aa`,
        }}
      >
        VS
      </div>
    </div>
  );
};

/* --------------------------------------------------------- crosssection --- */
const LAYER_COLORS = ["#4FC3F7", "#29B6F6", "#1E88E5", "#1565C0", "#FFB300"];

export const CrossBody: React.FC<
  BaseProps & { cross: Extract<SceneVisual, { kind: "crosssection" }> }
> = ({ cross, t, fps, accent }) => {
  const n = cross.layers.length;
  const H = 460;
  const gap = 12;
  const height = (H - gap * (n - 1)) / n;
  const x0 = 40;
  const width = 300;
  const depth = 60;
  const yTop = 96;
  const step = 0.34;
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
      viewBox="0 0 900 620"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      <defs>
        <pattern
          id="hatchX"
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="9"
            stroke="#fff"
            strokeOpacity="0.35"
            strokeWidth="2"
          />
        </pattern>
      </defs>
      <text
        x={20}
        y={54}
        fill={accent}
        fontFamily={MONO}
        fontSize={24}
        letterSpacing={3}
      >
        {`POTONGAN A-A${cross.title ? `  //  ${cross.title.toUpperCase()}` : ""}`}
      </text>
      {cross.layers.map((layer, index) => {
        const delay = 0.16 + index * step;
        const p = pop(t, fps, delay, 11);
        const y = yTop + index * (height + gap) + (1 - p) * -110;
        const color = LAYER_COLORS[index % LAYER_COLORS.length];
        const centerY = y + height / 2;
        const lineP = clamp01((t - delay - 0.12) / 0.25);
        const labelX = x0 + width + depth + 52;

        return (
          <g key={layer.label} opacity={clamp01(p * 1.6)}>
            {index === 0 ? (
              <polygon
                points={`${x0},${y} ${x0 + depth},${y - depth * 0.5} ${x0 + width + depth},${y - depth * 0.5} ${x0 + width},${y}`}
                fill={color}
                stroke={INK}
                strokeWidth={2}
              />
            ) : null}
            <rect
              x={x0}
              y={y}
              width={width}
              height={height}
              fill={color}
              fillOpacity={0.9}
              stroke={INK}
              strokeWidth={2.5}
            />
            <rect
              x={x0}
              y={y}
              width={width}
              height={height}
              fill="url(#hatchX)"
            />
            <polygon
              points={`${x0 + width},${y} ${x0 + width + depth},${y - depth * 0.5} ${x0 + width + depth},${y + height - depth * 0.5} ${x0 + width},${y + height}`}
              fill="#000"
              fillOpacity={0.38}
              stroke={INK}
              strokeWidth={2.5}
            />
            <line
              x1={x0 + width + depth * 0.4}
              y1={centerY - depth * 0.2}
              x2={x0 + width + depth * 0.4 + (labelX - 20 - (x0 + width + depth * 0.4)) * lineP}
              y2={centerY - depth * 0.2 + (centerY - (centerY - depth * 0.2)) * lineP}
              stroke={accent}
              strokeWidth={2.5}
            />
            <circle
              cx={x0 + width + depth * 0.4}
              cy={centerY - depth * 0.2}
              r={6}
              fill={accent}
            />
            <text
              x={labelX}
              y={centerY + (layer.note ? -2 : 14)}
              fill="#fff"
              fontFamily={ANTON_FAMILY}
              fontSize={40}
              opacity={lineP}
              style={{ textTransform: "uppercase" }}
            >
              {layer.label}
            </text>
            {layer.note ? (
              <text
                x={labelX}
                y={centerY + 30}
                fill={accent}
                fontFamily={MONO}
                fontSize={21}
                opacity={lineP}
              >
                {layer.note}
              </text>
            ) : null}
          </g>
        );
      })}
      <g opacity={scanOpacity}>
        <line
          x1={14}
          y1={scanY}
          x2={886}
          y2={scanY}
          stroke="#00E5FF"
          strokeWidth={3}
        />
        <rect
          x={14}
          y={scanY - 36}
          width={872}
          height={36}
          fill="#00E5FF"
          fillOpacity={0.14}
        />
      </g>
    </svg>
  );
};

/* ------------------------------------------------------------- timeline --- */
export const TimelineBody: React.FC<
  BaseProps & { timeline: Extract<SceneVisual, { kind: "timeline" }> }
> = ({ timeline, t, fps, accent }) => {
  const n = timeline.steps.length;
  const y0 = 120;
  const gapY = (620 - 2 * y0) / Math.max(1, n - 1);
  const X = 90;
  const step = 0.46;

  return (
    <svg
      viewBox="0 0 900 620"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    >
      {timeline.steps.map((item, index) => {
        const delay = 0.18 + index * step;
        const p = pop(t, fps, delay, 11);
        const y = y0 + index * gapY;
        const segment = clamp01((t - delay) / step);

        return (
          <g key={item.label}>
            {index < n - 1 ? (
              <>
                <line
                  x1={X}
                  y1={y}
                  x2={X}
                  y2={y + gapY}
                  stroke={`${accent}44`}
                  strokeWidth={6}
                />
                <line
                  x1={X}
                  y1={y}
                  x2={X}
                  y2={y + gapY * segment}
                  stroke={accent}
                  strokeWidth={6}
                />
              </>
            ) : null}
            <circle
              cx={X}
              cy={y}
              r={30 * Math.max(0.3, p)}
              fill="#050505"
              stroke={accent}
              strokeWidth={6}
            />
            <text
              x={X}
              y={y + 11}
              textAnchor="middle"
              fill={accent}
              fontFamily={ANTON_FAMILY}
              fontSize={30}
              opacity={p}
            >
              {index + 1}
            </text>
            <g opacity={clamp01(p * 1.5)} transform={`translate(${(1 - p) * 50} 0)`}>
              <text
                x={X + 66}
                y={y + (item.detail ? 2 : 16)}
                fill="#fff"
                fontFamily={ANTON_FAMILY}
                fontSize={54}
                style={{ textTransform: "uppercase" }}
              >
                {item.label}
              </text>
              {item.detail ? (
                <text
                  x={X + 66}
                  y={y + 40}
                  fill={accent}
                  fontFamily={MONO}
                  fontSize={24}
                >
                  {item.detail}
                </text>
              ) : null}
            </g>
          </g>
        );
      })}
    </svg>
  );
};

/* ---------------------------------------------------------------- stamp --- */
export const StampBody: React.FC<
  BaseProps & {
    stamp: Extract<SceneVisual, { kind: "stamp" }>;
    theme: "danger" | "warn" | "info" | "success";
  }
> = ({ stamp, t, fps, theme }) => {
  const slam = spring({
    frame: Math.round(t * fps),
    fps,
    config: { damping: 9, mass: 0.7, stiffness: 260 },
  });
  const scale = 2.4 - 1.4 * slam;
  const color =
    theme === "danger" || stamp.word === "BAHAYA" || stamp.word === "MITOS"
      ? "#FF2D2D"
      : theme === "success" || stamp.word === "AMAN"
        ? "#39FF14"
        : "#00D4FF";
  const impact = clamp01((t - 0.16) / 0.4);
  const shake = Math.sin(t * 90) * 16 * (1 - impact) * (t > 0.16 ? 1 : 0);
  const captionOpacity = clamp01((t - 0.5) / 0.25);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 34,
        padding: "0 20px",
      }}
    >
      <div
        style={{
          fontFamily: ANTON_FAMILY,
          fontSize: 240,
          letterSpacing: 6,
          lineHeight: 0.95,
          color,
          border: `16px solid ${color}`,
          padding: "8px 40px",
          background: "rgba(0,0,0,0.58)",
          textShadow: `0 0 60px ${color}`,
          boxShadow: `0 0 80px ${color}88, inset 0 0 40px ${color}44`,
          opacity: clamp01(t / 0.08),
          transform: `translate(${shake}px, ${shake * 0.6}px) rotate(-6deg) scale(${scale})`,
        }}
      >
        {stamp.word}
      </div>
      {stamp.caption ? (
        <div
          style={{
            maxWidth: 820,
            fontFamily: ANTON_FAMILY,
            fontSize: 48,
            lineHeight: 1.05,
            color: "#FFFFFF",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: 1,
            opacity: captionOpacity,
            transform: `translateY(${(1 - captionOpacity) * 24}px)`,
            textShadow: "0 4px 24px rgba(0,0,0,0.85)",
          }}
        >
          {stamp.caption}
        </div>
      ) : null}
    </div>
  );
};
