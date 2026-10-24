import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  CalloutSpec,
  DEMO_SPEC,
  PartSpec,
  TechSceneSpec,
  cameraAt,
  partPosition,
  progress,
} from "./spec";
import {
  TechPlanes,
  buildGeometry,
  createEdgeLines,
  createPlanes,
  createWireMaterial,
  createXRayMaterial,
} from "./materials";

const W = 1080;
const H = 1920;
const MONO = "'JetBrains Mono','SF Mono',Menlo,Consolas,monospace";

/* --------------------------------- 3D part -------------------------------- */

const Part: React.FC<{
  part: PartSpec;
  spec: TechSceneSpec;
  planes: TechPlanes;
}> = ({ part, spec, planes }) => {
  const frame = useCurrentFrame();

  const { fill, edges, wire } = useMemo(() => {
    const geo = buildGeometry(part);
    const below = [planes.keepBelow, planes.section];
    const above = [planes.keepAbove, planes.section];
    return {
      fill: new THREE.Mesh(geo, createXRayMaterial(spec.themeColor, below)),
      edges: createEdgeLines(
        geo,
        "#7DD3FC",
        below,
        new THREE.Vector2(W, H)
      ),
      wire: new THREE.Mesh(geo, createWireMaterial(spec.themeColor, above)),
    };
  }, [part, planes, spec.themeColor]);

  const [x, y, z] = partPosition(part, spec, frame);
  const rotZ = (part.spinZ ?? 0) * frame;

  return (
    <group position={[x, y, z]} rotation={[0, 0, rotZ]}>
      <primitive object={fill} />
      <primitive object={edges} />
      <primitive object={wire} />
    </group>
  );
};

const CameraRig: React.FC<{ spec: TechSceneSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const camera = useThree((s) => s.camera);
  const c = cameraAt(spec, frame);
  camera.position.set(...c.position);
  camera.lookAt(...c.target);
  return null;
};

/** Cincin cahaya scanner yang naik dari bawah ke atas. */
const SweepRing: React.FC<{ spec: TechSceneSpec; y: number }> = ({
  spec,
  y,
}) => {
  const frame = useCurrentFrame();
  const p = progress(frame, spec.sweep);
  const visible = frame >= spec.sweep.from && p < 1;
  if (!visible) return null;
  return (
    <group position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[1.5, 1.58, 96]} />
        <meshBasicMaterial
          color="#BAE6FD"
          transparent
          opacity={0.95}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <circleGeometry args={[1.58, 96]} />
        <meshBasicMaterial
          color={spec.themeColor}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

/* -------------------------------- callouts -------------------------------- */

function projectToScreen(
  spec: TechSceneSpec,
  frame: number,
  world: THREE.Vector3
) {
  const c = cameraAt(spec, frame);
  const cam = new THREE.PerspectiveCamera(c.fov, W / H, 0.1, 100);
  cam.position.set(...c.position);
  cam.lookAt(...c.target);
  cam.updateMatrixWorld(true);
  const v = world.clone().project(cam);
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
}

const Callouts: React.FC<{ spec: TechSceneSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  return (
    <svg
      width={W}
      height={H}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      {spec.callouts.map((c: CalloutSpec) => {
        if (frame < c.from || frame > c.to) return null;
        const part = spec.parts.find((p) => p.id === c.partId);
        if (!part) return null;
        const pos = partPosition(part, spec, frame);
        const pt = projectToScreen(spec, frame, new THREE.Vector3(...pos));
        const a = interpolate(
          frame,
          [c.from, c.from + 10, c.to - 10, c.to],
          [0, 1, 1, 0]
        );
        const grow = interpolate(frame, [c.from, c.from + 14], [0, 1], {
          extrapolateRight: "clamp",
        });
        const boxW = Math.max(290, c.text.length * 19 + 44);
        const boxX = c.side === "L" ? 40 : W - 40 - boxW;
        const endX = c.side === "L" ? boxX + boxW : boxX;
        const lx = pt.x + (endX - pt.x) * grow;
        return (
          <g key={`${c.partId}-${c.from}`} opacity={a}>
            <line
              x1={pt.x}
              y1={pt.y}
              x2={lx}
              y2={pt.y}
              stroke="#E0F2FE"
              strokeWidth={2.5}
              strokeDasharray="10 7"
            />
            <circle cx={pt.x} cy={pt.y} r={9} fill="none" stroke="#E0F2FE" strokeWidth={3} />
            <circle cx={pt.x} cy={pt.y} r={3.5} fill="#E0F2FE" />
            <rect
              x={boxX}
              y={pt.y - 30}
              width={boxW}
              height={60}
              fill="rgba(7,19,36,0.85)"
              stroke={spec.themeColor}
              strokeWidth={2}
            />
            <text
              x={boxX + 18}
              y={pt.y + 10}
              fill="#E0F2FE"
              fontFamily={MONO}
              fontSize={28}
              fontWeight={700}
              letterSpacing={2}
            >
              {c.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/* ---------------------------------- HUD ----------------------------------- */

const Hud: React.FC<{ spec: TechSceneSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const phase = spec.phases.find((p) => frame >= p.from && frame < p.to);
  const t = frame / spec.durationInFrames;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 60,
          right: 60,
          fontFamily: MONO,
          color: "#E0F2FE",
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 6, color: spec.themeColor }}>
          {phase?.label ?? ""}
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, marginTop: 10, letterSpacing: 2 }}>
          {spec.title}
        </div>
        <div
          style={{
            marginTop: 26,
            height: 4,
            background: "rgba(56,189,248,0.2)",
          }}
        >
          <div
            style={{
              width: `${t * 100}%`,
              height: "100%",
              background: spec.themeColor,
            }}
          />
        </div>
      </div>
      {/* corner marks ala lembar gambar teknik */}
      {[
        { top: 40, left: 40 },
        { top: 40, right: 40 },
        { bottom: 40, left: 40 },
        { bottom: 40, right: 40 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 50,
            height: 50,
            border: `3px solid ${spec.themeColor}`,
            borderRightColor: i % 2 === 0 ? "transparent" : spec.themeColor,
            borderLeftColor: i % 2 === 1 ? "transparent" : spec.themeColor,
            borderBottomColor: i < 2 ? "transparent" : spec.themeColor,
            borderTopColor: i >= 2 ? "transparent" : spec.themeColor,
            ...pos,
          }}
        />
      ))}
    </>
  );
};

/* ------------------------------- komposisi -------------------------------- */

export type TechSceneProps = { spec: TechSceneSpec };

export const TechScene: React.FC<TechSceneProps> = ({ spec = DEMO_SPEC }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const planes = useMemo(() => createPlanes(), []);

  // Sweep: wireframe -> blueprint solid, bawah ke atas.
  const pSweep = progress(frame, spec.sweep);
  let sweepY = interpolate(pSweep, [0, 1], [-2.9, 4.2]);
  if (frame < spec.sweep.from) sweepY = -99;
  if (pSweep >= 1) sweepY = 99;
  planes.keepBelow.constant = sweepY; // -y + c >= 0  => y <= c
  planes.keepAbove.constant = -sweepY; //  y - c >= 0 => y >= c

  // Potongan melintang: bidang bergerak dari x=3.6 ke x=0.
  let cut = 99;
  if (frame >= spec.section.from) {
    cut = 3.6 * (1 - progress(frame, spec.section));
  }
  if (spec.sectionOut && frame >= spec.sectionOut.from) {
    const pOut = progress(frame, spec.sectionOut);
    cut = pOut >= 1 ? 99 : 3.6 * pOut;
  }
  planes.section.constant = cut;

  const first = cameraAt(spec, 0);

  return (
    <div
      style={{
        width: W,
        height: H,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(ellipse at 50% 45%, #0B2540 0%, #071324 60%, #040b16 100%)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(56,189,248,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56,189,248,0.08) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: first.fov, near: 0.1, far: 100, position: first.position }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
      >
        <CameraRig spec={spec} />
        {spec.parts.map((p) => (
          <Part key={p.id} part={p} spec={spec} planes={planes} />
        ))}
        <SweepRing spec={spec} y={sweepY} />
      </ThreeCanvas>
      <Callouts spec={spec} />
      <Hud spec={spec} />
    </div>
  );
};
