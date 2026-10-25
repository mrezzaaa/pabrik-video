"use client";

import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { VideoBlueprint, VideoBlueprintPhase } from "../types";
import { generateScene } from "../generator/sceneGenerator";
import { CameraRig, ShotType } from "./CameraRig";
import { calculateRotation } from "../behaviors/rotate";
import { calculateExplode } from "../behaviors/explode";
import { VIDEO_FPS, VIDEO_WIDTH, VIDEO_HEIGHT } from "../../../remotion/constants";

export interface KitabedahSceneProps {
  blueprint: VideoBlueprint;
  phase?: VideoBlueprintPhase;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

/**
 * Animated scene component evaluating rotations and explosions frame-by-frame
 */
const AnimatedSceneTree: React.FC<{
  blueprint: VideoBlueprint;
  phase?: VideoBlueprintPhase;
}> = ({ blueprint, phase }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Generate static ThreeJS group once per blueprint
  const sceneGroup = useMemo(() => {
    return generateScene(blueprint);
  }, [blueprint]);

  // Update animated nodes on every frame
  useMemo(() => {
    const activeIds = phase?.activeComponentIds;
    const isExplodedPhase = phase?.objectState?.exploded ?? false;

    sceneGroup.children.forEach((child) => {
      const userData = (child as any).userData;
      if (!userData) return;

      const { id, behavior, axis, initialPosition, initialRotation } = userData;

      // Visibility filter
      if (activeIds && activeIds.length > 0 && id) {
        child.visible = activeIds.includes(id);
      } else {
        child.visible = true;
      }

      const initPos = Array.isArray(initialPosition) && initialPosition.length === 3
        ? initialPosition
        : [child.position.x, child.position.y, child.position.z];
      const initRot = Array.isArray(initialRotation) && initialRotation.length === 3
        ? initialRotation
        : [child.rotation.x, child.rotation.y, child.rotation.z];

      // 1. Rotation Behavior (pure Z-axis or specified axis, no scaling)
      if (behavior === "rotate") {
        const rot = calculateRotation({
          frame,
          fps,
          axis: axis || "z",
          speed: 1.2,
        });

        if (rot.axis === "x") child.rotation.x = initRot[0] + rot.rotationRadians;
        else if (rot.axis === "y") child.rotation.y = initRot[1] + rot.rotationRadians;
        else child.rotation.z = initRot[2] + rot.rotationRadians;
      }

      // 2. Explode Behavior (translateY/X/Z with spring, no scale deformation)
      if (behavior === "explode" || isExplodedPhase) {
        const expl = calculateExplode({
          frame,
          fps,
          offset: 1.6,
          direction: [0, 1, 0],
        });

        child.position.x = initPos[0] + expl.offsetTranslation[0];
        child.position.y = initPos[1] + expl.offsetTranslation[1];
        child.position.z = initPos[2] + expl.offsetTranslation[2];
      } else if (behavior !== "rotate") {
        child.position.set(initPos[0], initPos[1], initPos[2]);
      }
    });
  }, [sceneGroup, frame, fps, phase]);

  return <primitive object={sceneGroup} />;
};

/**
 * Universal Kitabedah 3D X-Ray Hologram Scene (Section 3.5):
 * - Black #000000 background (bukan abu-abu #F2F2F2)
 * - ThreeCanvas with perspective camera & high precision WebGL
 * - CameraRig with spring interpolation and clamped zoom/explode
 * - Directional cyan & blue specular lights for transparent X-ray brilliance
 */
export const KitabedahScene: React.FC<KitabedahSceneProps> = ({
  blueprint,
  phase,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  style,
}) => {
  const cameraShot: ShotType =
    phase?.cameraDirection?.shotType || "MEDIUM";
  const zoomMultiplier = phase?.cameraDirection?.zoomMultiplier ?? 1.0;
  const explodeFactor = phase?.cameraDirection?.explodeFactor ?? 0.0;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "#000000",
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      <ThreeCanvas
        width={width}
        height={height}
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#000000",
        }}
      >
        {/* Cinematic Ambient & Directional Lights */}
        <ambientLight intensity={0.4} color="#004466" />
        <directionalLight
          position={[6, 12, 10]}
          intensity={1.2}
          color="#00D4FF"
        />
        <directionalLight
          position={[-8, -4, -6]}
          intensity={0.6}
          color="#FF6B35"
        />
        <pointLight position={[0, 4, 2]} intensity={0.8} color="#66E0FF" />

        {/* Dynamic Procedural Scene Graph */}
        <AnimatedSceneTree blueprint={blueprint} phase={phase} />

        {/* Spring Camera Rig */}
        <CameraRig
          shotType={cameraShot}
          zoomMultiplier={zoomMultiplier}
          explodeFactor={explodeFactor}
        />
      </ThreeCanvas>
    </div>
  );
};
