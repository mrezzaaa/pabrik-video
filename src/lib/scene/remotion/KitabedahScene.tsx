"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { VideoBlueprint, SceneNode } from "../types";
import { generateSceneGraph } from "../generator";
import { primitives } from "../primitives";
import { useRotateBehavior } from "../behaviors/rotate.behavior";
import { useExplodeBehavior } from "../behaviors/explode.behavior";
import { BLUEPRINT_CYAN } from "../materials";

export interface KitabedahSceneProps {
  blueprint: VideoBlueprint;
  phase?: {
    phaseId?: number | string;
    label?: string;
    fromFrame?: number;
    toFrame?: number;
    activeComponentIds: string[];
  };
  frame: number;
  fps?: number;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}

/**
 * Single Node 3D Primitive component rendered inside ThreeCanvas:
 * Evaluates behavior (rotate, explode, static) and attaches mesh to ThreeJS tree.
 */
const DynamicNode3D: React.FC<{
  node: SceneNode;
  frame: number;
  fps: number;
  themeColor: string;
}> = ({ node, frame, fps, themeColor }) => {
  const meshGroup = useMemo(() => {
    const creator = primitives[node.geometry] || primitives.cylinder;
    return creator({ ...node.params, color: themeColor });
  }, [node.geometry, node.params, themeColor]);

  // Compute behaviors dynamically without scale distortion
  const { posOffset, rotEuler } = useMemo(() => {
    let px = node.position[0];
    let py = node.position[1];
    let pz = node.position[2];
    let rx = 0;
    let ry = 0;
    let rz = 0;

    if (node.behavior === "rotate") {
      const rot = useRotateBehavior({
        frame,
        fps,
        axis: node.axis || "z",
        speed: Number(node.params.speed) || 1.0,
      });
      if (rot.axis === "x") rx = rot.rotationRadians;
      else if (rot.axis === "y") ry = rot.rotationRadians;
      else rz = rot.rotationRadians;
    } else if (node.behavior === "explode") {
      const expl = useExplodeBehavior({
        frame,
        startFrame: Number(node.params.startFrame) || 0,
        fps,
        offset: Number(node.params.offset) || 1.5,
        direction: (node.params.direction as [number, number, number]) || [0, 1, 0],
      });
      px += expl.offsetTranslation[0];
      py += expl.offsetTranslation[1];
      pz += expl.offsetTranslation[2];
    }

    return {
      posOffset: [px, py, pz] as [number, number, number],
      rotEuler: [rx, ry, rz] as [number, number, number],
    };
  }, [node, frame, fps]);

  return (
    <primitive
      object={meshGroup}
      position={posOffset}
      rotation={rotEuler}
    />
  );
};

/**
 * Universal dynamic 3D blueprint scene renderer:
 * - Generates 3D model graph dynamically from blueprint (jet turbofan, tumbler, piston, etc.)
 * - Filters active components based on current phase
 * - Renders proper Three.js primitives with neon blueprint styling (#00D4FF)
 * - Movement is pure rotation & translation without unnatural scaling
 */
export const KitabedahScene: React.FC<KitabedahSceneProps> = ({
  blueprint,
  phase,
  frame,
  fps = 30,
  style,
  width = 1080,
  height = 1920,
}) => {
  const sceneGraph = useMemo(() => generateSceneGraph(blueprint), [blueprint]);

  const activeNodes = useMemo(() => {
    if (!phase || !Array.isArray(phase.activeComponentIds) || phase.activeComponentIds.length === 0) {
      return sceneGraph;
    }
    return sceneGraph.filter((n) => phase.activeComponentIds.includes(n.id));
  }, [sceneGraph, phase]);

  const themeColor = blueprint?.themeColor || BLUEPRINT_CYAN;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at 50% 50%, #0A223A 0%, #061528 55%, #030A14 100%)",
        ...style,
      }}
    >
      {/* Blueprint Grid Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(0, 212, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 212, 255, 0.08) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      <ThreeCanvas
        width={width}
        height={height}
        camera={{ position: [0, 0, 7.5], fov: 36, near: 0.1, far: 100 }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 10, 7]} intensity={1.5} color={themeColor} />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#38BDF8" />

        <group position={[0, 0, 0]}>
          {activeNodes.map((node) => (
            <DynamicNode3D
              key={node.id}
              node={node}
              frame={frame}
              fps={fps}
              themeColor={themeColor}
            />
          ))}
        </group>
      </ThreeCanvas>
    </div>
  );
};
