import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type {
  FramePillCallout,
  FrameSfxOverlay,
  PhaseTimelineBlock,
} from "@/schemas/video-blueprint";

interface PopUpCalloutLayerProps {
  pillCallouts: FramePillCallout[];
  sfxOverlays: FrameSfxOverlay[];
  phases: PhaseTimelineBlock[];
  practicalChecklist: {
    title: string;
    items: string[];
  };
}

export const PopUpCalloutLayer: React.FC<PopUpCalloutLayerProps> = ({
  pillCallouts,
  sfxOverlays,
  phases,
  practicalChecklist,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activePills = pillCallouts.filter(
    (c) => frame >= c.startFrame && frame <= c.endFrame,
  );
  const activeSfx = sfxOverlays.filter(
    (s) => frame >= s.startFrame && frame <= s.endFrame,
  );

  const activePhase =
    phases.find((p) => frame >= p.startFrame && frame < p.endFrame) ??
    phases[phases.length - 1];

  const showChecklist = Boolean(activePhase?.showChecklistCard);
  const checklistLocalFrame = Math.max(
    0,
    frame - (activePhase?.startFrame ?? 0),
  );

  const checklistSpring = spring({
    frame: checklistLocalFrame,
    fps,
    config: { damping: 16, stiffness: 130 },
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        pointerEvents: "none",
        fontFamily:
          "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* 1. Action/SFX Floating Text ("PSSST!", "BERJAM-JAM", "TERKUNCI", "MAMPET!") */}
      {activeSfx.map((sfx) => {
        const localFrame = frame - sfx.startFrame;
        const remainingFrames = sfx.endFrame - frame;

        const popSpring = spring({
          frame: localFrame,
          fps,
          config: { damping: 12, stiffness: 180, mass: 0.6 },
        });

        const exitOpacity = interpolate(remainingFrames, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        if (sfx.variant === "FADED_BG") {
          return (
            <div
              key={sfx.id}
              style={{
                position: "absolute",
                left: "50%",
                top: sfx.y,
                transform: `translate(-50%, -50%) rotate(${sfx.rotateDeg}deg) scale(${interpolate(
                  popSpring,
                  [0, 1],
                  [0.85, 1],
                )})`,
                opacity: 0.16 * exitOpacity,
                fontSize: 112,
                fontWeight: 900,
                letterSpacing: "0.04em",
                color: "#0F172A",
                whiteSpace: "nowrap",
              }}
            >
              {sfx.text}
            </div>
          );
        }

        const isRedStamp = sfx.variant === "RED_STAMP";
        const bgColor = isRedStamp ? "#EF4444" : "#FACC15";
        const textColor = isRedStamp ? "#FFFFFF" : "#0F172A";

        return (
          <div
            key={sfx.id}
            style={{
              position: "absolute",
              left: sfx.x,
              top: sfx.y,
              transform: `translate(-50%, -50%) rotate(${sfx.rotateDeg}deg) scale(${popSpring})`,
              opacity: exitOpacity,
              backgroundColor: bgColor,
              color: textColor,
              fontSize: 44,
              fontWeight: 900,
              letterSpacing: "0.03em",
              padding: "8px 24px",
              borderRadius: 16,
              border: "3.5px solid #1E293B",
              boxShadow: "0 6px 0 #1E293B",
              whiteSpace: "nowrap",
            }}
          >
            {sfx.text}
          </div>
        );
      })}

      {/* 2. Compact Dark-Slate Rounded Pill Component Pointers */}
      {activePills.map((pill) => {
        const localFrame = frame - pill.startFrame;
        const remainingFrames = pill.endFrame - frame;

        const enterSpring = spring({
          frame: localFrame,
          fps,
          config: { damping: 16, stiffness: 150, mass: 0.7 },
        });

        const exitOpacity = interpolate(remainingFrames, [0, 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const translateX =
          pill.direction === "RIGHT"
            ? interpolate(enterSpring, [0, 1], [-18, 0])
            : interpolate(enterSpring, [0, 1], [18, 0]);

        return (
          <div
            key={pill.id}
            style={{
              position: "absolute",
              left: pill.anchor.x,
              top: pill.anchor.y,
              transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${interpolate(
                enterSpring,
                [0, 1],
                [0.85, 1],
              )})`,
              opacity: enterSpring * exitOpacity,
              backgroundColor: "rgba(30, 41, 59, 0.94)",
              color: "#FFFFFF",
              fontSize: 23,
              fontWeight: 800,
              letterSpacing: "0.02em",
              padding: "10px 24px",
              borderRadius: 9999,
              border: "2.5px solid #0F172A",
              boxShadow: "0 8px 20px rgba(15, 23, 42, 0.22)",
              whiteSpace: "nowrap",
            }}
          >
            {pill.text}
          </div>
        );
      })}

      {/* 3. Practical Checklist Card ("CEK SEBELUM BELI: [✅ Pemberat, ✅ Katup pengaman, ✅ Pengunci tutup]") */}
      {showChecklist && (
        <div
          style={{
            position: "absolute",
            right: 54,
            bottom: 350,
            width: 440,
            transform: `translateY(${interpolate(
              checklistSpring,
              [0, 1],
              [35, 0],
            )}px) scale(${interpolate(checklistSpring, [0, 1], [0.9, 1])})`,
            opacity: checklistSpring,
            backgroundColor: "rgba(15, 23, 42, 0.94)",
            color: "#FFFFFF",
            borderRadius: 24,
            padding: "26px 30px",
            border: "3px solid #1E293B",
            boxShadow: "0 16px 36px rgba(15, 23, 42, 0.28)",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#FACC15",
              letterSpacing: "0.04em",
              marginBottom: 16,
            }}
          >
            {practicalChecklist.title}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {practicalChecklist.items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#F8FAFC",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: "#16A34A",
                    color: "#FFFFFF",
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
