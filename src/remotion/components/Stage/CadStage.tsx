import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import React, { useLayoutEffect, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import * as THREE from "three";
import { applyCamera, CAD_FOV } from "../../../cad/camera";
import { type CadShot, DEFAULT_SHOT } from "../../../cad/contract";
import { layoutLabels } from "../../../cad/labels";
import { getCadScene } from "../../../cad/registry";

export interface CadStageProps {
  sceneId: string;
  shot?: Partial<CadShot>;
}

/** Menyalin pose kamera hasil perhitungan deterministik ke kamera R3F sebelum frame di-advance. */
const CameraSync: React.FC<{ pose: THREE.PerspectiveCamera }> = ({ pose }) => {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);
  useLayoutEffect(() => {
    camera.position.copy(pose.position);
    camera.quaternion.copy(pose.quaternion);
    camera.updateMatrixWorld(true);
  });
  return null;
};

export const CadStage: React.FC<CadStageProps> = ({ sceneId, shot }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const scene = useMemo(() => getCadScene(sceneId), [sceneId]);
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, -1), 0), []);
  const runtime = useMemo(() => scene.build({ clip, seed: 1 }), [scene, clip]);
  const pose = useMemo(() => new THREE.PerspectiveCamera(), []);

  const s: CadShot = { ...DEFAULT_SHOT, ...shot };
  const t = frame / fps;

  // Semua state 3D adalah fungsi murni dari (frame, shot): aman untuk render paralel.
  clip.constant = scene.meta.crossRadius * 1.2 * (1 - s.cutaway);
  runtime.update({ t, explode: s.explode });
  applyCamera(pose, scene.meta, runtime, s, t, width / height);

  const ids =
    s.labels === "all"
      ? scene.meta.parts.map((p) => p.id)
      : s.labels === "none"
        ? []
        : s.labels;
  const fontSize = Math.round(width * 0.026);
  const anchors = ids.flatMap((id) => {
    const part = scene.meta.parts.find((p) => p.id === id);
    if (!part) return [];
    const v = runtime.anchor(id).project(pose);
    if (v.z > 1) return [];
    const dy = part.labelDy ?? -0.04;
    return [
      {
        part,
        input: {
          id,
          text: part.label,
          x: ((v.x + 1) / 2) * width,
          y: ((1 - v.y) / 2) * height,
          side: (dy < 0 ? -1 : 1) as 1 | -1,
          distance: Math.max(0.035, Math.abs(dy)) * height,
        },
      },
    ];
  });
  const placed = layoutLabels(
    anchors.map((a) => a.input),
    width,
    height,
    fontSize,
  );
  const labels = placed.map((p) => ({
    part: anchors.find((a) => a.part.id === p.id)!.part,
    x: p.x,
    y: p.y,
    lx: p.lx,
    ly: p.ly,
  }));

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #0b1a38 0%, #050a1a 70%)" }}>
      <ThreeCanvas
        width={width}
        height={height}
        flat
        camera={{ fov: CAD_FOV, near: 0.1, far: 400, position: [0, 0, 20] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <ambientLight color="#6a8cff" intensity={2.2} />
        <directionalLight color="#bfe6ff" intensity={3.4} position={[3, 6, 8]} />
        <directionalLight color="#ff9a3c" intensity={1.6} position={[-4, -2, -5]} />
        <primitive object={runtime.root} />
        <CameraSync pose={pose} />
      </ThreeCanvas>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: s.labelOpacity }}>
        {labels.map(({ part, x, y, lx, ly }) => {
          const color = part.hot ? "#ff9a3c" : "#4fd8ff";
          return (
            <g key={part.id}>
              <line x1={x} y1={y} x2={lx} y2={ly} stroke={color} strokeOpacity={0.7} strokeWidth={2} />
              <circle cx={x} cy={y} r={6} fill={color} />
            </g>
          );
        })}
      </svg>
      {labels.map(({ part, lx, ly }) => (
        <div
          key={part.id}
          style={{
            position: "absolute",
            left: lx,
            top: ly,
            transform: "translate(-50%, -50%)",
            opacity: s.labelOpacity,
            whiteSpace: "nowrap",
            padding: `${fontSize * 0.2}px ${fontSize * 0.5}px`,
            border: `2px solid ${part.hot ? "rgba(255,154,60,.75)" : "rgba(79,216,255,.55)"}`,
            background: "rgba(5,14,34,.82)",
            color: part.hot ? "#ffd2a0" : "#cfe9ff",
            font: `600 ${fontSize}px ui-monospace, Menlo, Consolas, monospace`,
            letterSpacing: "0.06em",
          }}
        >
          {part.label}
        </div>
      ))}
    </AbsoluteFill>
  );
};
