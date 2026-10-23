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

  // Pre-compute geometry data at component top level (rules of hooks: no useMemo inside switch)
  const lathePoints = useMemo(() => {
    const args = node.geometryArgs ?? {};
    if (args.lathePoints && args.lathePoints.length >= 2) {
      return args.lathePoints.map((p) => new THREE.Vector2(p[0], p[1]));
    }
    return [
      new THREE.Vector2(0.2, -1.2),
      new THREE.Vector2(0.9, -0.8),
      new THREE.Vector2(1.1, -0.2),
      new THREE.Vector2(1.15, 0.3),
      new THREE.Vector2(0.85, 0.8),
      new THREE.Vector2(0.45, 1.3),
    ];
  }, [node.geometryArgs]);

  const tubeCurvePoints = useMemo(() => {
    const args = node.geometryArgs ?? {};
    if (args.tubePath && args.tubePath.length >= 2) {
      return args.tubePath.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    }
    return [
      new THREE.Vector3(-1.0, -0.6, 0),
      new THREE.Vector3(-0.4, 0.0, 0.5),
      new THREE.Vector3(0.4, 0.5, -0.3),
      new THREE.Vector3(1.0, 1.0, 0),
    ];
  }, [node.geometryArgs]);

  const tubeCurve = useMemo(
    () => new THREE.CatmullRomCurve3(tubeCurvePoints),
    [tubeCurvePoints]
  );

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
      case "drone-assembly": {
        const bodyW = args.width ?? 1.1;
        const bodyH = args.height ?? 0.42;
        const bodyD = args.depth ?? 1.4;
        const armSpan = args.radiusTop ?? 1.35;
        const propRadius = args.bladeLength ?? 0.55;
        const propRot = (frame / fps) * 18.0;

        const armCoords: [number, number][] = [
          [armSpan, armSpan],
          [-armSpan, armSpan],
          [armSpan, -armSpan],
          [-armSpan, -armSpan],
        ];

        return (
          <group>
            {/* Streamlined Fuselage with 90° Cutaway Top */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[bodyW, bodyH, bodyD]} />
              <meshToonMaterial color={node.color || "#F8FAFC"} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Internal Battery Pack in Bay */}
            <mesh position={[0, bodyH * 0.1, -0.05]}>
              <boxGeometry args={[bodyW * 0.65, bodyH * 0.7, bodyD * 0.5]} />
              <meshStandardMaterial color="#38BDF8" roughness={0.3} metalness={0.1} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Internal Flight Controller PCB */}
            <mesh position={[0, bodyH * 0.28, 0.35]}>
              <boxGeometry args={[bodyW * 0.55, 0.05, bodyD * 0.25]} />
              <meshStandardMaterial color="#10B981" emissive="#059669" emissiveIntensity={0.3} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* 4 Carbon Arms & Motor Pods */}
            {armCoords.map(([ax, az], i) => {
              const armAngle = Math.atan2(az, ax);
              const armDist = Math.hypot(ax, az);
              return (
                <group key={i}>
                  {/* Diagonal Carbon Arm Strut */}
                  <mesh
                    position={[ax * 0.5, 0, az * 0.5]}
                    rotation={[0, -armAngle + Math.PI / 2, 0]}
                  >
                    <boxGeometry args={[0.08, 0.08, armDist]} />
                    <meshStandardMaterial color="#334155" roughness={0.5} metalness={0.6} />
                    {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
                  </mesh>

                  {/* Motor Pod Cylinder */}
                  <mesh position={[ax, bodyH * 0.15, az]}>
                    <cylinderGeometry args={[0.16, 0.16, 0.28, 24]} />
                    <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.2} />
                    {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
                  </mesh>

                  {/* Motor Copper Ring */}
                  <mesh position={[ax, bodyH * 0.24, az]}>
                    <torusGeometry args={[0.13, 0.03, 12, 24]} />
                    <meshStandardMaterial color="#F59E0B" metalness={0.9} roughness={0.2} />
                  </mesh>

                  {/* Horizontal Spinning 2-Blade Propeller */}
                  <group position={[ax, bodyH * 0.34, az]} rotation={[0, (i % 2 === 0 ? 1 : -1) * propRot + i, 0]}>
                    {/* Center Spinner Cap */}
                    <mesh position={[0, 0.02, 0]}>
                      <coneGeometry args={[0.07, 0.09, 16]} />
                      <meshStandardMaterial color="#0F172A" roughness={0.3} />
                    </mesh>
                    {/* 2 Aerodynamic Carbon Blades in Horizontal Plane */}
                    <mesh position={[propRadius * 0.5, 0, 0]} rotation={[0.18, 0, 0]}>
                      <boxGeometry args={[propRadius, 0.02, 0.11]} />
                      <meshStandardMaterial color="#0F172A" roughness={0.3} metalness={0.4} />
                      {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
                    </mesh>
                    <mesh position={[-propRadius * 0.5, 0, 0]} rotation={[-0.18, 0, 0]}>
                      <boxGeometry args={[propRadius, 0.02, 0.11]} />
                      <meshStandardMaterial color="#0F172A" roughness={0.3} metalness={0.4} />
                      {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
                    </mesh>
                  </group>
                </group>
              );
            })}
          </group>
        );
      }

      case "battery-assembly": {
        const bw = args.width ?? 2.2;
        const bh = args.height ?? 1.5;
        const bd = args.depth ?? 1.3;
        const cellCountX = 3;
        const cellCountZ = 2;
        const cellR = 0.22;
        const cellH = bh * 0.72;

        return (
          <group>
            {/* Cutaway Housing (Bottom & 3 side walls, front open) */}
            {/* Bottom Plate */}
            <mesh position={[0, -bh / 2 + 0.05, 0]}>
              <boxGeometry args={[bw, 0.1, bd]} />
              <meshToonMaterial color={node.color || "#E2E8F0"} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>
            {/* Back Wall */}
            <mesh position={[0, 0, -bd / 2 + 0.05]}>
              <boxGeometry args={[bw, bh, 0.1]} />
              <meshToonMaterial color={node.color || "#E2E8F0"} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>
            {/* Left Wall */}
            <mesh position={[-bw / 2 + 0.05, 0, 0]}>
              <boxGeometry args={[0.1, bh, bd]} />
              <meshToonMaterial color={node.color || "#E2E8F0"} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>
            {/* Right Wall */}
            <mesh position={[bw / 2 - 0.05, 0, 0]}>
              <boxGeometry args={[0.1, bh, bd]} />
              <meshToonMaterial color={node.color || "#E2E8F0"} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Array of Lithium Cells */}
            {Array.from({ length: cellCountX }).map((_, xi) => {
              const cx = (xi - (cellCountX - 1) / 2) * (bw * 0.28);
              return Array.from({ length: cellCountZ }).map((_, zi) => {
                const cz = (zi - (cellCountZ - 1) / 2) * (bd * 0.42);
                return (
                  <group key={`${xi}-${zi}`} position={[cx, -bh * 0.08, cz]}>
                    <mesh>
                      <cylinderGeometry args={[cellR, cellR, cellH, 32]} />
                      <meshStandardMaterial color="#38BDF8" metalness={0.3} roughness={0.2} />
                      {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
                    </mesh>
                    {/* Positive Button Pole */}
                    <mesh position={[0, cellH / 2 + 0.04, 0]}>
                      <cylinderGeometry args={[cellR * 0.45, cellR * 0.45, 0.08, 16]} />
                      <meshStandardMaterial color="#F59E0B" metalness={0.9} roughness={0.2} />
                    </mesh>
                  </group>
                );
              });
            })}

            {/* Copper Busbar Strips linking cell terminals */}
            <mesh position={[0, cellH / 2 - bh * 0.06, 0]}>
              <boxGeometry args={[bw * 0.72, 0.02, bd * 0.46]} />
              <meshStandardMaterial color="#F59E0B" metalness={0.85} roughness={0.25} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Top BMS Protection Circuit Board */}
            <mesh position={[0, bh * 0.42, 0]}>
              <boxGeometry args={[bw * 0.88, 0.06, bd * 0.85]} />
              <meshStandardMaterial color="#065F46" roughness={0.4} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Red Positive Terminal Post */}
            <mesh position={[-bw * 0.32, bh * 0.54, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.2, 16]} />
              <meshStandardMaterial color="#EF4444" roughness={0.3} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>
            {/* Black Negative Terminal Post */}
            <mesh position={[bw * 0.32, bh * 0.54, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.2, 16]} />
              <meshStandardMaterial color="#0F172A" roughness={0.3} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>
          </group>
        );
      }

      case "piston-assembly": {
        const cylR = args.radiusTop ?? 1.15;
        const cylH = args.height ?? 2.4;
        const stroke = 0.35;
        const pistonY = Math.sin((frame / fps) * 4.5) * stroke;

        return (
          <group>
            {/* Cutaway Cylinder Sleeve (270° cutaway) */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[cylR, cylR, cylH, 48, 1, true, 0, (270 * Math.PI) / 180]} />
              <meshToonMaterial color={node.color || "#94A3B8"} />
              {node.showEdgesOutline && <Edges threshold={22} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Reciprocating Piston Head */}
            <group position={[0, pistonY, 0]}>
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[cylR * 0.94, cylR * 0.94, 0.72, 36]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.75} roughness={0.25} />
                {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
              </mesh>
              {/* Piston Compression Rings */}
              <mesh position={[0, 0.22, 0]}>
                <torusGeometry args={[cylR * 0.95, 0.02, 12, 36]} />
                <meshStandardMaterial color="#0F172A" metalness={0.9} />
              </mesh>
              <mesh position={[0, 0.12, 0]}>
                <torusGeometry args={[cylR * 0.95, 0.02, 12, 36]} />
                <meshStandardMaterial color="#0F172A" metalness={0.9} />
              </mesh>

              {/* Connecting Rod Wrist Pin */}
              <mesh position={[0, -0.65, 0]} rotation={[0, 0, pistonY * 0.3]}>
                <cylinderGeometry args={[0.1, 0.1, 0.85, 16]} />
                <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.3} />
                {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
              </mesh>
            </group>

            {/* Cylinder Head Cap with Valve Stems */}
            <mesh position={[0, cylH / 2 + 0.12, 0]}>
              <cylinderGeometry args={[cylR * 1.08, cylR * 1.08, 0.24, 36]} />
              <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Copper Intake & Discharge Ports */}
            <mesh position={[cylR * 0.5, cylH / 2 + 0.28, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.35, 16]} />
              <meshStandardMaterial color="#F59E0B" metalness={0.9} roughness={0.2} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>
            <mesh position={[-cylR * 0.5, cylH / 2 + 0.28, 0]}>
              <cylinderGeometry args={[0.14, 0.14, 0.35, 16]} />
              <meshStandardMaterial color="#38BDF8" metalness={0.85} roughness={0.2} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>
          </group>
        );
      }

      case "turbine-assembly": {
        const nacelleR = args.radiusTop ?? 1.35;
        const nacelleL = args.height ?? 2.8;
        const fanRot = (frame / fps) * 12.0;

        return (
          <group rotation={[0, 0, Math.PI / 2]}>
            {/* Cutaway Nacelle Casing (270°) */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[nacelleR, nacelleR * 0.85, nacelleL, 48, 1, true, 0, (270 * Math.PI) / 180]} />
              <meshToonMaterial color={node.color || "#CBD5E1"} />
              {node.showEdgesOutline && <Edges threshold={22} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Rotating Drive Shaft */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.14, 0.14, nacelleL * 0.92, 24]} />
              <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Front Intake Fan with 12 Aerodynamic Blades */}
            <group position={[0, nacelleL * 0.42, 0]} rotation={[0, fanRot, 0]}>
              {/* Spinner Nose Cone */}
              <mesh position={[0, 0.15, 0]}>
                <coneGeometry args={[0.32, 0.45, 24]} />
                <meshStandardMaterial color="#1E293B" roughness={0.3} metalness={0.7} />
              </mesh>
              {Array.from({ length: 12 }).map((_, fi) => {
                const angle = (fi * 2 * Math.PI) / 12;
                return (
                  <mesh
                    key={fi}
                    position={[Math.cos(angle) * nacelleR * 0.55, 0, Math.sin(angle) * nacelleR * 0.55]}
                    rotation={[0.3, -angle, 0]}
                  >
                    <boxGeometry args={[nacelleR * 0.6, 0.03, 0.18]} />
                    <meshStandardMaterial color="#94A3B8" metalness={0.85} roughness={0.2} />
                    {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
                  </mesh>
                );
              })}
            </group>

            {/* Compressor Discs along Shaft */}
            {[-0.1, -0.4, -0.7].map((offsetY, idx) => (
              <mesh key={idx} position={[0, offsetY, 0]} rotation={[0, fanRot * (1 + idx * 0.2), 0]}>
                <cylinderGeometry args={[nacelleR * (0.65 - idx * 0.08), nacelleR * (0.65 - idx * 0.08), 0.1, 24]} />
                <meshStandardMaterial color="#FACC15" metalness={0.8} roughness={0.25} />
                {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
              </mesh>
            ))}
          </group>
        );
      }

      case "circuit-board": {
        const pw = args.width ?? 2.4;
        const pd = args.depth ?? 2.0;

        return (
          <group>
            {/* PCB Substrate Plate */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[pw, 0.08, pd]} />
              <meshStandardMaterial color="#064E3B" roughness={0.5} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Central Main Processor / CPU Die */}
            <mesh position={[0, 0.09, 0]}>
              <boxGeometry args={[0.78, 0.1, 0.78]} />
              <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} emissive="#0284C7" emissiveIntensity={0.25} />
              {node.showEdgesOutline && <Edges threshold={20} color="#38BDF8" scale={1.001} />}
            </mesh>
            {/* Processor Heat Spreader */}
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[0.55, 0.03, 0.55]} />
              <meshStandardMaterial color="#CBD5E1" metalness={0.9} roughness={0.15} />
            </mesh>

            {/* Memory / IC Chips */}
            {[-0.75, 0.75].map((xOffset, mi) => (
              <mesh key={mi} position={[xOffset, 0.08, 0.25]}>
                <boxGeometry args={[0.42, 0.07, 0.7]} />
                <meshStandardMaterial color="#0F172A" roughness={0.4} />
                {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
              </mesh>
            ))}

            {/* SMT Cylindrical Capacitors */}
            {[-0.6, -0.3, 0.3, 0.6].map((xOffset, ci) => (
              <mesh key={ci} position={[xOffset, 0.18, -0.65]}>
                <cylinderGeometry args={[0.1, 0.1, 0.26, 16]} />
                <meshStandardMaterial color="#3B82F6" metalness={0.7} roughness={0.25} />
                {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
              </mesh>
            ))}
          </group>
        );
      }

      case "solar-assembly": {
        const sw = args.width ?? 2.4;
        const sd = args.depth ?? 1.8;

        return (
          <group rotation={[-0.3, 0, 0]}>
            {/* Aluminum Outer Frame */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[sw, 0.1, sd]} />
              <meshStandardMaterial color="#64748B" metalness={0.85} roughness={0.2} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Dark Blue Silicon Wafer Panel */}
            <mesh position={[0, 0.06, 0]}>
              <boxGeometry args={[sw * 0.94, 0.02, sd * 0.94]} />
              <meshStandardMaterial color="#1E3A8A" roughness={0.15} metalness={0.4} />
              {node.showEdgesOutline && <Edges threshold={20} color="#38BDF8" scale={1.001} />}
            </mesh>

            {/* Silver Grid Lines / Busbars */}
            {[-0.6, 0, 0.6].map((gx, gi) => (
              <mesh key={gi} position={[gx, 0.075, 0]}>
                <boxGeometry args={[0.02, 0.01, sd * 0.9]} />
                <meshStandardMaterial color="#E2E8F0" metalness={0.9} roughness={0.1} />
              </mesh>
            ))}

            {/* Rear Junction Box */}
            <mesh position={[0, -0.12, 0]}>
              <boxGeometry args={[0.35, 0.14, 0.35]} />
              <meshStandardMaterial color="#0F172A" roughness={0.5} />
              {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
            </mesh>
          </group>
        );
      }

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
        const arcDeg = args.arcAngleDeg ?? (node.enableCutawayClip ? 270 : 360);
        const phiLen = (arcDeg * Math.PI) / 180;

        return (
          <mesh>
            <latheGeometry args={[lathePoints, 48, 0, phiLen]} />
            {renderMaterial()}
            {node.showEdgesOutline && (
              <Edges threshold={22} color="#1E293B" scale={1.001} />
            )}
          </mesh>
        );
      }

      case "hollow-box": {
        const w = args.width ?? 2.2;
        const h = args.height ?? 1.8;
        const d = args.depth ?? 1.8;
        const wall = Math.min(args.wallThickness ?? 0.1, 0.2);

        return (
          <group>
            {/* Bottom Plate */}
            <mesh position={[0, -h / 2 + wall / 2, 0]}>
              <boxGeometry args={[w, wall, d]} />
              {renderMaterial()}
              {node.showEdgesOutline && <Edges threshold={22} color="#1E293B" scale={1.001} />}
            </mesh>
            {/* Back Wall */}
            <mesh position={[0, 0, -d / 2 + wall / 2]}>
              <boxGeometry args={[w, h, wall]} />
              {renderMaterial()}
              {node.showEdgesOutline && <Edges threshold={22} color="#1E293B" scale={1.001} />}
            </mesh>
            {/* Left Wall */}
            <mesh position={[-w / 2 + wall / 2, 0, 0]}>
              <boxGeometry args={[wall, h, d]} />
              {renderMaterial()}
              {node.showEdgesOutline && <Edges threshold={22} color="#1E293B" scale={1.001} />}
            </mesh>
            {/* Right Wall */}
            <mesh position={[w / 2 - wall / 2, 0, 0]}>
              <boxGeometry args={[wall, h, d]} />
              {renderMaterial()}
              {node.showEdgesOutline && <Edges threshold={22} color="#1E293B" scale={1.001} />}
            </mesh>
          </group>
        );
      }

      case "radial-array": {
        const count = Math.max(2, Math.min(32, args.radialCount ?? 6));
        const radius = args.radiusTop ?? 1.2;
        const bladeW = args.bladeWidth ?? 0.24;
        const bladeL = args.bladeLength ?? radius * 0.75;
        const bladeH = args.height ?? 0.04;
        const isHorizontal = args.orientation !== "vertical";
        const pitch = (args.pitchDeg ?? 18) * (Math.PI / 180);

        return (
          <group>
            {/* Central Hub Cylinder */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[radius * 0.22, radius * 0.22, isHorizontal ? 0.16 : bladeH * 1.1, 24]} />
              {renderMaterial()}
              {node.showEdgesOutline && <Edges threshold={22} color="#1E293B" scale={1.001} />}
            </mesh>

            {/* Radiating Blades */}
            {Array.from({ length: count }).map((_, i) => {
              const angle = (i * 2 * Math.PI) / count;
              if (isHorizontal) {
                // Horizontal blades radiating outward from center in X-Z plane
                const midR = radius * 0.2 + bladeL * 0.5;
                const bx = Math.cos(angle) * midR;
                const bz = Math.sin(angle) * midR;
                return (
                  <mesh
                    key={i}
                    position={[bx, 0, bz]}
                    rotation={[pitch, -angle + Math.PI / 2, 0]}
                  >
                    <boxGeometry args={[bladeW, bladeH, bladeL]} />
                    {renderMaterial()}
                    {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
                  </mesh>
                );
              } else {
                // Vertical blades around cylindrical perimeter
                const x = Math.cos(angle) * radius;
                const z = Math.sin(angle) * radius;
                return (
                  <mesh key={i} position={[x, 0, z]} rotation={[0, -angle + Math.PI / 4, 0]}>
                    <boxGeometry args={[bladeW, bladeH, 0.08]} />
                    {renderMaterial()}
                    {node.showEdgesOutline && <Edges threshold={20} color="#1E293B" scale={1.001} />}
                  </mesh>
                );
              }
            })}
          </group>
        );
      }

      case "tube": {
        const tubeR = args.tubeRadius ?? 0.12;

        return (
          <mesh>
            <tubeGeometry args={[tubeCurve, 48, tubeR, 16, false]} />
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
