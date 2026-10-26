import React from "react";
import { interpolate } from "remotion";
import { ANTON_FAMILY } from "../../fonts";

const hash = (value: string) =>
  Array.from(value).reduce((sum, char) => sum + char.codePointAt(0)!, 0);

/**
 * Procedural "evidence poster" used by B_ROLL_FRAME when no stock media is
 * available. It is drawn locally (no network) and looks like a framed still,
 * so the center stage is never a flat gradient.
 */
export const PosterArt: React.FC<{
  headline: string;
  keywords: string[];
  emoji: string;
  accent: string;
  progress: number;
  theme: "danger" | "warn" | "info" | "success";
}> = ({ headline, keywords, emoji, accent, progress, theme }) => {
  const seed = hash(`${headline}|${keywords.join("|")}|${emoji}`);
  const angle = (seed % 24) - 12;
  const circleX = 240 + (seed % 380);
  const circleY = 260 + (seed % 220);
  const danger = theme === "danger";
  const secondary = danger ? "#FF3B3B" : accent;
  const label = keywords.slice(0, 2).join("  •  ") || "FAKTA";
  const zoom = interpolate(progress, [0, 1], [1, 1.12]);

  return (
    <svg
      viewBox="0 0 900 760"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        transform: `scale(${zoom})`,
        transformOrigin: "center center",
      }}
    >
      <defs>
        <linearGradient id="posterBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={danger ? "#1a0306" : "#040b16"} />
          <stop offset="55%" stopColor={danger ? "#3a0710" : "#081a2e"} />
          <stop offset="100%" stopColor={accent} stopOpacity={0.55} />
        </linearGradient>
        <pattern
          id="posterHatch"
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="14"
            stroke={accent}
            strokeOpacity="0.18"
            strokeWidth="3"
          />
        </pattern>
        <radialGradient id="posterGlow">
          <stop offset="0%" stopColor={secondary} stopOpacity={0.55} />
          <stop offset="100%" stopColor={secondary} stopOpacity={0} />
        </radialGradient>
      </defs>

      <rect width="900" height="760" fill="url(#posterBg)" />
      <rect width="900" height="760" fill="url(#posterHatch)" />
      <circle cx={circleX} cy={circleY} r={330} fill="url(#posterGlow)" />

      <g transform={`translate(450 400) rotate(${angle})`}>
        <rect
          x={-330}
          y={-240}
          width={660}
          height={480}
          rx={18}
          fill="none"
          stroke={accent}
          strokeOpacity={0.55}
          strokeWidth={3}
        />
        <rect
          x={-310}
          y={-220}
          width={620}
          height={440}
          rx={10}
          fill="rgba(0,0,0,0.28)"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={2}
          strokeDasharray="18 12"
        />
        <circle cx={0} cy={-10} r={170} fill={secondary} fillOpacity={0.12} />
        <circle
          cx={0}
          cy={-10}
          r={170}
          fill="none"
          stroke={secondary}
          strokeOpacity={0.6}
          strokeWidth={4}
          strokeDasharray="8 18"
        />
        <text
          x={0}
          y={62}
          textAnchor="middle"
          fontSize={200}
          style={{ filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.6))" }}
        >
          {emoji || "🔎"}
        </text>
        <text
          x={0}
          y={262}
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily={ANTON_FAMILY}
          fontSize={54}
          letterSpacing={2}
          style={{ textTransform: "uppercase" }}
        >
          {headline || "FAKTA"}
        </text>
      </g>

      <g transform="translate(44 54)">
        <rect
          x={0}
          y={0}
          width={Math.min(560, 34 + label.length * 21)}
          height={54}
          rx={10}
          fill={secondary}
        />
        <text
          x={18}
          y={37}
          fill="#050505"
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={24}
          fontWeight={800}
          letterSpacing={2}
        >
          {label.toUpperCase()}
        </text>
      </g>

      <g transform="translate(44 690)">
        <text
          x={0}
          y={0}
          fill="rgba(255,255,255,0.72)"
          fontFamily="ui-monospace, Menlo, monospace"
          fontSize={22}
          letterSpacing={4}
        >
          {keywords.slice(0, 3).join("  /  ").toUpperCase()}
        </text>
      </g>
    </svg>
  );
};
