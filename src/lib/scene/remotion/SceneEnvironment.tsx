import React, { useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

/**
 * A tiny PMREM environment for the x-ray glass.
 *
 * MeshPhysicalMaterial with `transmission` needs an environment to refract and
 * reflect. Three's RoomEnvironment is grey and washes the hologram out, so we
 * build our own: cyan above, deep blue at the horizon, black below. Highlights
 * stay on brand and the background stays pure black.
 */
export const SceneEnvironment: React.FC = () => {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const envScene = new THREE.Scene();
    const sphereGeo = new THREE.SphereGeometry(10, 48, 24);
    const sphereMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x0b7fa8) },
        uHorizon: { value: new THREE.Color(0x03202e) },
        uBottom: { value: new THREE.Color(0x000000) },
        uGlow: { value: new THREE.Color(0x00d4ff) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uBottom;
        uniform vec3 uGlow;
        void main() {
          float h = vDir.y * 0.5 + 0.5;
          vec3 col = mix(uBottom, uHorizon, smoothstep(0.0, 0.52, h));
          col = mix(col, uTop, smoothstep(0.52, 1.0, h));
          // A soft overhead band gives glass a readable specular streak.
          float band = smoothstep(0.72, 0.98, h) * (1.0 - smoothstep(0.985, 1.0, h));
          col += uGlow * band * 0.55;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    envScene.add(sphere);

    const pmrem = new THREE.PMREMGenerator(gl);
    const envRT = pmrem.fromScene(envScene, 0.02);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 1.0;

    return () => {
      scene.environment = null;
      envRT.dispose();
      pmrem.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
    };
  }, [gl, scene]);

  return null;
};
