"use client";

import React, { useMemo, Suspense, useEffect } from "react";
import * as THREE from "three";
import { useGLTF, Edges } from "@react-three/drei";
import { useCurrentFrame, useVideoConfig, delayRender, continueRender } from "remotion";
import type { ThreeNode } from "@/schemas/video-blueprint";

const CUTAWAY_CLIP_PLANE = new THREE.Plane(
  new THREE.Vector3(-1, 0, -1).normalize(),
  0.2
);

function GltfModel({ node, assetUrl }: { node: ThreeNode; assetUrl: string }) {
  const gltf = useGLTF(assetUrl);
  const cloned = useMemo(() => {
    const scene = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const targetDim = 3.5;
    const scaleFactor = targetDim / maxDim;

    scene.position.sub(center.clone().multiplyScalar(scaleFactor));
    scene.scale.multiplyScalar(scaleFactor);

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (node.enableCutawayClip) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => {
              m.clippingPlanes = [CUTAWAY_CLIP_PLANE];
              m.clipShadows = true;
            });
          } else if (mesh.material) {
            mesh.material.clippingPlanes = [CUTAWAY_CLIP_PLANE];
            mesh.material.clipShadows = true;
          }
        }
      }
    });

    return scene;
  }, [gltf, node.enableCutawayClip]);

  return <primitive object={cloned} />;
}

function SuspendedGltf({ node, assetUrl }: { node: ThreeNode; assetUrl: string }) {
  useEffect(() => {
    const handle = delayRender(`Loading 3D asset ${assetUrl}`);
    useGLTF.preload(assetUrl);
    const timer = setTimeout(() => {
      continueRender(handle);
    }, 150);
    return () => {
      clearTimeout(timer);
      continueRender(handle);
    };
  }, [assetUrl]);

  return (
    <Suspense fallback={null}>
      <GltfModel node={node} assetUrl={assetUrl} />
    </Suspense>
  );
}

interface ThreeAssetNodeProps {
  node: ThreeNode;
  currentPhaseIndex?: number;
}

export const ThreeAssetNode: React.FC<ThreeAssetNodeProps> = ({
  node,
  currentPhaseIndex = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation calculation
  const anim = node.animation;
  const isAnimActive =
    anim &&
    anim.type !== "none" &&
    (!anim.activeInPhases || anim.activeInPhases.includes(currentPhaseIndex));

  const animOffset = useMemo(() => {
    const res = {
      pos: [0, 0, 0] as [number, number, number],
      rot: [0, 0, 0] as [number, number, number],
      scale: 1,
    };
    if (!isAnimActive) return res;

    const t = (frame / fps) * anim.speed;
    const axisIdx = anim.axis === "x" ? 0 : anim.axis === "z" ? 2 : 1;

    switch (anim.type) {
      case "rotate":
        res.rot[axisIdx] = t * Math.PI * 0.9;
        break;
      case "oscillate-position":
        res.pos[axisIdx] = Math.sin(t * 3.5) * anim.amplitude;
        break;
      case "pulse-scale":
        res.scale = 1 + Math.sin(t * 4.0) * anim.amplitude * 0.15;
        break;
      case "explode":
        res.pos[axisIdx] = Math.sin(t * 2.0) * anim.amplitude;
        break;
      case "fluid-level":
        res.pos[1] = Math.sin(t * 2.5) * anim.amplitude * 0.35;
        break;
      default:
        break;
    }
    return res;
  }, [anim, isAnimActive, frame, fps]);

  const finalPos: [number, number, number] = [
    node.position[0] + animOffset.pos[0],
    node.position[1] + animOffset.pos[1],
    node.position[2] + animOffset.pos[2],
  ];

  const finalRot: [number, number, number] = [
    node.rotation[0] + animOffset.rot[0],
    node.rotation[1] + animOffset.rot[1],
    node.rotation[2] + animOffset.rot[2],
  ];

  const finalScale: [number, number, number] = [
    node.scale[0] * animOffset.scale,
    node.scale[1] * animOffset.scale,
    node.scale[2] * animOffset.scale,
  ];

  // Material render helper
  const renderMaterial = () => {
    const clippingPlanes = node.enableCutawayClip ? [CUTAWAY_CLIP_PLANE] : undefined;
    const opacity = node.opacity ?? 1;
    const transparent = opacity < 1 || node.materialType === "glass-translucent";

    switch (node.materialType) {
      case "toon":
        return (
          <meshToonMaterial
            color={node.color}
            transparent={transparent}
            opacity={opacity}
            clippingPlanes={clippingPlanes}
            clipShadows
          />
        );
      case "metallic":
        return (
          <meshStandardMaterial
            color={node.color}
            metalness={0.85}
            roughness={0.2}
            transparent={transparent}
            opacity={opacity}
            clippingPlanes={clippingPlanes}
            clipShadows
          />
        );
      case "glass-translucent":
        return (
          <meshStandardMaterial
            color={node.color}
            roughness={0.15}
            metalness={0.1}
            transparent
            opacity={Math.min(opacity, 0.42)}
            clippingPlanes={clippingPlanes}
            clipShadows
          />
        );
      case "emissive-glow":
        return (
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={0.65}
            roughness={0.35}
            clippingPlanes={clippingPlanes}
            clipShadows
          />
        );
      case "liquid":
        return (
          <meshStandardMaterial
            color={node.color}
            roughness={0.08}
            metalness={0.25}
            transparent
            opacity={0.8}
            clippingPlanes={clippingPlanes}
            clipShadows
          />
        );
      case "standard-matte":
      default:
        return (
          <meshStandardMaterial
            color={node.color}
            roughness={0.65}
            metalness={0.08}
            transparent={transparent}
            opacity={opacity}
            clippingPlanes={clippingPlanes}
            clipShadows
          />
        );
    }
  };

  // Geometry render
  const renderGeometry = () => {
    const args = node.geometryArgs ?? {};

    switch (node.geometryType) {
      case "gltf-asset": {
        if (!node.assetUrl) return null;
        return <SuspendedGltf node={node} assetUrl={node.assetUrl} />;
      }

      case "hollow-cylinder": {
        const rTop = args.radiusTop ?? 1.2;
        const rBottom = args.radiusBottom ?? 1.2;
        const h = args.height ?? 2.4;
        const wall = Math.min(args.wallThickness ?? 0.18, rTop * 0.5);
        const arcDeg = args.arcAngleDeg ?? 270;
        const thetaLen = (arcDeg * Math.PI) / 180;
        const innerRTop = rTop - wall;
        const innerRBottom = rBottom - wall;

        return (
          <group>
            {/* Outer Wall */}
            <mesh>
              <cylinderGeometry args={[rTop, rBottom, h, 48, 1, true, 0, thetaLen]} />
              {renderMaterial()}
              {node.showEdgesOutline && (
                <Edges threshold={22} color="#1E293B" scale={1.001} />
              )}
            </mesh>
            {/* Inner Wall */}
            <mesh>
              <cylinderGeometry
                args={[innerRTop, innerRBottom, h, 48, 1, true, 0, thetaLen]}
              />
              {renderMaterial()}
              {node.showEdgesOutline && (
                <Edges threshold={22} color="#1E293B" scale={1.001} />
              )}
            </mesh>
            {/* Top Annular Ring */}
            <mesh position={[0, h / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[innerRTop, rTop, 48, 1, 0, thetaLen]} />
              {renderMaterial()}
              {node.showEdgesOutline && (
                <Edges threshold={22} color="#1E293B" scale={1.001} />
              )}
            </mesh>
            {/* Bottom Annular Ring */}
            <mesh position={[0, -h / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[innerRBottom, rBottom, 48, 1, 0, thetaLen]} />
              {renderMaterial()}
              {node.showEdgesOutline && (
                <Edges threshold={22} color="#1E293B" scale={1.001} />
              )}
            </mesh>
            {/* Cutaway Cap at angle 0 */}
            <mesh position={[(innerRTop + rTop) / 2, 0, 0]}>
              <boxGeometry args={[wall, h, 0.02]} />
              {renderMaterial()}
              {node.showEdgesOutline && (
                <Edges threshold={22} color="#1E293B" scale={1.001} />
              )}
            </mesh>
            {/* Cutaway Cap at angle thetaLen */}
            {arcDeg < 360 && (
              <mesh
                position={[
                  Math.cos(thetaLen) * ((innerRTop + rTop) / 2),
                  0,
                  Math.sin(thetaLen) * ((innerRTop + rTop) / 2),
                ]}
                rotation={[0, -thetaLen, 0]}
              >
                <boxGeometry args={[wall, h, 0.02]} />
                {renderMaterial()}
                {node.showEdgesOutline && (
                  <Edges threshold={22} color="#1E293B" scale={1.001} />
                )}
              </mesh>
            )}
          </group>
        );
      }

      case "lathe": {
        const points = useMemo(() => {
          if (args.lathePoints && args.lathePoints.length >= 2) {
            return args.lathePoints.map((p) => new THREE.Vector2(p[0], p[1]));
          }
          // Default smooth organic contour
          return [
            new THREE.Vector2(0.2, -1.2),
            new THREE.Vector2(0.9, -0.8),
            new THREE.Vector2(1.1, -0.2),
            new THREE.Vector2(1.15, 0.3),
            new THREE.Vector2(0.85, 0.8),
            new THREE.Vector2(0.45, 1.3),
          ];
        }, [args.lathePoints]);

        const arcDeg = args.arcAngleDeg ?? (node.enableCutawayClip ? 270 : 360);
        const phiLen = (arcDeg * Math.PI) / 180;

        return (
          <mesh>
            <latheGeometry args={[points, 48, 0, phiLen]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "hollow-box": {
        const w = args.width ?? 2.2;
        const h = args.height ?? 2.2;
        const d = args.depth ?? 2.2;

        return (
          <mesh>
            <boxGeometry args={[w, h, d]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "radial-array": {
        const count = Math.max(3, Math.min(24, args.radialCount ?? 8));
        const radius = args.radiusTop ?? 1.2;
        const bladeW = 0.25;
        const bladeH = args.height ?? 1.0;
        const bladeD = 0.08;

        return (
          <group>
            {Array.from({ length: count }).map((_, i) => {
              const angle = (i * 2 * Math.PI) / count;
              const x = Math.cos(angle) * radius;
              const z = Math.sin(angle) * radius;
              return (
                <mesh key={i} position={[x, 0, z]} rotation={[0, -angle + Math.PI / 4, 0]}>
                  <boxGeometry args={[bladeW, bladeH, bladeD]} />
                  {renderMaterial()}
                  {node.showEdgesOutline && (
                    <Edges threshold={22} color="#1E293B" scale={1.001} />
                  )}
                </mesh>
              );
            })}
          </group>
        );
      }

      case "tube": {
        const curvePoints = useMemo(() => {
          if (args.tubePath && args.tubePath.length >= 2) {
            return args.tubePath.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
          }
          return [
            new THREE.Vector3(-1.0, -0.6, 0),
            new THREE.Vector3(-0.4, 0.0, 0.5),
            new THREE.Vector3(0.4, 0.5, -0.3),
            new THREE.Vector3(1.0, 1.0, 0),
          ];
        }, [args.tubePath]);

        const curve = useMemo(() => new THREE.CatmullRomCurve3(curvePoints), [curvePoints]);
        const tubeR = args.tubeRadius ?? 0.12;

        return (
          <mesh>
            <tubeGeometry args={[curve, 48, tubeR, 16, false]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "cylinder": {
        const rTop = args.radiusTop ?? 1.0;
        const rBottom = args.radiusBottom ?? 1.0;
        const h = args.height ?? 2.0;
        const arcDeg = args.arcAngleDeg ?? 360;
        const thetaLen = (arcDeg * Math.PI) / 180;

        return (
          <mesh>
            <cylinderGeometry args={[rTop, rBottom, h, 48, 1, false, 0, thetaLen]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "sphere": {
        const r = args.radiusTop ?? 1.1;
        const arcDeg = args.arcAngleDeg ?? 360;
        const phiLen = (arcDeg * Math.PI) / 180;

        return (
          <mesh>
            <sphereGeometry args={[r, 48, 32, 0, phiLen]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "box": {
        const w = args.width ?? 2.0;
        const h = args.height ?? 1.5;
        const d = args.depth ?? 1.5;

        return (
          <mesh>
            <boxGeometry args={[w, h, d]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "torus": {
        const r = args.radiusTop ?? 1.2;
        const tubeR = args.tubeRadius ?? 0.22;
        const arcDeg = args.arcAngleDeg ?? 360;
        const arc = (arcDeg * Math.PI) / 180;

        return (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, tubeR, 24, 48, arc]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "cone": {
        const r = args.radiusTop ?? 1.0;
        const h = args.height ?? 2.0;

        return (
          <mesh>
            <coneGeometry args={[r, h, 48]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "capsule": {
        const r = args.radiusTop ?? 0.75;
        const h = args.height ?? 1.6;

        return (
          <mesh>
            <capsuleGeometry args={[r, h, 16, 32]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      default:
        return (
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
    }
  };

  return (
    <group position={finalPos} rotation={finalRot} scale={finalScale}>
      {renderGeometry()}
    </group>
  );
};
