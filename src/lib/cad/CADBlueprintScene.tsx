import React, { useEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import * as THREE from "three";
import { SubAssemblySpec, CADHelpers } from "./types";

export interface CADBlueprintSceneProps {
  title: string;
  subtitle?: string;
  archetype: string;
  assemblies: SubAssemblySpec[];
  activeStationCode?: string;
}

export const CADBlueprintScene: React.FC<CADBlueprintSceneProps> = ({
  title,
  subtitle = "PROCEDURAL 3D CAD SYSTEM",
  archetype,
  assemblies,
  activeStationCode,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const mountRef = useRef<HTMLDivElement>(null);

  // 1. Deterministic Timeline Choreography (0 -> 1 normalized values)
  // Phase 1 (0% - 20%): Exterior establish (cutaway=0, explode=0)
  // Phase 2 (20% - 50%): Dynamic sectioning (cutaway: 0 -> 1)
  // Phase 3 (50% - 80%): Multi-axis exploded view (explode: 0 -> 1)
  // Phase 4 (80% - 100%): Reassembly & hero lock (explode: 1 -> 0.25, cutaway = 0.85)
  const cutawayProgress = interpolate(
    frame,
    [fps * 1.5, fps * 4.0],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const explodeProgress = interpolate(
    frame,
    [fps * 4.5, fps * 7.5, durationInFrames - fps * 2, durationInFrames - fps * 0.5],
    [0, 1, 1, 0.25],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Smooth cinematic camera orbit (constant distance, no zoom spikes)
  const cameraAzimuth = interpolate(
    frame,
    [0, durationInFrames],
    [Math.PI * 0.22, Math.PI * 0.65]
  );

  const cameraElevation = interpolate(
    frame,
    [0, durationInFrames * 0.5, durationInFrames],
    [0.35, 0.48, 0.32]
  );

  // Persistent Three.js engine references across frames
  const engineRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    clipPlane: THREE.Plane;
    assemblyNodes: Map<string, { group: THREE.Group; spec: SubAssemblySpec }>;
    particles: THREE.Points;
  } | null>(null);

  // 2. Initialize Scene & Procedural Assemblies Once per mount
  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true, // CRITICAL for Remotion headless video capture
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.localClippingEnabled = true;
    renderer.setClearColor(0x050b14, 1);

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    // Technical CAD Ground Grid & Axis Markers
    const grid = new THREE.GridHelper(28, 28, 0x00f0ff, 0x0f2942);
    grid.position.y = -4.2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    // High-contrast directional & ambient lighting for metallic CAD shaders
    scene.add(new THREE.AmbientLight(0x38bdf8, 0.75));
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(10, 16, 12);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x00f0ff, 0.8);
    dirLight2.position.set(-12, -8, -10);
    scene.add(dirLight2);

    // Hardware GPU Clipping Plane for Zero-Rebuild Cutaway
    const clipPlane = new THREE.Plane(
      new THREE.Vector3(0, -0.7, -0.7).normalize(),
      6.0
    );

    // Dual-Pass CAD Part Factory
    const createCADPart: CADHelpers["createCADPart"] = (geometry, opts = {}) => {
      const {
        fillColor = 0x0c2136,
        edgeColor = 0x00f0ff,
        opacity = 0.9,
        isShell = false,
        edgeThreshold = 18,
        clippingPlanes,
      } = opts;

      const partGroup = new THREE.Group();
      const planes = clippingPlanes || (isShell ? [clipPlane] : []);

      const mat = new THREE.MeshStandardMaterial({
        color: fillColor,
        transparent: isShell || opacity < 1,
        opacity: isShell ? 0.26 : opacity,
        depthWrite: !isShell,
        side: THREE.DoubleSide,
        roughness: 0.35,
        metalness: 0.65,
        clippingPlanes: planes,
      });

      const mesh = new THREE.Mesh(geometry, mat);
      partGroup.add(mesh);

      const edgesGeo = new THREE.EdgesGeometry(geometry, edgeThreshold);
      const lineMat = new THREE.LineBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: isShell ? 0.55 : 0.92,
        clippingPlanes: planes,
      });
      const lines = new THREE.LineSegments(edgesGeo, lineMat);
      partGroup.add(lines);

      return partGroup;
    };

    // Instantiate all topological sub-assemblies
    const assemblyNodes = new Map<string, { group: THREE.Group; spec: SubAssemblySpec }>();
    assemblies.forEach((spec) => {
      const group = new THREE.Group();
      group.position.set(...spec.basePosition);
      spec.buildGeometry(group, { createCADPart, clipPlane });
      scene.add(group);
      assemblyNodes.set(spec.id, { group, spec });
    });

    // Particle flow streamlines
    const pCount = 240;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const r = 0.4 + (i % 12) * 0.18;
      const theta = (i * 1.37) % (Math.PI * 2);
      pPos[i * 3] = Math.cos(theta) * r;
      pPos[i * 3 + 1] = Math.sin(theta) * r;
      pPos[i * 3 + 2] = -6 + (i / pCount) * 12;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 200);
    engineRef.current = {
      renderer,
      scene,
      camera,
      clipPlane,
      assemblyNodes,
      particles,
    };

    return () => {
      renderer.dispose();
    };
  }, [assemblies, width, height]);

  // 3. Deterministic Frame Evaluation (Runs synchronously per Remotion frame)
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;

    const { renderer, scene, camera, clipPlane, assemblyNodes, particles } = eng;

    // A. GPU Cutaway Sectioning: updates plane constant via Remotion interpolate
    clipPlane.constant = THREE.MathUtils.lerp(5.5, -1.2, cutawayProgress);

    // B. Multi-Axis Exploded View Offsets & Pure Frame Rotation
    assemblyNodes.forEach(({ group, spec }) => {
      const [bx, by, bz] = spec.basePosition;
      const [ex, ey, ez] = spec.explodeOffset;

      group.position.set(
        bx + ex * explodeProgress,
        by + ey * explodeProgress,
        bz + ez * explodeProgress
      );

      if (spec.rotationSpeed) {
        const axis = spec.rotationAxis || "z";
        group.rotation[axis] = frame * spec.rotationSpeed;
      }
    });

    // C. Deterministic Particle Streamline Advection
    const posAttr = particles.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const z = -6 + (((i / posAttr.count) * 12 + frame * 0.18) % 12);
      posAttr.setZ(i, z);
    }
    posAttr.needsUpdate = true;

    // D. Smooth Orbital Camera Tracking (Constant distance, zero-zoom jumps)
    const radius = 15.5;
    camera.position.set(
      radius * Math.sin(cameraAzimuth) * Math.cos(cameraElevation),
      radius * Math.sin(cameraElevation),
      radius * Math.cos(cameraAzimuth) * Math.cos(cameraElevation)
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // E. Render frame to canvas
    renderer.render(scene, camera);
  }, [frame, cutawayProgress, explodeProgress, cameraAzimuth, cameraElevation]);

  // Active stage telemetry highlight based on timeline progress or prop
  const activeStageIndex = Math.min(
    assemblies.length - 1,
    Math.floor((frame / Math.max(1, durationInFrames)) * assemblies.length)
  );
  const activeSpec =
    assemblies.find((a) => a.stationCode === activeStationCode) ||
    assemblies[activeStageIndex];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#050b14",
        color: "#e2e8f0",
        fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* CAD Blueprint Technical HUD Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 24,
          border: "1px solid rgba(0, 240, 255, 0.3)",
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 24,
        }}
      >
        {/* Top Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div
              style={{
                color: "#00f0ff",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              // CAD BLUEPRINT // ARCHETYPE: {archetype}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#ffffff",
                marginTop: 4,
                letterSpacing: "0.04em",
              }}
            >
              {title.toUpperCase()}
            </div>
            {subtitle && (
              <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
          <div
            style={{
              textAlign: "right",
              fontSize: 13,
              fontWeight: 600,
              color: "#38bdf8",
              lineHeight: 1.6,
            }}
          >
            <div>CUTAWAY SECTION: {Math.round(cutawayProgress * 100)}%</div>
            <div>EXPLODE VECTOR: {Math.round(explodeProgress * 100)}%</div>
            <div>FRAME SYNC: {String(frame).padStart(4, "0")}</div>
          </div>
        </div>

        {/* Bottom Active Sub-Assembly Readout */}
        {activeSpec && (
          <div
            style={{
              alignSelf: "flex-start",
              backgroundColor: "rgba(6, 16, 30, 0.88)",
              borderLeft: "4px solid #f59e0b",
              borderTop: "1px solid rgba(245, 158, 11, 0.3)",
              borderRight: "1px solid rgba(245, 158, 11, 0.3)",
              borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
              padding: "12px 20px",
              maxWidth: 580,
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                color: "#f59e0b",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.5,
              }}
            >
              STATION [{activeSpec.stationCode}] // {activeSpec.category.toUpperCase()}
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#ffffff",
                margin: "4px 0",
              }}
            >
              {activeSpec.label}
            </div>
            {activeSpec.metrics && (
              <div style={{ fontSize: 13, color: "#38bdf8" }}>
                {activeSpec.metrics}
              </div>
            )}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
