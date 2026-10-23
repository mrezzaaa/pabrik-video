import React from "react";
import {
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { FrameCalloutTrigger } from "@/schemas/video-blueprint";

interface PopUpCalloutLayerProps {
  callouts: FrameCalloutTrigger[];
}

export const PopUpCalloutLayer: React.FC<PopUpCalloutLayerProps> = ({
  callouts,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeCallouts = callouts.filter(
    (c) => frame >= c.startFrame && frame <= c.endFrame
  );

  if (activeCallouts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 15,
        pointerEvents: "none",
      }}
    >
      {activeCallouts.map((callout) => {
        const localFrame = frame - callout.startFrame;
        const remainingFrames = callout.endFrame - frame;

        const enterSpring = spring({
          frame: localFrame,
          fps,
          config: {
            damping: 15,
            stiffness: 140,
            mass: 0.7,
          },
        });

        const exitOpacity = interpolate(remainingFrames, [0, 15], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const progress = enterSpring * exitOpacity;

        // 45-degree angled SVG leader line from object anchor -> elbowPoint -> card attachment point
        const isRightSide = callout.cardPosition.includes("RIGHT");
        const lineEndX = isRightSide
          ? callout.cardCoord.x
          : callout.cardCoord.x + 310;
        const lineEndY = callout.elbowPoint.y;

        const pathD = `M ${callout.anchor.x} ${callout.anchor.y} L ${callout.elbowPoint.x} ${callout.elbowPoint.y} L ${lineEndX} ${lineEndY}`;
        const pathLength = 420;
        const dashOffset = interpolate(enterSpring, [0, 1], [pathLength, 0]);

        return (
          <React.Fragment key={callout.id}>
            {/* SVG 45-Degree Leader Line & Anchor Target Ring */}
            <svg
              viewBox="0 0 1920 1080"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                opacity: exitOpacity,
              }}
            >
              {/* Pulsing Anchor Ring on Isometric Component */}
              <circle
                cx={callout.anchor.x}
                cy={callout.anchor.y}
                r={14 * enterSpring}
                fill="none"
                stroke={callout.accentColor}
                strokeWidth={2}
              />
              <circle
                cx={callout.anchor.x}
                cy={callout.anchor.y}
                r={5}
                fill={callout.accentColor}
              />

              {/* 45-Degree Angled Leader Line */}
              <path
                d={pathD}
                fill="none"
                stroke={callout.accentColor}
                strokeWidth={2.5}
                strokeDasharray={pathLength}
                strokeDashoffset={dashOffset}
              />

              {/* Joint Node at 45-Degree Elbow */}
              <circle
                cx={callout.elbowPoint.x}
                cy={callout.elbowPoint.y}
                r={3.5}
                fill="#090D16"
                stroke={callout.accentColor}
                strokeWidth={2}
              />
            </svg>

            {/* Sleek Glassmorphism Data Card */}
            <div
              style={{
                position: "absolute",
                left: callout.cardCoord.x,
                top: callout.cardCoord.y,
                width: 315,
                opacity: progress,
                transform: `translateY(${interpolate(enterSpring, [0, 1], [14, 0])}px) scale(${interpolate(
                  enterSpring,
                  [0, 1],
                  [0.92, 1]
                )})`,
                background: "rgba(15, 23, 42, 0.84)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${callout.accentColor}`,
                borderLeft: `4px solid ${callout.accentColor}`,
                borderRadius: 10,
                padding: "12px 16px",
                boxShadow: "0 16px 36px rgba(0, 0, 0, 0.55)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: callout.accentColor,
                    letterSpacing: "0.1em",
                  }}
                >
                  {callout.label}
                </span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 10,
                    color: "#94A3B8",
                  }}
                >
                  SPEC // ID
                </span>
              </div>

              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#F8FAFC",
                  marginBottom: 6,
                }}
              >
                {callout.value}
              </div>

              <div
                style={{
                  display: "inline-block",
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#38BDF8",
                  background: "rgba(56, 189, 248, 0.12)",
                  padding: "3px 8px",
                  borderRadius: 4,
                  marginBottom: 6,
                }}
              >
                {callout.formulaOrFact}
              </div>

              <div
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.35,
                  color: "#CBD5E1",
                }}
              >
                {callout.subtext}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
