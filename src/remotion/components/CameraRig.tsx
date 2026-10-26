import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { VisualScene } from "../../lib/types";

/**
 * Camera physics for one scene: a zoom punch on entry and a damped sine shake
 * for danger/warning scenes. Applied to background + center stage only, so
 * captions and the top bar stay stable.
 */
export const CameraRig: React.FC<{
  scene: VisualScene;
  children: React.ReactNode;
}> = ({ scene, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const enter = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 220 },
  });
  const punch = interpolate(enter, [0, 1], [1.055, 1]);
  const zoom = scene.motion.type === "zoomIn" ? 1 + 0.012 * Math.min(1, t) : 1;

  const danger = scene.theme === "danger";
  const amp = danger ? 8 + scene.motion.intensity * 22 : 0;
  const decay = Math.exp(-t * 4.5);
  const shakeX = Math.sin(t * 46) * amp * decay;
  const shakeY = Math.cos(t * 37) * amp * 0.65 * decay;
  const rotate = Math.sin(t * 29) * amp * 0.02 * decay;

  return (
    <AbsoluteFill
      style={{
        transform: `translate3d(${shakeX}px, ${shakeY}px, 0) scale(${punch * zoom}) rotate(${rotate}deg)`,
        transformOrigin: "center center",
        overflow: "hidden",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
