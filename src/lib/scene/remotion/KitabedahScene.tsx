import React, { useMemo } from "react";
import * as THREE from "three";
import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { VideoBlueprint, VideoBlueprintPhase } from "../types";
import { generateScene } from "../generator/sceneGenerator";
import { CameraRig, ShotType } from "./CameraRig";
import { SceneEnvironment } from "./SceneEnvironment";
import { calculateRotation } from "../behaviors/rotate";
import { VIDEO_WIDTH, VIDEO_HEIGHT } from "../../../remotion/constants";

export interface KitabedahSceneProps {
  blueprint: VideoBlueprint;
  phase?: VideoBlueprintPhase;
  /** Frame at which the current phase started (for deterministic springs). */
  phaseStartFrame?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

/**
 * Applies per-frame animation to the procedural scene.
 * Rules: rotate around the part's own centre (never scale), explode with
 * translate + spring only, honour the phase visibility list.
 */
function applyFrameState(
  sceneGroup: THREE.Group,
  frame: number,
  fps: number,
  phase?: VideoBlueprintPhase,
  phaseStartFrame = 0
): void {
  const activeIds = phase?.activeComponentIds;
  const filterVisibility = Array.isArray(activeIds) && activeIds.length > 0;
  const explodeFactor = clamp(phase?.cameraDirection?.explodeFactor ?? 0, 0, 1);
  const relFrame = Math.max(0, frame - phaseStartFrame);

  // One spring for the whole explosion, deterministic per phase.
  const explodeProgress = spring({
    frame: relFrame,
    fps,
    config: { damping: 16, mass: 0.9, stiffness: 85, overshootClamping: true },
  });

  sceneGroup.children.forEach((child) => {
    const data = (child as any).userData;
    if (!data) return;

    const { id, behavior, axis, initialPosition, initialRotation, explodeDirection, componentIndex } = data;

    child.visible =
      !filterVisibility || (id ? (activeIds as string[]).includes(id) : true);

    const initPos: [number, number, number] =
      Array.isArray(initialPosition) && initialPosition.length === 3
        ? ([initialPosition[0], initialPosition[1], initialPosition[2]] as [number, number, number])
        : [child.position.x, child.position.y, child.position.z];
    const initRot: [number, number, number] =
      Array.isArray(initialRotation) && initialRotation.length === 3
        ? ([initialRotation[0], initialRotation[1], initialRotation[2]] as [number, number, number])
        : [child.rotation.x, child.rotation.y, child.rotation.z];

    // 1. Rotate — local axis only, around the mesh centre. No scale.
    if (behavior === "rotate") {
      const rot = calculateRotation({
        frame,
        fps,
        axis: axis || "z",
        speed: data.geometryType === "fan" ? 1.4 : 0.7,
      });
      if (rot.axis === "x") child.rotation.x = initRot[0] + rot.rotationRadians;
      else if (rot.axis === "y") child.rotation.y = initRot[1] + rot.rotationRadians;
      else child.rotation.z = initRot[2] + rot.rotationRadians;
    } else {
      child.rotation.set(initRot[0], initRot[1], initRot[2]);
    }

    // 2. Explode — translate along the part's own axis with spring. No scale.
    const rawDir = Array.isArray(explodeDirection) ? explodeDirection : [0, 1, 0];
    const dir = new THREE.Vector3(rawDir[0], rawDir[1], rawDir[2]);
    if (dir.lengthSq() === 0) dir.set(0, 1, 0);
    dir.normalize();

    const stagger = 1 + ((componentIndex ?? 0) % 6) * 0.16;
    const distance = explodeFactor * 0.85 * stagger * explodeProgress;

    child.position.set(
      initPos[0] + dir.x * distance,
      initPos[1] + dir.y * distance,
      initPos[2] + dir.z * distance
    );
  });
}

const AnimatedSceneTree: React.FC<{
  sceneGroup: THREE.Group;
  phase?: VideoBlueprintPhase;
  phaseStartFrame: number;
}> = ({ sceneGroup, phase, phaseStartFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  applyFrameState(sceneGroup, frame, fps, phase, phaseStartFrame);

  return <primitive object={sceneGroup} />;
};

/**
 * Universal Kitabedah 3D X-Ray Hologram Scene:
 * - Pure black #000000 background (never grey #F2F2F2)
 * - Transparent x-ray materials with wireframe overlays
 * - CameraRig auto-fits the subject, clamped zoom / explode, spring settle
 * - Cyan key light + orange rim light for the hologram look
 */
export const KitabedahScene: React.FC<KitabedahSceneProps> = ({
  blueprint,
  phase,
  phaseStartFrame = 0,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
  style,
}) => {
  const cameraShot: ShotType = (phase?.cameraDirection?.shotType || "MEDIUM") as ShotType;
  const zoomMultiplier = clamp(phase?.cameraDirection?.zoomMultiplier ?? 1.0, 1.0, 2.4);
  const explodeFactor = clamp(phase?.cameraDirection?.explodeFactor ?? 0.0, 0.0, 1.0);

  // Build the scene once per blueprint.
  const sceneGroup = useMemo(() => generateScene(blueprint), [blueprint]);

  // A box per component, measured once, so each phase can frame exactly what
  // it shows (a hidden laptop lid must not push the base to the bottom).
  const componentBoxes = useMemo(() => {
    sceneGroup.updateMatrixWorld(true);
    const map = new Map<
      string,
      {
        box: THREE.Box3;
        kind: string;
        explodeDirection: [number, number, number];
        componentIndex: number;
      }
    >();
    sceneGroup.children.forEach((child) => {
      const data = (child as any).userData || {};
      if (!data.id) return;
      const box = new THREE.Box3().setFromObject(child);
      if (box.isEmpty()) return;
      const rawDir = Array.isArray(data.explodeDirection)
        ? data.explodeDirection
        : [0, 1, 0];
      map.set(data.id, {
        box,
        kind: data.kind || "component",
        explodeDirection: [rawDir[0] ?? 0, rawDir[1] ?? 0, rawDir[2] ?? 0],
        componentIndex: data.componentIndex ?? 0,
      });
    });
    return map;
  }, [sceneGroup]);

  // Frame the parts visible in this phase; terrain is environment, never subject.
  const bounds = useMemo(() => {
    const activeIds =
      Array.isArray(phase?.activeComponentIds) && phase!.activeComponentIds!.length > 0
        ? phase!.activeComponentIds!
        : null;

    const subject = new THREE.Box3();
    // Frame both the rest pose and the fully exploded pose: an exploded part
    // must never slide out of frame, which is what clipped the compressor.
    const consider = (box: THREE.Box3, kind: string, offset?: THREE.Vector3) => {
      if (kind === "terrain") return;
      subject.union(box);
      if (offset) subject.union(box.clone().translate(offset));
    };

    const offsetFor = (entry: {
      explodeDirection: [number, number, number];
      componentIndex: number;
    }) => {
      if (explodeFactor <= 0) return undefined;
      const dir = new THREE.Vector3(...entry.explodeDirection);
      if (dir.lengthSq() === 0) dir.set(0, 1, 0);
      dir.normalize();
      const stagger = 1 + (entry.componentIndex % 6) * 0.22;
      return dir.multiplyScalar(explodeFactor * 1.15 * stagger);
    };

    if (activeIds) {
      activeIds.forEach((id) => {
        const entry = componentBoxes.get(id);
        if (entry) consider(entry.box, entry.kind, offsetFor(entry));
      });
    }
    if (subject.isEmpty()) {
      componentBoxes.forEach((entry) =>
        consider(entry.box, entry.kind, offsetFor(entry))
      );
    }

    const box = subject.isEmpty() ? new THREE.Box3().setFromObject(sceneGroup) : subject;
    if (box.isEmpty()) {
      return {
        center: [0, 0, 0] as [number, number, number],
        radius: 4,
        size: [8, 8, 8] as [number, number, number],
      };
    }
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const size = box.getSize(new THREE.Vector3());
    return {
      center: [sphere.center.x, sphere.center.y, sphere.center.z] as [number, number, number],
      radius: Math.max(1, sphere.radius),
      size: [size.x, size.y, size.z] as [number, number, number],
    };
  }, [componentBoxes, explodeFactor, sceneGroup, phase]);

  const focusPosition = useMemo<[number, number, number] | undefined>(() => {
    const focusIds = phase?.cameraDirection?.focusComponentIds || [];
    const ids = focusIds.length ? focusIds : [];
    const targets = (blueprint.components || []).filter((component) =>
      ids.includes(component.id)
    );
    if (!targets.length) return undefined;

    const sum = targets.reduce(
      (acc, component) => {
        const pos = component.position3D || component.position || [0, 0, 0];
        return [acc[0] + pos[0], acc[1] + pos[1], acc[2] + pos[2]];
      },
      [0, 0, 0]
    );
    return [sum[0] / targets.length, sum[1] / targets.length, sum[2] / targets.length];
  }, [blueprint.components, phase]);

  // Frame the focused part, not the whole machine: a close-up on a fan wheel
  // should fill the frame instead of showing a pinhead in the middle.
  const focus = useMemo<{ radius: number; size: [number, number, number] } | undefined>(() => {
    const ids = phase?.cameraDirection?.focusComponentIds || [];
    if (!ids.length) return undefined;
    const targets = sceneGroup.children.filter((child) =>
      ids.includes((child as any).userData?.id)
    );
    if (!targets.length) return undefined;

    const box = new THREE.Box3();
    targets.forEach((child) => box.union(new THREE.Box3().setFromObject(child)));
    if (box.isEmpty()) return undefined;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const size = box.getSize(new THREE.Vector3());
    return {
      radius: Math.max(0.5, sphere.radius),
      size: [size.x, size.y, size.z] as [number, number, number],
    };
  }, [sceneGroup, phase]);

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
        style={{ width: "100%", height: "100%", backgroundColor: "#000000" }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={["#000000"]} />
        <SceneEnvironment />

        <ambientLight intensity={0.55} color="#0a3a55" />
        <directionalLight position={[6, 10, 8]} intensity={1.6} color="#00D4FF" />
        <directionalLight position={[-7, 4, -6]} intensity={0.9} color="#FF6B35" />
        <pointLight position={[0, 0, 6]} intensity={1.1} color="#66E0FF" />

        <AnimatedSceneTree
          sceneGroup={sceneGroup}
          phase={phase}
          phaseStartFrame={phaseStartFrame}
        />

        <CameraRig
          shotType={cameraShot}
          zoomMultiplier={zoomMultiplier}
          explodeFactor={explodeFactor}
          focusPosition3D={focusPosition}
          frameCenter={bounds.center}
          frameRadius={bounds.radius}
          frameSize={bounds.size}
          focusRadius={focus?.radius}
          focusSize={focus?.size}
          phaseStartFrame={phaseStartFrame}
        />
      </ThreeCanvas>
    </div>
  );
};
