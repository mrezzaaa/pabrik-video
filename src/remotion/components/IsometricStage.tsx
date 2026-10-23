"use client";

import React, { useEffect, useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { OrthographicCamera, ContactShadows } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { IsoSceneGraph, PhaseTimelineBlock, ThreeNode } from "@/schemas/video-blueprint";
import { ThreeAssetNode } from "../three-assets/ThreeAssetNode";
import { project3DTo2D } from "../projection";

export { project3DTo2D };


function CameraRig({
  position,
  target,
  zoom,
  width,
  height,
}: {
  position: [number, number, number];
  target: [number, number, number];
  zoom: number;
  width: number;
  height: number;
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (camera) {
      camera.position.set(position[0], position[1], position[2]);
      (camera as THREE.OrthographicCamera).zoom = zoom;
      camera.lookAt(target[0], target[1], target[2]);
      camera.updateProjectionMatrix();
    }
  }, [camera, position, target, zoom]);

  return (
    <OrthographicCamera
      makeDefault
      position={position}
      zoom={zoom}
      left={-width / 2}
      right={width / 2}
      top={height / 2}
      bottom={-height / 2}
      near={-100}
      far={200}
      onUpdate={(self) => {
        self.lookAt(target[0], target[1], target[2]);
        self.updateProjectionMatrix();
      }}
    />
  );
}

interface IsometricStageProps {
  visualScene: IsoSceneGraph;
  phases: PhaseTimelineBlock[];
}

export const IsometricStage: React.FC<IsometricStageProps> = ({
  visualScene,
  phases,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Find active phase
  const activePhaseIdx = useMemo(() => {
    const idx = phases.findIndex(
      (p) => frame >= p.startFrame && frame <= p.endFrame
    );
    return idx >= 0 ? idx : frame < (phases[0]?.startFrame ?? 0) ? 0 : 3;
  }, [frame, phases]);

  const activePhase = phases[activePhaseIdx] ?? phases[0];
  const prevPhase = phases[Math.max(0, activePhaseIdx - 1)] ?? activePhase;

  // Camera settings
  const baseCameraPos = visualScene?.cameraPreset?.basePosition ?? [8, 6.5, 8];
  const baseZoom = visualScene?.cameraPreset?.baseZoom ?? 170;

  // Resilient 3D nodes with automatic backward compatibility for legacy jobs in Redis
  const sceneNodes: ThreeNode[] = useMemo(() => {
    if (Array.isArray(visualScene?.nodes) && visualScene.nodes.length > 0) {
      return visualScene.nodes;
    }
    const legacyParts = (visualScene as unknown as { parts?: any[] })?.parts;
    if (Array.isArray(legacyParts) && legacyParts.length > 0) {
      return legacyParts.map((p: any, idx: number) => ({
        nodeId: p.partId || `node_${idx}`,
        componentId: p.componentId || `comp_${idx + 1}`,
        name: p.name || `Component ${idx + 1}`,
        geometryType: (
          p.shape?.type === "cutawayCylinder" || p.shape?.type === "cylinder"
            ? (p.shape?.type === "cutawayCylinder" ? "hollow-cylinder" : "cylinder")
            : p.shape?.type === "cutawayBox" || p.shape?.type === "box"
            ? (p.shape?.type === "cutawayBox" ? "hollow-box" : "box")
            : p.shape?.type === "pipe"
            ? "tube"
            : "cylinder"
        ) as ThreeNode["geometryType"],
        position: [
          p.position?.x ? (p.position.x - 6) * 0.35 : 0,
          p.position?.z ? p.position.z * 0.3 : 0,
          p.position?.y ? (p.position.y - 6) * 0.35 : 0,
        ] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: [1, 1, 1] as [number, number, number],
        color:
          p.color === "accent"
            ? "#FACC15"
            : p.color === "hot"
            ? "#F87171"
            : p.color === "water"
            ? "#38BDF8"
            : "#E2E8F0",
        materialType: (p.material === "glass" ? "glass-translucent" : "toon") as ThreeNode["materialType"],
        opacity: p.material === "glass" ? 0.6 : 1,
        enableCutawayClip: Boolean(p.shape?.type?.includes("cutaway")),
        showEdgesOutline: true,
        geometryArgs: {
          radiusTop: p.shape?.radius ? p.shape.radius * 0.4 : 1.0,
          height: p.shape?.height
            ? p.shape.height * 0.4
            : p.shape?.dz
            ? p.shape.dz * 0.4
            : 1.8,
          width: p.shape?.dx ? p.shape.dx * 0.4 : 2.0,
          depth: p.shape?.dy ? p.shape.dy * 0.4 : 2.0,
          arcAngleDeg: p.shape?.type?.includes("cutaway") ? 270 : 360,
        },
        animation: {
          type:
            p.animation?.type === "pulse"
              ? "pulse-scale"
              : p.animation?.type === "rotate3D"
              ? "rotate"
              : "none",
          axis: "y",
          speed: p.animation?.speed ?? 1,
          amplitude: p.animation?.amplitude ?? 0.2,
          activeInPhases: p.animation?.activeInPhases ?? [0, 1, 2, 3],
        },
      }));
    }
    return [];
  }, [visualScene]);

  // Smooth camera spring transition across phase boundaries
  const transProgress = activePhase
    ? spring({
        frame: frame - activePhase.startFrame,
        fps,
        config: { damping: 20, stiffness: 110 },
      })
    : 1;

  const fromTarget = prevPhase?.camera?.focusTarget3D ?? [0, 0, 0];
  const toTarget = activePhase?.camera?.focusTarget3D ?? [0, 0, 0];

  const currentTarget: [number, number, number] = [
    interpolate(transProgress, [0, 1], [fromTarget[0], toTarget[0]]),
    interpolate(transProgress, [0, 1], [fromTarget[1], toTarget[1]]),
    interpolate(transProgress, [0, 1], [fromTarget[2], toTarget[2]]),
  ];

  const fromZoom = baseZoom * (prevPhase?.camera?.scale ?? 1.0);
  const toZoom = baseZoom * (activePhase?.camera?.scale ?? 1.0);
  const currentZoom = interpolate(transProgress, [0, 1], [fromZoom, toZoom]);

  // Subtle steam wisps if enabled
  const renderSteamWisps = () => {
    if (!visualScene.enableSteamWisps) return null;
    const t = frame / fps;
    const anchor = project3DTo2D([0, 1.8, 0], baseCameraPos, currentTarget, currentZoom, width, height);

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox={`0 0 ${width} ${height}`}
      >
        <g opacity={0.65}>
          {[-45, 0, 45].map((xOffset, i) => {
            const sway = Math.sin(t * 3.0 + i * 1.5) * 14;
            const yFlow = (t * 60 + i * 35) % 180;
            const startX = anchor.x + xOffset;
            const startY = anchor.y - yFlow;
            return (
              <path
                key={i}
                d={`M ${startX} ${startY} Q ${startX + sway} ${startY - 40}, ${startX - sway * 0.5} ${startY - 90} T ${startX + sway} ${startY - 150}`}
                fill="none"
                stroke="#CBD5E1"
                strokeWidth={3}
                strokeDasharray="8 6"
                strokeLinecap="round"
                opacity={Math.max(0, 1 - yFlow / 180)}
              />
            );
          })}
        </g>
      </svg>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 60%, #F1F5F9 100%)",
        overflow: "hidden",
      }}
    >
      <ThreeCanvas
        orthographic
        width={width}
        height={height}
        gl={{
          antialias: true,
          alpha: true,
          localClippingEnabled: true,
        }}
      >
        <CameraRig
          position={baseCameraPos}
          target={currentTarget}
          zoom={currentZoom}
          width={width}
          height={height}
        />

        {/* Warm 3-point Studio Lighting */}
        <ambientLight color="#FFFBEB" intensity={1.4} />
        <directionalLight
          position={[10, 18, 12]}
          intensity={1.6}
          color="#FFFFFF"
        />
        <directionalLight
          position={[-8, 6, -10]}
          intensity={0.5}
          color="#E0F2FE"
        />
        <directionalLight
          position={[0, -5, 8]}
          intensity={0.25}
          color="#FEF3C7"
        />

        {/* Soft Floor Shadow */}
        <ContactShadows
          position={[0, -2.2, 0]}
          opacity={0.35}
          scale={10}
          blur={2.5}
          far={4}
          resolution={256}
          color="#0F172A"
        />

        {/* Render 3D Scene Nodes */}
        <group>
          {sceneNodes.map((node) => (
            <ThreeAssetNode
              key={node.nodeId}
              node={node}
              currentPhaseIndex={activePhaseIdx}
            />
          ))}
        </group>
      </ThreeCanvas>

      {renderSteamWisps()}
    </AbsoluteFill>
  );
};
