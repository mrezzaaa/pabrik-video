import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { CadShot } from "../cad/contract";
import { CadStage } from "./components/Stage/CadStage";

export const CAD_FIXTURE_FRAMES = 240;

const ease = { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * Komposisi uji commit 1: render satu scene CAD tanpa pipeline.
 *   npx remotion render src/remotion/index.ts CadFixture out/cad-fixture.mp4 --gl=angle
 * 0-2 dt: utuh dengan semua label; 2-4,5 dt: urai lalu rakit; 5,5-8 dt: zoom ke ruang bakar.
 */
export const CadFixture: React.FC = () => {
  const frame = useCurrentFrame();
  const explode = interpolate(frame, [60, 105, 135, 165], [0, 1, 1, 0], ease);
  const focusMix = interpolate(frame, [165, 195], [0, 1], ease);
  const zoom = interpolate(frame, [165, 195], [1, 2.3], ease);
  const focused = frame >= 165;
  const shot: Partial<CadShot> = {
    explode,
    focus: "combustor",
    focusMix,
    zoom,
    labels: focused ? ["combustor"] : "all",
  };
  return <CadStage sceneId="jet-engine" shot={shot} />;
};
