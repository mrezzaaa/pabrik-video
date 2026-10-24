import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Callout } from "../lib/types";

interface XRayWireframeScannerProps {
  durationInFrames: number;
  callouts?: Callout[];
  themeColor?: string;
  mode?: "XRAY_WIREFRAME_SCAN" | "BLUEPRINT_CAD_CALLOUT";
  children: React.ReactNode;
}

export const XRayWireframeScanner: React.FC<XRayWireframeScannerProps> = ({
  durationInFrames,
  callouts = [],
  themeColor = "#38BDF8",
  mode = "XRAY_WIREFRAME_SCAN",
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 1. 3D Perspective Rig: Continuous Orbital Tilt & Scale-in
  const rotateY = interpolate(frame, [0, durationInFrames], [-8, 8], {
    extrapolateRight: "clamp",
  });
  const rotateX = interpolate(frame, [0, durationInFrames], [4, -4], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.12], {
    extrapolateRight: "clamp",
  });

  // 2. Laser Scanner Sweep Progress
  // In BLUEPRINT_CAD_CALLOUT mode, start at 75% or full wireframe right away
  const scanProgress =
    mode === "BLUEPRINT_CAD_CALLOUT"
      ? 100
      : interpolate(
          frame,
          [10, Math.max(20, Math.floor(durationInFrames * 0.55))],
          [0, 100],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }
        );

  const laserOpacity =
    mode === "BLUEPRINT_CAD_CALLOUT"
      ? 0
      : interpolate(
          frame,
          [
            10,
            15,
            Math.floor(durationInFrames * 0.53),
            Math.floor(durationInFrames * 0.57),
          ],
          [0, 1, 1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        perspective: 1200,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Inline SVG Sobel Edge-Detection Filter for Procedural CAD Wireframe */}
      <svg style={{ position: "absolute", width: 0, height: 0, pointerEvents: "none" }}>
        <defs>
          <filter id="blueprint-wireframe" x="-10%" y="-10%" width="120%" height="120%">
            {/* 1. Convert to pure grayscale */}
            <feColorMatrix type="saturate" values="0" />
            {/* 2. Laplacian edge extraction filter */}
            <feConvolveMatrix
              order="3 3"
              kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1"
              divisor="1"
              bias="0"
              preserveAlpha="true"
            />
            {/* 3. Map extracted edges to glowing cyan (#38BDF8) */}
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.22  0 0 0 0 0.74  0 0 0 0 0.97  1 1 1 0 0"
            />
          </filter>
        </defs>
      </svg>

      {/* 3D Tilted Card Container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transform: `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* LAYER A: Base Realistic Visual */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {children}
        </div>

        {/* LAYER B: Procedural CAD Wireframe Overlay with Blueprint Backing */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(7, 19, 36, 0.88)",
            clipPath: `inset(0 0 ${100 - scanProgress}% 0)`,
            pointerEvents: "none",
          }}
        >
          {/* Fine 16px Cyan Grid Blueprint Canvas */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `
                linear-gradient(to right, rgba(56, 189, 248, 0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(56, 189, 248, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: "16px 16px",
            }}
          />

          {/* Filtered Glowing Wireframe Image */}
          <div
            style={{
              width: "100%",
              height: "100%",
              filter: "url(#blueprint-wireframe) drop-shadow(0 0 8px rgba(56, 189, 248, 0.8))",
              mixBlendMode: "screen",
              opacity: mode === "BLUEPRINT_CAD_CALLOUT" ? 0.85 : 0.95,
            }}
          >
            {children}
          </div>
        </div>

        {/* Laser Scanner Sweep Beam */}
        {laserOpacity > 0 && (
          <div
            style={{
              position: "absolute",
              top: `${scanProgress}%`,
              left: 0,
              right: 0,
              height: 4,
              backgroundColor: themeColor,
              boxShadow: `0 0 24px 6px rgba(56, 189, 248, 0.95), 0 0 10px 2px #FFFFFF`,
              zIndex: 35,
              opacity: laserOpacity,
              pointerEvents: "none",
              transform: "translateY(-50%)",
            }}
          >
            {/* Scanning beam readout label */}
            <div
              style={{
                position: "absolute",
                right: 24,
                top: -20,
                fontSize: 10,
                fontWeight: 900,
                fontFamily: "'JetBrains Mono', monospace",
                color: themeColor,
                backgroundColor: "rgba(7, 19, 36, 0.9)",
                padding: "2px 6px",
                border: `1px solid ${themeColor}`,
                borderRadius: 2,
                letterSpacing: "0.1em",
              }}
            >
              SCAN // {Math.round(scanProgress)}%
            </div>
          </div>
        )}

        {/* 4. Animated Engineering Callouts */}
        {callouts && callouts.length > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 40,
              pointerEvents: "none",
            }}
          >
            {callouts.map((callout, index) => {
              // Trigger callout when scanner crosses callout.y or staggered in CAD mode
              const triggerFrame =
                mode === "BLUEPRINT_CAD_CALLOUT"
                  ? 12 + index * 16
                  : Math.max(
                      15,
                      Math.floor((callout.y / 100) * (durationInFrames * 0.55)) + 4
                    );

              const hasTriggered = frame >= triggerFrame;
              if (!hasTriggered) return null;

              const calloutSpring = spring({
                frame: frame - triggerFrame,
                fps,
                config: { damping: 14, stiffness: 180, mass: 0.6 },
              });

              // Decide callout side: left or right of target point
              const isRightSide = callout.x < 50;
              const targetX = (callout.x / 100) * 1080;
              const targetY = (callout.y / 100) * 1920;

              const kneeX = isRightSide ? targetX + 45 : targetX - 45;
              const kneeY = targetY - 45;
              const endX = isRightSide ? kneeX + 110 : kneeX - 110;
              const endY = kneeY;

              const boxLeft = isRightSide ? endX + 8 : endX - 220;
              const boxTop = endY - 24;

              return (
                <React.Fragment key={`callout-${index}`}>
                  {/* Target Reticle (Pulsing Cyan Ring + Center Dot) */}
                  <div
                    style={{
                      position: "absolute",
                      left: targetX,
                      top: targetY,
                      transform: "translate(-50%, -50%)",
                      width: 24,
                      height: 24,
                      opacity: calloutSpring,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: `2px solid ${themeColor}`,
                        boxShadow: `0 0 12px ${themeColor}`,
                        transform: `scale(${1 + Math.sin(frame * 0.25) * 0.2})`,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: "#FFFFFF",
                        boxShadow: `0 0 6px ${themeColor}`,
                      }}
                    />
                  </div>

                  {/* SVG Angled Leader Line */}
                  <svg
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      overflow: "visible",
                    }}
                  >
                    <polyline
                      points={`${targetX},${targetY} ${kneeX},${kneeY} ${endX},${endY}`}
                      fill="none"
                      stroke={themeColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="260"
                      strokeDashoffset={(1 - calloutSpring) * 260}
                      style={{ filter: `drop-shadow(0 0 6px ${themeColor})` }}
                    />
                  </svg>

                  {/* Engineering Specification Tag Box */}
                  <div
                    style={{
                      position: "absolute",
                      left: boxLeft,
                      top: boxTop,
                      minWidth: 210,
                      maxWidth: 260,
                      backgroundColor: "rgba(7, 19, 36, 0.95)",
                      border: `1.5px solid ${themeColor}`,
                      borderRadius: 4,
                      padding: "8px 14px",
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.85)",
                      transform: `scale(${calloutSpring})`,
                      transformOrigin: isRightSide ? "left center" : "right center",
                      opacity: calloutSpring,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: themeColor,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        fontFamily: "'JetBrains Mono', monospace",
                        lineHeight: 1.2,
                        marginBottom: 4,
                      }}
                    >
                      {callout.label}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#F0F9FF",
                        fontFamily: "Inter, sans-serif",
                        lineHeight: 1.3,
                      }}
                    >
                      {callout.detail}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
