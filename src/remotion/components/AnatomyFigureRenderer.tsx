"use client";

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import type { ThreeNode } from "@/schemas/video-blueprint";

export interface AnatomyFigureRendererProps {
  svgComponentPath?: string;
  svgContent?: string;
  nodes?: ThreeNode[];
  frame?: number;
  isExploded?: boolean;
  activePhase?: number;
  showReadout?: boolean;
  readoutText?: string;
  title?: string;
  scale?: number;
  x?: number;
  y?: number;
  explodeFactor?: number;
  cutaway?: boolean;
}

export const AnatomyFigureRenderer: React.FC<AnatomyFigureRendererProps> = ({
  svgComponentPath,
  svgContent,
  nodes = [],
  frame: propFrame,
  isExploded: propIsExploded,
  activePhase: propActivePhase,
  showReadout = true,
  readoutText,
  title,
  scale = 1.0,
  x = 0,
  y = 0,
  explodeFactor: propExplodeFactor,
  cutaway = false,
}) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = propFrame ?? currentFrame;

  // Use explicit explodeFactor from camera if passed, else fallback to spring
  const activePhase = propActivePhase ?? Math.min(3, Math.floor(frame / 150));
  const isExploded = propIsExploded ?? (frame > 75 || activePhase >= 2);

  const explodeSpring = spring({
    frame: Math.max(0, frame - 75),
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const explodeProgress =
    propExplodeFactor !== undefined
      ? propExplodeFactor
      : isExploded
      ? explodeSpring
      : 0;

  // Filter SVG parts from nodes
  const svgNodes = nodes.filter((n) => n.geometryType === "svg-part" && n.svgPath);

  // If svgNodes are present, render dynamic parts with visibility, explode, and cutaway
  if (svgNodes.length > 0) {
    return (
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          className="iso"
          data-theme="light"
          style={{
            width: 1080,
            height: 1080,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            transform: `scale(${scale}) translate(${x}px, ${y}px)`,
            transformOrigin: "center center",
          }}
        >
          <svg
            viewBox="0 0 1080 1080"
            width="100%"
            height="100%"
            style={{ overflow: "visible" }}
          >
            {/* Ambient Contact Shadow */}
            <ellipse
              cx={540}
              cy={730}
              rx={280}
              ry={85}
              fill="#0F172A"
              opacity={0.08}
              style={{ filter: "blur(20px)" }}
            />

            {/* Isometric Assembly Group */}
            <g transform="translate(0, -30)">
              {svgNodes.map((node, idx) => {
                const [px, py, pz] = node.position || [0, 0, 0];
                const ox = (idx % 2 === 0 ? 1 : -1) * (idx * 16 + 22) * explodeProgress;
                const oy = -pz * 12 * explodeProgress;
                const isOuter =
                  idx === 0 ||
                  node.name.toLowerCase().includes("outer") ||
                  node.name.toLowerCase().includes("kulit") ||
                  node.name.toLowerCase().includes("badan") ||
                  node.name.toLowerCase().includes("dinding luar");
                const partOpacity = cutaway && isOuter ? 0.45 : node.opacity ?? 1;

                return (
                  <g
                    key={node.nodeId || `part_${idx}`}
                    id={node.nodeId}
                    transform={`translate(${ox}, ${oy})`}
                    style={{
                      opacity: partOpacity,
                      transition: "all 0.3s ease-out",
                    }}
                  >
                    {/* Base Fill */}
                    <path fill={node.color || "#E2E8F0"} d={node.svgPath!} stroke="none" />

                    {/* Silhouette Outline */}
                    <path
                      d={node.svgPath!}
                      fill="none"
                      stroke="#1E293B"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>

            {/* Card Header & Footer Overlay */}
            {showReadout && (
              <g
                style={{
                  fontFamily: "ui-monospace, Menlo, monospace",
                  fontSize: 13,
                  opacity: 0.85,
                }}
              >
                <text x={60} y={1040} fill="#64748B">
                  {title
                    ? title.toUpperCase().slice(0, 35)
                    : "KITABEDAH EDITORIAL · 4-TONE ISO"}
                </text>
                {readoutText && (
                  <text
                    x={1020}
                    y={1040}
                    fill="#0F172A"
                    textAnchor="end"
                    fontWeight="600"
                  >
                    {readoutText}
                  </text>
                )}
              </g>
            )}
          </svg>
        </div>
      </AbsoluteFill>
    );
  }

  // Fallback: Render static SVG content if no svgNodes available
  if (svgContent) {
    return (
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: 1080,
            height: 1080,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            transform: `scale(${scale}) translate(${x}px, ${y}px)`,
            transformOrigin: "center center",
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </AbsoluteFill>
    );
  }

  return null;
};
