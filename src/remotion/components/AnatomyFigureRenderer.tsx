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
}) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = propFrame ?? currentFrame;

  // Explode animation kicks in after frame 70 or in later phases
  const activePhase = propActivePhase ?? Math.min(3, Math.floor(frame / 150));
  const isExploded = propIsExploded ?? (frame > 75 || activePhase >= 2);

  const explodeSpring = spring({
    frame: Math.max(0, frame - 75),
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 90 },
  });

  const explodeProgress = isExploded ? explodeSpring : 0;

  // Render SVG content directly if available
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
            transform: `scale(${interpolate(frame, [0, 45], [0.94, 1.0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })})`,
          }}
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      </AbsoluteFill>
    );
  }

  // Render from nodes (svg-part) with 4-tone shading and painter's order
  const svgNodes = nodes.filter((n) => n.geometryType === "svg-part" && n.svgPath);

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
              const [px, py, pz] = node.position;
              const ox = (idx % 2 === 0 ? 1 : -1) * (idx * 15 + 20) * explodeProgress;
              const oy = -pz * 12 * explodeProgress;

              return (
                <g
                  key={node.nodeId}
                  id={node.nodeId}
                  transform={`translate(${ox}, ${oy})`}
                  style={{
                    transition: "transform 0.4s ease-out",
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
            <g style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, opacity: 0.85 }}>
              <text x={60} y={1040} fill="#64748B">
                KITABEDAH EDITORIAL · 4-TONE ISO
              </text>
              {readoutText && (
                <text x={1020} y={1040} fill="#0F172A" textAnchor="end" fontWeight="600">
                  {readoutText}
                </text>
              )}
            </g>
          )}
        </svg>
      </div>
    </AbsoluteFill>
  );
};
