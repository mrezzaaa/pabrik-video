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

  const rawActivePills = pillCallouts.filter(
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

  // Limit to maximum 2 pills at any frame and apply vertical collision avoidance (minDeltaY = 76px)
  const activePills = rawActivePills.slice(0, 2).map((p) => ({
    ...p,
    anchor: { ...p.anchor },
  }));

  if (activePills.length === 2) {
    const p1 = activePills[0];
    const p2 = activePills[1];
    const dy = p2.anchor.y - p1.anchor.y;
    if (Math.abs(dy) < 76) {
      const shift = (76 - Math.abs(dy)) / 2;
      if (dy >= 0) {
        p1.anchor.y = Math.max(300, p1.anchor.y - shift);
        p2.anchor.y = Math.min(1450, p2.anchor.y + shift);
      } else {
        p1.anchor.y = Math.min(1450, p1.anchor.y + shift);
        p2.anchor.y = Math.max(300, p2.anchor.y - shift);
      }
    }
  }

  // Strict checklist limit: max 3 items, max 3-4 words per item
  const sanitizedChecklistItems = (practicalChecklist?.items ?? [])
    .slice(0, 3)
    .map((item) => {
      const words = item.trim().split(/\s+/);
      return words.length > 4 ? words.slice(0, 4).join(" ") : item;
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

        if (sfx.variant === "RED_STAMP") {
          return (
            <div
              key={sfx.id}
              style={{
                position: "absolute",
                left: sfx.x,
                top: sfx.y,
                transform: `translate(-50%, -50%) rotate(${sfx.rotateDeg}deg) scale(${interpolate(
                  popSpring,
                  [0, 1],
                  [0.7, 1],
                )})`,
                opacity: popSpring * exitOpacity,
                backgroundColor: "#EF4444",
                color: "#FFFFFF",
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: "0.06em",
                padding: "8px 24px",
                borderRadius: 12,
                border: "3.5px solid #1E293B",
                boxShadow: "0 6px 0 #1E293B",
                whiteSpace: "nowrap",
              }}
            >
              {sfx.text}
            </div>
          );
        }

        return (
          <div
            key={sfx.id}
            style={{
              position: "absolute",
              left: sfx.x,
              top: sfx.y,
              transform: `translate(-50%, -50%) rotate(${sfx.rotateDeg}deg) scale(${interpolate(
                popSpring,
                [0, 1],
                [0.75, 1],
              )})`,
              opacity: popSpring * exitOpacity,
              backgroundColor: "#FACC15",
              color: "#0F172A",
              fontSize: 34,
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
              left: Math.max(120, Math.min(960, pill.anchor.x)),
              top: pill.anchor.y,
              transform: `translate(-50%, -50%) translateX(${translateX}px) scale(${interpolate(
                enterSpring,
                [0, 1],
                [0.85, 1],
              )})`,
              opacity: enterSpring * exitOpacity,
              backgroundColor: "rgba(30, 41, 59, 0.95)",
              color: "#FFFFFF",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.02em",
              padding: "8px 20px",
              borderRadius: 9999,
              border: "2px solid #0F172A",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
              whiteSpace: "nowrap",
            }}
          >
            {pill.text}
          </div>
        );
      })}

      {/* 3. Practical Checklist Card (Actionable Summary Box) */}
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
            {practicalChecklist?.title || "CEK SEBELUM BELI / PAKAI:"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sanitizedChecklistItems.map((item, idx) => (
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
